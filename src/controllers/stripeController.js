const Stripe = require('../connect/stripe')
const CarService = require('../collections/cars')
const UserService = require('../collections/user')
const SubscriptionService = require('../collections/subscription')
// const { ROLES } = require('../collections/user/user.model')
const alertTypes = require('../helpers/alertTypes')
const moment = require('moment');
const { completeDateFormat } = require('../helpers/formats')

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

    try {
        event = Stripe.createWebhook(req.body, req.header('Stripe-Signature'))
    } catch (err) {
        console.log(err)
        return res.sendStatus(400)
    }
    try {
        const data = event.data.object
        let customer, notification, subscription, items, subscriptionItems, alertInfo
        console.log(event.type, data)
        switch (event.type) {
            case 'customer.created':
                console.log(JSON.stringify(data))
                if (data) {
                    let user = await UserService.addUser({
                        email: data.email,
                        password: 'Test1234', //TODO: optimize
                        billingID: data.id,
                        role: Roles.CUSTOMER,
                        firstName: data.name.split(' ')[0],
                        lastName: data.name.split(' ')[1],
                        phoneNumber: data.phone,
                        dateOfBirth: null,
                        city: data.address ? data.address.city : null
                    })
                }
                break
            case 'customer.deleted':
                break
            case 'customer.updated':
                break
            case 'invoice.paid':
                break
            case 'customer.subscription.created':
                console.debug(`WEBHOOK: customer.subscription.created: ${data.id}`)

                subscription = data
                subscriptionItems = subscription.items.data

                customer = await UserService.getUserByBillingID(subscription.customer)
                if (customer) {
                    items = []
                    for (subItem of subscriptionItems) {
                        let newItem = { id: subItem.id, cars: [], data: subItem }
                        items.push(newItem)
                    }
                    console.debug(`WEBHOOK: Items to add ${items.length}`)

                    alertInfo = { message: "Subscription Updated", alertType: alertTypes.BasicAlert }

                    subscription = await SubscriptionService.addSubscription({ id: subscription.id, items: items, data: subscription, user: customer });

                    [customer, notification] = await UserService.addNotification(customer.id, alertInfo.message);

                    req.io.emit('notifications', notification);
                } else {
                    console.log('customer.subscription.created: Not Found Customer.')
                }

                break;
            case 'customer.subscription.updated':
                subscription = data
                customer = await UserService.getUserByBillingID(subscription.customer)
                if (customer) {

                    alertInfo = { message: "Subscription Updated", alertType: alertTypes.BasicAlert }

                    subscriptionItems = subscription.items.data
                    let mySubscription = await SubscriptionService.getSubscriptionById(subscription.id)

                    items = []
                    for (subItem of subscriptionItems) {
                        let itemToUpdate = mySubscription.items.find(item => item.id == subItem.id)
                        let newItem = { id: itemToUpdate.id, cars: itemToUpdate.cars, data: subItem }
                        items.push(newItem)
                    }

                    updates = {
                        data: subscription,
                        items: items
                    }


                    subscription = await SubscriptionService.updateSubscription(subscription.id, updates)

                    if (subscription.canceled_at) {
                        // cancelled
                        console.log(`You just canceled the subscription: ${subscription.id} at ${moment(subscription?.canceled_at * 1000).isValid() ? moment(subscription?.canceled_at * 1000).format(completeDateFormat) : 'N/A'}`)
                        alertInfo = { message: "Subscription Cancelled", alertType: alertTypes.BasicAlert }
                    }

                    // Add notification to user.
                    [customer, notification] = await UserService.addNotification(customer.id, alertInfo.message)

                    req.io.emit('notifications', notification);
                    
                } else {
                    console.log('customer.subscription.updated: Not Found Customer.')
                }

                break
            case 'customer.subscription.deleted':
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);

        }
        res.sendStatus(200)
    } catch (error) {
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

        if (session_id) {
            console.debug("sessionID: " + session_id)
            session = await Stripe.getSessionByID(session_id)
            console.log(session)
            subscriptionID = session.subscription
        }
        if (subscription_id) {
            subscriptionID = subscription_id
        }

        const subscription = await Stripe.getSubscriptionById(subscriptionID)
        const cars = JSON.parse(subscription.metadata.cars)

        let subscriptionItems = subscription.items.data
        let items = []
        for (subItem of subscriptionItems) {
            let newItem = { id: subItem.id, cars: [], data: subItem }
            for (carObj of cars) {
                if (subItem.price.id === carObj.priceID) {
                    let newCar = await CarService.addCar(carObj.brand, carObj.model, carObj.plate)
                    newItem.cars.push(newCar)
                }

            }
            items.push(newItem)
        }

        let customer = await UserService.getUserByBillingID(subscription.customer)

        let newSubscription = await SubscriptionService.addSubscription({ id: subscription.id, data: subscription, items: items, user: customer })

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