const Stripe = require('../connect/stripe')
const CarService = require('../collections/cars')
const UserService = require('../collections/user')
// const { ROLES } = require('../collections/user/user.model')
const alertTypes = require('../helpers/alertTypes')

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

    const data = event.data.object

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

            let subscription = data
            let subscriptionItems = subscription.items.data
            let items = []
            for (subItem of subscriptionItems) {
                let newItem = { id: subItem.id, cars: [] }
                items.push(newItem)
            }
            console.debug(`WEBHOOK: Items to add ${items}`)

            let customer = await UserService.addSubscriptionToUser(subscription.customer, { id: subscription.id, items: items })
            console.debug(`WEBHOOK: Customer Updated ${customer.email}`)

            break

        case 'customer.subscription.updated':
            {
                // started trial
                // const user = await UserService.getUserByBillingID(data.customer)

                // if (data.plan.id == process.env.PRODUCT_BASIC) {
                //     console.log('You are talking about basic product')
                //     user.membershipInfo.plan = 'basic'
                // }

                // if (data.plan.id === process.env.PRODUCT_PRO) {
                //     console.log('You are talking about pro product')
                //     user.membershipInfo.plan = 'pro'
                // }

                // const isOnTrial = data.status === 'trialing'

                // if (isOnTrial) {
                //     user.membershipInfo.hasTrial = true
                //     user.membershipInfo.endDate = new Date(data.current_period_end * 1000)
                // } else if (data.status === 'active') {
                //     user.membershipInfo.hasTrial = false
                //     user.membershipInfo.endDate = new Date(data.current_period_end * 1000)
                // }

                // if (data.canceled_at) {
                //     // cancelled
                //     console.log('You just canceled the subscription' + data.canceled_at)
                //     user.membershipInfo.plan = 'none'
                //     user.membershipInfo.hasTrial = false
                //     user.membershipInfo.endDate = null
                // }
                // console.debug(`Actual: hasTrial: ${user.membershipInfo.hasTrial}, current_period_end ${data.current_period_end}, User Plan: ${user.membershipInfo.plan}`)

                // await user.save()
                // console.log('Customer Changed', JSON.stringify(data))
                break
            }
        case 'customer.subscription.deleted':
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);

    }
    res.sendStatus(200)
}

/**
 * This function creates a checkout session on stripe.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.checkout = async (req, res) => {
    // TODO validate if the car is valid.
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
            let newItem = { id: subItem.id, cars: [] }
            for (carObj of cars) {
                if (subItem.price.id === carObj.priceID) {
                    let newCar = await CarService.addCar(carObj.brand, carObj.model, carObj.plate)
                    newItem.cars.push(newCar)
                }

            }
            items.push(newItem)
        }

        // let customer = await UserService.getUserByBillingID(subscription.customer)
        let customer = await UserService.addSubscriptionToUser(subscription.customer, { id: subscription.id, items: items })

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