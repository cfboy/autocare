const Stripe = require('../connect/stripe')
const CarService = require('../collections/cars')
const UserService = require('../collections/user')
const SubscriptionService = require('../collections/subscription')
const UtilizationService = require('../collections/utilization')

const { ROLES } = require('../collections/user/user.model')
const alertTypes = require('../helpers/alertTypes')
const moment = require('moment');
const { completeDateFormat } = require('../helpers/formats')
const sendEmail = require("../utils/email/sendEmail");

const bcrypt = require('bcrypt');

/**
 * This function is a helper for agroup a list per key.
 * @param {*} list 
 * @param {*} key 
 * @param {*} {omitKey} 
 * @returns list //use Object.values/keys/entries to manage their content.
 */
const groupByKey = (list, key, { omitKey = false }) =>
    list.reduce((hash, { [key]: value, ...rest }) => (
        { ...hash, [value]: (hash[value] || []).concat(omitKey ? { ...rest } : { [key]: value, ...rest }) }), {}
    )


/**
 * This function handle all Stripe events.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.webhook = async (req, res) => {
    // TODO: implement all necessary webhooks
    let event
    const lingua = req.res.lingua.content

    try {
        event = Stripe.createWebhook(req.body, req.header('Stripe-Signature'))
    } catch (err) {
        console.log(err)
        return res.sendStatus(400)
    }
    try {
        const data = event.data.object
        let customer, notification, subscription, items, subscriptionItems, alertInfo
        console.log(`WEBHOOK: Event: ${event.type}`)
        switch (event.type) {
            case 'customer.created':
                console.debug(JSON.stringify(data))

                let hashPassword = await bcrypt.hash('Test1234', 10)
                let firstName = data?.name?.split(' ')[0] ? data.name.split(' ')[0] : 'Test Name',
                    lastName = data?.name?.split(' ')[1] ? data.name.split(' ')[1] : 'Test Last Name',
                    phoneNumber = data?.phone ? data.phone : '787-777-7777',
                    email = data?.email ? data.email : 'test@test.com'


                let user = await UserService.addUser({
                    email: email,
                    password: hashPassword,
                    billingID: data.id,
                    role: ROLES.CUSTOMER,
                    firstName: firstName,
                    lastName: lastName,
                    phoneNumber: phoneNumber,
                    dateOfBirth: null,
                    city: data?.address ? data?.address?.city : null
                })

                console.debug(`Customer created: ${user.email}`)

                break
            // case 'customer.deleted':
            //     break
            // case 'customer.updated':
            //     break
            // case 'invoice.paid':
            //     break
            case 'customer.subscription.created':
                // console.debug(`WEBHOOK: customer.subscription.created: ${data.id}`)
                console.log(`WEBHOOK: Subscription: ${data.id}`)

                subscription = data
                if (subscription.status == 'active') {
                    customer = await UserService.getUserByBillingID(subscription.customer)
                    if (customer) {
                        subscription = await SubscriptionService.getSubscriptionById(subscription.id);

                        if (!subscription) {
                            // Find subcription again for expand product information
                            subscription = await Stripe.getSubscriptionById(data.id)
                            subscriptionItems = subscription.items.data
                            let cars = []
                            if (subscription?.metadata?.cars)
                                cars = JSON.parse(subscription?.metadata?.cars)

                            let items = []
                            for (subItem of subscriptionItems) {
                                let newItem = { id: subItem.id, cars: [], data: subItem }
                                if (cars.length > 0) {
                                    for (carObj of cars) {
                                        if (subItem.price.id === carObj.priceID) {
                                            let newCar = await CarService.addCar(carObj.brand, carObj.model, carObj.plate, customer.id)
                                            newItem.cars.push(newCar)
                                        }

                                    }
                                }
                                items.push(newItem)

                            }

                            console.debug(`WEBHOOK: Items to add ${items.length}`)

                            alertInfo = { message: `Your membership ${subscription.id} has been created successfully.`, alertType: alertTypes.BasicAlert }

                            subscription = await SubscriptionService.addSubscription({ id: subscription.id, items: items, data: subscription, user: customer });
                        }

                        [customer, notification] = await UserService.addNotification(customer.id, alertInfo.message);

                        req.io.emit('notifications', notification);

                        //Send Email
                        var resultEmail = await sendEmail(
                            customer.email,
                            lingua.email.title,
                            {
                                name: customer?.personalInfo?.firstName + ' ' + customer?.personalInfo?.lastName,
                                message: alertInfo.message
                            },
                            "../template/subscriptions.handlebars"
                        )

                        if (resultEmail) {
                            console.debug('Email Sent: ' + resultEmail?.accepted[0])

                        } else {

                            console.debug('WARNING: Email Not Sent.')
                        }


                    } else {
                        console.log('customer.subscription.created: Not Found Customer.')
                    }
                } else {
                    console.debug('WEBHOOK: SUBSCRIPTION STATUS NOT ACTIVE. HANDLE ON UPDATE.')
                }
                break;
            case 'customer.subscription.updated':
                console.log(`WEBHOOK: Subscription: ${data.id}`)
                subscription = data
                customer = await UserService.getUserByBillingID(subscription.customer)
                if (customer) {
                    subscription = await Stripe.getSubscriptionById(subscription.id) //TODO: maybe not nescessary
                    subscriptionItems = subscription.items.data
                    let mySubscription = await SubscriptionService.getSubscriptionById(subscription.id)
                    if (mySubscription) {
                        // ------------------- Handle utilization ------------------------------------------------------
                        // Verify if the period is changed.
                        if (subscription.current_period_start !== mySubscription.data.current_period_start || subscription.current_period_end !== mySubscription.data.current_period_end) {
                            console.debug('stripeController --> The period is different.')
                            let cars = await SubscriptionService.getSubscriptionCarsById(subscription.id)

                            if (cars) {
                                for (car of cars) {
                                    // Add old utilization / History
                                    await UtilizationService.addUtilization(car,
                                        car.utilization.start_date,
                                        car.utilization.end_date,
                                        car.utilization.services,
                                        car.utilization.percentage)
                                }
                                // Calculate the new dates.
                                // Get the dates from new invoice. 
                                let newStartDate = new Date(subscription.current_period_start * 1000)
                                let newEndDate = new Date(subscription.current_period_end * 1000)

                                // Reset current utilization on car model.
                                await CarService.updateCars(cars?.map(({ id }) => (id)), {
                                    'utilization.start_date': newStartDate,
                                    'utilization.end_date': newEndDate,
                                    'utilization.services': 0,
                                    'utilization.percentage': 0
                                })
                            }
                        }
                        // -------------------------------------------------------------------------------------

                        items = []
                        for (subItem of subscriptionItems) {
                            let itemToUpdate = mySubscription?.items?.find(item => item.id == subItem.id)
                            if (itemToUpdate) {
                                let newItem = { id: itemToUpdate.id, cars: itemToUpdate.cars, data: subItem }
                                items.push(newItem)

                                try {
                                    if (newItem?.cars?.length == newItem.data.quantity) {
                                        for (car of newItem.cars) {
                                            if (car.cancel_date !== null)
                                                await CarService.updateCar(car.id, { cancel_date: null })
                                        }
                                    }
                                } catch (e) {
                                    console.log(e)
                                    console.log('Error trying to clear cancel_date of subscription: ' + mySubscription.id)
                                }
                            }
                        }

                        updates = {
                            data: subscription,
                            items: items
                        }


                        subscription = await SubscriptionService.updateSubscription(subscription.id, updates);

                        alertInfo = { message: `Your membership ${subscription.id} has been updated successfully. `, alertType: alertTypes.BasicAlert }

                        // Send customer balance on email.
                        let { totalString } = await Stripe.getCustomerBalanceTransactions(customer.billingID)
                        if (totalString)
                            alertInfo.message += `Your current balance on your account is ${totalString}.`

                    } else {
                        // Create Subs
                        let cars = JSON.parse(subscription.metadata.cars)
                        let subscriptionItems = subscription.items.data
                        let items = []
                        for (subItem of subscriptionItems) {
                            let newItem = { id: subItem.id, cars: [], data: subItem }
                            for (carObj of cars) {
                                if (subItem.price.id === carObj.priceID) {
                                    let newCar = await CarService.getCarByPlate(carObj.plate)
                                    if (!newCar)
                                        newCar = await CarService.addCar(carObj.brand, carObj.model, carObj.plate, customer.id)

                                    newItem.cars.push(newCar)
                                }

                            }
                            items.push(newItem)
                        }
                        newSubscription = await SubscriptionService.addSubscription({ id: subscription.id, data: subscription, items: items, user: customer })
                        alertInfo = { message: `Your membership ${subscription.id} has been created successfully.`, alertType: alertTypes.BasicAlert }
                    }

                    // Add notification to user.
                    [customer, notification] = await UserService.addNotification(customer.id, alertInfo.message)

                    req.io.emit('notifications', notification);

                    //Send Email
                    var resultEmail = await sendEmail(
                        customer.email,
                        lingua.email.title,
                        {
                            name: customer?.personalInfo?.firstName + ' ' + customer?.personalInfo?.lastName,
                            message: alertInfo.message
                        },
                        "../template/subscriptions.handlebars"
                    )

                    if (resultEmail) {
                        console.debug('Email Sent: ' + resultEmail?.accepted[0])

                    } else {

                        console.debug('WARNING: Email Not Sent.')
                    }

                } else {
                    console.log('customer.subscription.updated: Not Found Customer.')
                }

                break
            case 'customer.subscription.deleted':
                console.log(`WEBHOOK: Subscription Deleted: ${data.id}`)
                subscription = data
                customer = await UserService.getUserByBillingID(subscription.customer)
                if (customer) {
                    subscription = await Stripe.getSubscriptionById(subscription.id) // Find subscription to expand product information.
                    subscriptionItems = subscription.items.data
                    let mySubscription = await SubscriptionService.getSubscriptionById(subscription.id)
                    if (mySubscription) {
                        items = []
                        for (subItem of subscriptionItems) {
                            let itemToUpdate = mySubscription?.items?.find(item => item.id == subItem.id)
                            if (itemToUpdate) {
                                let newItem = { id: itemToUpdate.id, cars: itemToUpdate.cars, data: subItem }
                                items.push(newItem)
                            }
                        }

                        updates = {
                            data: subscription,
                            items: items
                        }


                        subscription = await SubscriptionService.updateSubscription(subscription.id, updates);

                        alertInfo = { message: `Your membership ${subscription.id} has been cancelled successfully. `, alertType: alertTypes.BasicAlert }

                    } else {
                        // Create Subs
                        let cars = JSON.parse(subscription?.metadata?.cars)
                        let subscriptionItems = subscription.items.data
                        let items = []
                        for (subItem of subscriptionItems) {
                            let newItem = { id: subItem.id, cars: [], data: subItem }
                            for (carObj of cars) {
                                if (subItem.price.id === carObj.priceID) {
                                    let newCar = await CarService.getCarByPlate(carObj.plate)
                                    if (!newCar)
                                        newCar = await CarService.addCar(carObj.brand, carObj.model, carObj.plate, customer.id)

                                    newItem.cars.push(newCar)
                                }

                            }
                            items.push(newItem)
                        }
                        newSubscription = await SubscriptionService.addSubscription({ id: subscription.id, data: subscription, items: items, user: customer })
                        alertInfo = { message: `Your membership ${subscription.id} has been created successfully.`, alertType: alertTypes.BasicAlert }
                    }
                    // Add notification to user.
                    [customer, notification] = await UserService.addNotification(customer.id, alertInfo.message)

                    req.io.emit('notifications', notification);

                    //Send Email
                    var resultEmail = await sendEmail(
                        customer.email,
                        lingua.email.title,
                        {
                            name: customer?.personalInfo?.firstName + ' ' + customer?.personalInfo?.lastName,
                            message: alertInfo.message
                        },
                        "../template/subscriptions.handlebars"
                    )

                    if (resultEmail) {
                        console.debug('Email Sent: ' + resultEmail?.accepted[0])

                    } else {

                        console.debug('WARNING: Email Not Sent.')
                    }

                } else {
                    console.log('customer.subscription.cancelled: Not Found Customer.')
                }

                break;
            default:
                console.log(`Unhandled event type ${event.type}`);

        }
        res.sendStatus(200)
    } catch (error) {
        console.log(`ERROR-WEBHOOK-EVENT: ${data?.object?.id}`)
        console.log(`ERROR stripeController: ${error.message}`)
        console.log(error)
        res.sendStatus(500)
    }
}

/**
 * This function creates a checkout session on stripe.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.checkout = async (req, res) => {
    // The validation if the car is valid are handled on the client side..
    const { subscriptions, customerID } = req.body

    try {
        // Group by priceID
        const subscriptionsGroup = groupByKey(subscriptions, 'priceID', { omitKey: false })
        const session = await Stripe.createCheckoutSession(customerID, subscriptions, Object.entries(subscriptionsGroup))
        // res.redirect(session.url)
        res.send({
            sessionId: session.id
        })
    } catch (e) {
        console.log(e)
        res.status(400)
        return res.send({
            error: {
                message: e.message
            }
        })
    }
}

/**
 * This function complete the checkout process after sucess.
 * Receive a sessionID, then find the session object.
 * Create cars on DB
 * Finally create a subscription object with items and cars and attach to user object.
 * 
 * @param {*} req 
 * @param {*} res 
 */
exports.completeCheckoutSuccess = async (req, res) => {
    try {
        let { session_id, subscription_id } = req.query,
            session, subscriptionID

        // clean cart items.
        let user = await UserService.emptyCart(req.user.id)
        if (user.cart.items?.lenght == 0)
            console.debug("The Cart is empty.")


        if (session_id) {
            console.debug("sessionID: " + session_id)
            session = await Stripe.getSessionByID(session_id)
            console.log(session)
            subscriptionID = session.subscription
        }
        if (!subscriptionID && subscription_id) {
            subscriptionID = subscription_id
        }

        let subscription = await SubscriptionService.getSubscriptionById(subscriptionID)
        let newSubscription

        // This code is not nescessary.
        if (!subscription) {
            subscription = await Stripe.getSubscriptionById(subscriptionID)
            let customer = await UserService.getUserByBillingID(subscription.customer)

            const cars = JSON.parse(subscription.metadata.cars)

            let subscriptionItems = subscription.items.data
            let items = []
            for (subItem of subscriptionItems) {
                let newItem = { id: subItem.id, cars: [], data: subItem }
                for (carObj of cars) {
                    if (subItem.price.id === carObj.priceID) {
                        let newCar = await CarService.addCar(carObj.brand, carObj.model, carObj.plate, customer.id)
                        newItem.cars.push(newCar)
                    }

                }
                items.push(newItem)
            }


            newSubscription = await SubscriptionService.addSubscription({ id: subscription.id, data: subscription, items: items, user: customer })
        } else {
            newSubscription = subscription
        }

        // TODO: completed message, add history
        if (newSubscription) {
            req.session.message = `Subcription Created to customer ${newSubscription.user.email}`
            req.session.alertType = alertTypes.CompletedActionAlert
        } else {
            req.session.message = `Failed to add a Subscription.`
            req.session.alertType = alertTypes.ErrorAlert
        }

        res.redirect('/account')

    }
    catch (error) {
        console.log(error.message)
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
        res.status(400).redirect('/account')
    }
}

/**
 * This function creates a checkout session on stripe and redirect to this checkout.
 * It's called from server side.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.stripeCheckout = async (req, res) => {
    const { product, customerID } = req.query
    const priceID = product

    try {
        const session = await Stripe.createCheckoutSession(customerID, priceID)
        res.redirect(session.url)
    } catch (e) {
        console.log(e)
        res.status(400)
        return res.send({
            error: {
                message: e.message
            }
        })
    }
}

/**
 * This function creates a billing session on stripe to manage payments/subscriptions.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.billing = async (req, res) => {
    const { customer } = req.body
    console.log('customer', customer)

    const session = await Stripe.createBillingSession(customer)
    console.log('session', session)

    res.json({ url: session.url })
}

/**
 * This function render the stripe charges of user.
 * @param {*} req 
 * @param {*} res 
 */
exports.charges = async (req, res) => {
    try {
        let user = req.user,
            { message, alertType } = req.session

        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        if (user) {
            const charges = await Stripe.getCustomerCharges(user)

            res.status(200).render('charges/index.ejs', {
                user,
                charges,
                message,
                alertType
            })
        } else {
            message = 'User ID not found.'
            alertType = alertTypes.ErrorAlert
            console.log('User ID not found.')
            res.redirect('/account')
        }

    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render the user events."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')

    }

}

/**
 * This function render the stripe invoices of user.
 * @param {*} req 
 * @param {*} res 
 */
exports.invoices = async (req, res) => {
    try {
        let user = req.user,
            { message, alertType } = req.session

        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        if (user) {
            const invoices = await Stripe.getCustomerInvoices(user)
            res.status(200).render('invoices/index.ejs', {
                user,
                message,
                alertType,
                invoices
            })
        } else {
            message = 'User ID not found.'
            alertType = alertTypes.ErrorAlert
            console.log('User ID not found.')
            res.redirect('/account')
        }

    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render the user invoices."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')

    }

}