const Stripe = require('../connect/stripe')
const CarService = require('../collections/cars')
const UserService = require('../collections/user')
const SubscriptionService = require('../collections/subscription')
const UtilizationService = require('../collections/utilization')
const AuthService = require('../config/auth.service')
const { ROLES } = require('../collections/user/user.model')
const alertTypes = require('../helpers/alertTypes')
const sendEmail = require("../utils/email/sendEmail");

const bcrypt = require('bcrypt');

/**
 * This function is a helper for a group a list per key.
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
    let event
    const lingua = req.res.lingua.content
    const {
        INVALIDATE_UNCOLECTIBLE_INVOICES
    } = process.env;

    try {
        event = Stripe.createWebhook(req.body, req.header('Stripe-Signature'))
    } catch (err) {
        req.bugsnag.notify(new Error(err))
        console.error(err)
        console.error(`ERROR: stripeController.webhook -> req.body: ${req.body}`)
        return res.sendStatus(400)
    }
    try {
        const data = event.data.object
        let customer, notification, subscription, alertInfo, isNew
        console.log(`WEBHOOK: Event: ${event.type}`)
        switch (event.type) {
            // case 'customer.created':
            // console.debug(JSON.stringify(data))
            // customer = await UserService.getUserByEmail(data?.email)

            // if (!customer) {
            //     // TODO: verify if the customer exists, if not then create.
            //     let hashPassword = await bcrypt.hash('Test1234', 10)
            //     let firstName = data?.name?.split(' ')[0],
            //         lastName = data?.name?.split(' ')[1],
            //         phoneNumber = data?.phone,
            //         email = data?.email


            //     let user = await UserService.addUser({
            //         email: email,
            //         password: hashPassword,
            //         billingID: data.id,
            //         role: ROLES.CUSTOMER,
            //         firstName: firstName,
            //         lastName: lastName,
            //         phoneNumber: phoneNumber
            //     })
            // }

            // break;
            case 'customer.subscription.created':
                console.log(`WEBHOOK: customer.subscription.created: ${data.id}`)

                subscription = data
                if (subscription.status == 'active') {
                    customer = await UserService.getUserByBillingID(subscription.customer)
                    if (customer) {
                        subscription = await SubscriptionService.getSubscriptionById(subscription.id);

                        if (!subscription) {
                            // Find subscription again for expand product information
                            subscription = await Stripe.getSubscriptionById(data.id)
                            subscriptionItems = subscription.items.data
                            let cars = []
                            let userCartItems = customer?.cart?.items
                            if (userCartItems) {
                                // cars = userCartItems ? userCartItems : JSON.parse(subscription?.metadata?.cars)
                                cars = userCartItems
                            }

                            let items = []
                            for (subItem of subscriptionItems) {
                                let newItem = { id: subItem.id, cars: [], data: subItem }
                                if (cars.length > 0) {
                                    for (carObj of cars) {
                                        if (subItem.price.id === carObj.priceID) {
                                            let newCar = await CarService.getCarByPlate(carObj.plate)
                                            if (newCar) {
                                                // Add old utilization / History
                                                await UtilizationService.handleUtilization(newCar, subscription.current_period_start, subscription.current_period_end)
                                                if (newCar.cancel_date != null)
                                                    await CarService.removeCarFromAllSubscriptions(newCar)
                                            }
                                            else
                                                newCar = await CarService.addCar(carObj.brand, carObj.model, carObj.plate, customer.id)

                                            if (newCar)
                                                newItem.cars.push(newCar)
                                            else {
                                                // add alert to add car
                                                req.bugsnag.notify(new Error(`Car not created at 'customer.subscription.created' (${carObj.brand} - ${carObj.model} - ${carObj.plate})`),
                                                    function (event) {
                                                        event.setUser(customer.email)
                                                    })
                                                console.error("ERROR: Car not created at 'customer.subscription.created'")
                                            }
                                        }

                                    }
                                }
                                items.push(newItem)

                            }

                            alertInfo = { message: `Tu membresía a sido creada exitosamente.`, alertType: alertTypes.BasicAlert }

                            subscription = await SubscriptionService.addSubscription({ id: subscription.id, items: items, data: subscription, user: customer });
                        }

                        [customer, notification] = await UserService.addNotification(customer.id, alertInfo.message);

                        req.io.in(customer?.id).emit('notifications', notification);

                        //Send Email
                        var resultEmail = await sendEmail(
                            customer.email,
                            'subscription_created',
                            {
                                name: customer?.fullName(),
                                subscription_id: subscription.id,
                                message: alertInfo.message,
                                subject: 'New Subscription - AutoCare Memberships'
                            }
                        );
                        if (resultEmail.sent) {
                            console.debug('Email Sent: ' + customer.email)

                        } else {
                            req.bugsnag.notify(new Error(resultEmail.data),
                                function (event) {
                                    event.setUser(customer.email)
                                })
                            console.error('ERROR: Email Not Sent.')
                        }

                    } else {
                        console.log('customer.subscription.created: Not Found Customer.')
                    }
                } else {
                    console.debug('WEBHOOK: SUBSCRIPTION STATUS NOT ACTIVE. HANDLE ON UPDATE.')
                }

                break;
            case 'customer.subscription.updated':

                let updateOrCreateResult = await manageUpdateOrCreateSubscriptionsWebhook(data, req.bugsnag, lingua, req);

                break;
            case 'customer.subscription.deleted':
                // console.log(`WEBHOOK: customer.subscription.deleted: ${data.id}`)

                let deletedResult = await manageDeletedSubscriptionsWebhook(data, req.bugsnag, req);

                break;

            case 'invoice.marked_uncollectible':
                if (INVALIDATE_UNCOLECTIBLE_INVOICES) {
                    const invoiceMarkedUncollectible = data;

                    let invoice = await Stripe.voidInvoice(invoiceMarkedUncollectible.id)
                    console.log('invoice marked_void done.')
                }
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);

        }
        res.sendStatus(200)
    } catch (error) {
        req.bugsnag.notify(new Error(error))
        console.error(`ERROR-WEBHOOK-EVENT: ${error.message}`)
        res.sendStatus(500)
    }
}

const manageDeletedSubscriptionsWebhook = async (subscription, bugsnag, req) => {
    let customer = await UserService.getUserByBillingID(subscription.customer)
    let notification, alertInfo
    if (customer) {
        subscription = await Stripe.getSubscriptionById(subscription.id) // Find subscription to expand product information.
        let subscriptionItems = subscription.items.data
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

            let updates = {
                data: subscription,
                items: items
            }


            subscription = await SubscriptionService.updateSubscription(subscription.id, updates);

            alertInfo = { message: `Tu membresía a sido cancelada exitosamente.`, alertType: alertTypes.BasicAlert };

            // Add notification to user.
            [customer, notification] = await UserService.addNotification(customer.id, alertInfo.message)

            req.io.in(customer?.id).emit('notifications', notification);
            //Send Email
            var resultEmail = await sendEmail(
                customer.email,
                'subscription_cancelled',
                {
                    name: customer?.fullName(),
                    subscription_id: subscription.id,
                    message: alertInfo.message,
                    subject: 'Subscription Cancelled - AutoCare Memberships'
                }
            );
            if (resultEmail.sent) {
                console.debug('Email Sent: ' + customer.email)

            } else {
                bugsnag.notify(new Error(resultEmail.data),
                    function (event) {
                        event.setUser(customer.email)
                    })
                console.error('ERROR: Email Not Sent.')
            }
        }
    } else {
        console.log('customer.subscription.cancelled: Not Found Customer.')
    }
}

const manageUpdateOrCreateSubscriptionsWebhook = async (subscription, bugsnag, lingua, req) => {
    try {
        console.log('Start manageUpdateOrCreateSubscriptionsWebhook()');
        let isNew = false; //Flag to identify if is a new subscription or update
        let items, subscriptionItems, alertInfo, result, message, activationResult, activationEmailProperties

        // Find the customer in Stripe by BillingID
        let stripeCustomer = await Stripe.getCustomerByID(subscription.customer);

        // The find the customer in the DB with the email in stripe.
        let customer = await UserService.getUserByEmail(stripeCustomer.email);

        if (!customer) {
            console.log('Not found Customer: manageUpdateOrCreateSubscriptionsWebhook()');
            // If the user not exist in the DB then create one.
            [activationResult, message, customer, activationEmailProperties] = await AuthService.registerAndActivateLink(stripeCustomer, ROLES.CUSTOMER, lingua, bugsnag)

            if (!customer) {
                console.log('Not Found Customer.')
                return [result, message, null, null]
            }
        }

        // If the user is already in the DB
        // Find the subscription in stripe to expand the product information. 
        subscription = await Stripe.getSubscriptionById(subscription.id)
        subscriptionItems = subscription.items.data
        // Find the subscription in the DB.
        let mySubscription = await SubscriptionService.getSubscriptionById(subscription.id)
        if (mySubscription) {
            // ------------------- Handle utilization ------------------------------------------------------
            // Verify if the period is changed.
            if (subscription.current_period_start !== mySubscription.data.current_period_start || subscription.current_period_end !== mySubscription.data.current_period_end) {
                // console.debug('stripeController --> The period is different.')
                let cars = await SubscriptionService.getSubscriptionCarsById(subscription.id)

                if (cars) {
                    for (carObj of cars) {
                        // Add old utilization / History
                        await UtilizationService.handleUtilization(carObj, subscription.current_period_start, subscription.current_period_end)
                    }
                }
            }
            // -------------------------------------------------------------------------------------

            items = []
            for (subItem of subscriptionItems) {
                let itemToUpdate = mySubscription?.items?.find(item => item.id == subItem.id)
                let cars = []
                let newItem
                if (itemToUpdate) {
                    console.log(`Found item tu update (ID: ${itemToUpdate?.id}).`)
                    cars = itemToUpdate?.cars
                    newItem = { id: itemToUpdate.id, cars: cars, data: subItem }

                    try {
                        if (newItem?.cars?.length == newItem.data.quantity) {
                            for (carObj of newItem.cars) {
                                if (carObj.cancel_date !== null)
                                    await CarService.updateCar(carObj.id, { cancel_date: null, user_id: customer.id })
                            }
                        }
                    } catch (e) {
                        bugsnag.notify(new Error(e),
                            function (event) {
                                event.setUser(customer.email)
                            })
                        console.error('Error trying to clear cancel_date of subscription: ' + mySubscription.id)
                    }
                }
                else {
                    // TODO: validate this section.
                    console.log(`ERROR: Not Found item tu update sub (ID: ${mySubscription?.id}).`)
                    cars = customer?.cart?.items
                    newItem = { id: subItem.id, cars: [], data: subItem }

                    for (carObj of cars) {
                        if (subItem.price.id === carObj.priceID) {
                            let newCar = await CarService.getCarByPlate(carObj.plate)
                            if (newCar) {
                                // Add old utilization / History
                                await UtilizationService.handleUtilization(newCar, subscription.current_period_start, subscription.current_period_end)
                                if (newCar.cancel_date != null)
                                    await CarService.removeCarFromAllSubscriptions(newCar)
                            }
                            else
                                newCar = await CarService.addCar(carObj.brand, carObj.model, carObj.plate, customer.id)

                            if (newCar)
                                newItem.cars.push(newCar)
                            else {
                                // add alert to add car
                                bugsnag.notify(new Error(`Car not created at 'customer.subscription.updated' (${carObj.brand} - ${carObj.model} - ${carObj.plate})`),
                                    function (event) {
                                        event.setUser(customer.email)
                                    })
                                console.error("ERROR: Car not created at 'customer.subscription.updated'")
                            }
                        }

                    }
                }

                items.push(newItem)
            }

            updates = {
                data: subscription,
                items: items
            }

            subscription = await SubscriptionService.updateSubscription(subscription.id, updates);

            alertInfo = { message: `Tu membresía a sido actualizada exitosamente.`, alertType: alertTypes.BasicAlert }

            // Send customer balance on email.
            let { totalString } = await Stripe.getCustomerBalanceTransactions(customer.billingID)
            if (totalString)
                alertInfo.message += `Your current balance on your account is ${totalString}.`;

        } else {
            // If the subscription not exist, then create one.
            isNew = true;
            // let cars = customer?.cart?.items.length > 0 ? customer.cart.items : JSON.parse(subscription.metadata.cars_data)
            let cars = subscription.metadata.cars_data ? JSON.parse(subscription.metadata.cars_data) : []
            // let cars = customer?.cart?.items
            let subscriptionItems = subscription.items.data
            let items = []
            for (subItem of subscriptionItems) {
                let newItem = { id: subItem.id, cars: [], data: subItem }
                for (carObj of cars) {
                    if (subItem.price.id === carObj.priceID) {
                        let newCar = await CarService.getCarByPlate(carObj.plate)
                        if (newCar) {
                            // Add old utilization / History
                            await UtilizationService.handleUtilization(newCar, subscription.current_period_start, subscription.current_period_end)
                            if (newCar.cancel_date != null)
                                await CarService.removeCarFromAllSubscriptions(newCar)

                            // Reassign new user 
                            newCar = await CarService.updateCar(newCar.id, { user_id: customer.id })
                        }
                        else
                            newCar = await CarService.addCar(carObj.brand, carObj.model, carObj.plate, customer.id)

                        if (newCar)
                            newItem.cars.push(newCar)
                        else {
                            // add alert to add car
                            bugsnag.notify(new Error(`Car not created at 'customer.subscription.updated' (${carObj.brand} - ${carObj.model} - ${carObj.plate})`),
                                function (event) {
                                    event.setUser(customer.email)
                                })
                            console.error("ERROR: Car not created at 'customer.subscription.updated'")
                        }
                    }

                }
                items.push(newItem)
            }
            try {
                subscription = await SubscriptionService.addSubscription({ id: subscription.id, data: subscription, items: items, user: customer })
                alertInfo = { message: `Tu membresía a sido creada exitosamente.`, alertType: alertTypes.BasicAlert }


            }
            catch (error) {
                console.error(`stripeController: manageUpdateSubscriptionsWebhook. ${error}`);
                bugsnag.notify(new Error(error),
                    function (event) {
                        event.setUser(customer.email)
                    })

            }

        }

        if (subscription) {
            // Add notification to the user
            [customer, notification] = await UserService.addNotification(customer.id, alertInfo.message);

            req.io.in(customer?.id).emit('notifications', notification);

            // Prepare email variables
            let emailTemplate
            let emailSubject
            let emailProperties
            if (activationResult) {
                emailProperties = activationEmailProperties

            } else {
                emailTemplate = isNew ? 'subscription_created' : 'subscription_updated';
                emailSubject = isNew ? 'Membresía Creada - AutoCare Memberships' : 'Membresía Actualizada - AutoCare Memberships';

                emailProperties = {
                    email: customer.email,
                    emailType: emailTemplate,
                    payload: {
                        name: customer?.fullName(),
                        subscription_id: subscription.id,
                        message: alertInfo.message,
                        subject: emailSubject
                    }
                }
            }

            // Send Email
            var resultEmail = await sendEmail(emailProperties.email, emailProperties.emailType, emailProperties.payload);
            if (resultEmail.sent) {
                console.debug('Email Sent: ' + customer.email)

            } else {
                req.bugsnag.notify(new Error(resultEmail.data),
                    function (event) {
                        event.setUser(customer.email)
                    })
                console.error('ERROR: Email Not Sent.')
            }
        }

        return [subscription, alertInfo, isNew, customer];
    }
    catch (error) {
        console.error(`ERROR-STRIPE: manageUpdateSubscriptionsWebhook. ${error}`);
        return [null, error.message]
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
    const { subscriptions, customerID, backURL } = req.body

    try {
        // Group by priceID
        const subscriptionsGroup = groupByKey(subscriptions, 'priceID', { omitKey: false })
        const session = await Stripe.createCheckoutSession(customerID, subscriptions, Object.entries(subscriptionsGroup), backURL)
        // res.redirect(session.url)
        if (session) {
            res.send({
                sessionId: session.id
            })
        }
    } catch (e) {
        req.bugsnag.notify(new Error(e),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(e)
        res.status(400).send({
            error: {
                message: e.message
            }
        })
    }
}

/**
 * This function creates a checkout session on stripe with the email.
 * This function is called from the checkout and renew process.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.checkoutWithEmail = async (req, res) => {
    // The validation if the car is valid are handled on the client side..
    const { subscriptions, email, backURL, renew } = req.body

    try {
        // Get stripe customer
        const stripeCustomer = await Stripe.getCustomerByEmail(email);
        // Get DB user.
        const customer = await UserService.getUserByEmail(email);

        let billingID

        if (customer)
            billingID = customer.billingID
        else if (stripeCustomer)
            billingID = stripeCustomer.id

        // Group by priceID    
        const subscriptionsGroup = groupByKey(subscriptions, 'priceID', { omitKey: false })

        let session, canUseThisCar;

        // Validate car to avoid duplicated plates in the system.
        for (item of subscriptions) {
            let car = await CarService.getCarByPlate(item.plate)
            canUseThisCar = car ? await CarService.canUseThisCarForNewSubs(car) : true

            if (!canUseThisCar) {
                break;
            }

        }

        if (!canUseThisCar) {
            res.send({
                sessionId: null, message: "Car not valid. Please cancel the order and add other car."
            })
        } else {

            if (billingID && stripeCustomer)
                session = await Stripe.createCheckoutSession(billingID, subscriptions, Object.entries(subscriptionsGroup), backURL)
            else
                session = await Stripe.createCheckoutSessionWithEmail(email, subscriptions, Object.entries(subscriptionsGroup), backURL)

            if (session) {
                res.send({
                    sessionId: session.id
                })
            }
        }
    } catch (e) {
        req.bugsnag.notify(new Error(e),
            function (event) {
                event.setUser(email)
            })
        console.error(e)
        res.status(500).send({
            error: {
                message: e.message
            }
        })
    }
}

/**
 * This function complete the checkout process after success.
 * Receive a session_id, then find the session object.
 * 
 * @param {*} req 
 * @param {*} res 
 */
exports.completeCheckoutSuccess = async (req, res) => {
    try {
        let { session_id } = req.query,
            session

        if (session_id) {
            console.debug("sessionID: " + session_id)
            session = await Stripe.getSessionByID(session_id)
            stripeCustomer = await Stripe.getCustomerByID(session.customer)
        }

        // if (req.user) {
        //     // clean cart items.
        //     user = await UserService.emptyCart(req.user.id)

        // } else {
        // Clear cookie cart
        res.cookie('cart', JSON.stringify([]));
        res.cookie('subscriptionEmail', '');
        // }

        req.session.message = `Subscription Created to account ${stripeCustomer.email}`
        req.session.alertType = alertTypes.CompletedActionAlert

        res.redirect('/account')

    }
    catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user ? req.user.email : stripeCustomer?.email)
            })
        console.error(error.message)
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
        req.bugsnag.notify(new Error(e))
        console.error(e)
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
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error.message)
        req.session.message = "Error trying to render the user invoices."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }

}

/**
 * This function render the stripe invoices of user.
 * @param {*} req 
 * @param {*} res 
 */
exports.markUncollectibleInvoice = async (req, res) => {
    try {

        let invoiceID = req.body.id

        if (invoiceID) {
            let invoice = await Stripe.markUncollectibleInvoice(invoiceID)

            if (invoice) {

                alertInfo = { message: `Your invoice ${invoice.id} has been updated successfully. `, alertType: alertTypes.BasicAlert }
                console.debug(alertInfo.message)
                res.send(`Action Completed. The page is reloaded in a few seconds...`)

            } else {
                res.send('Action not completed.')
            }
        } else {
            console.log('Missing invoice ID')
            res.send('Missing invoice ID.')
        }

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: subscriptionsController -> Trying to sync membership. ${error.message}`)
        res.render('Error on sync membership.')
    }
}



/**
 * This function find all subscriptions with active status and oldPrice on any item, 
 * then change this price for newPrice on the corresponding item.
 * @param {*} req 
 * @param {*} res 
 */
exports.changePrice = async (req, res) => {

    try {
        // Basic
        // let oldPrice = 'price_1JvNZ5L5YqSpFl3KFGcW042e'
        // let newPrice = 'price_1LIcmBL5YqSpFl3KlaCoJqeL'
        // Premium
        // let oldPrice = 'price_1JvNZuL5YqSpFl3Kg0Ct8yLB'
        // let newPrice = 'price_1LIckEL5YqSpFl3KioTpVNsH'

        let allPrices = await Stripe.getAllPrices()
        let { oldPrice, newPrice } = req.body

        let validNewPrice = allPrices.some(it => it.id == newPrice)

        let subscriptions = await SubscriptionService.getSubscriptionsByPrice(oldPrice)

        if (subscriptions.length > 0 && validNewPrice) {
            let count = 0;
            for (let subscription of subscriptions) {
                let itemToUpdate = subscription.data.items.data.find(item => item.price.id === oldPrice)
                let updates = {
                    items: [
                        { id: itemToUpdate.id, price: newPrice, quantity: itemToUpdate.quantity }
                    ]
                }
                try {
                    let updated = await Stripe.updateStripeSubscription(subscription.id, updates)

                    if (updated) {
                        count++
                        console.log(`Price (${newPrice}) updated for subscription (${updated?.id})`)
                    }
                } catch (error) {
                    console.error(error)
                    console.error("Error trying to change price to: " + subscription?.id)
                }
            }

            req.session.message = `Updated price for ${count} subscriptions: ${newPrice}`
            req.session.alertType = alertTypes.CompletedActionAlert
        } else {
            if (!validNewPrice) {
                req.session.message = `The new price is invalid.`
                req.session.alertType = alertTypes.ErrorAlert
            } else {
                req.session.message = `No subscriptions to update the price.`
                req.session.alertType = alertTypes.BasicAlert
            }
        }

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: stripeController.changePrice(). ${error.message}`)
        req.session.message = "Error trying to change old price."
        req.session.alertType = alertTypes.ErrorAlert

    }
    res.redirect('/account')
}