const Stripe = require('../connect/stripe')
const UserService = require('../collections/user')
const Roles = require('../middleware/roles')

const productToPriceMap = {
    basic: process.env.PRODUCT_BASIC,
    pro: process.env.PRODUCT_PRO
}

// This function handle all Stripe events.
exports.webhook = async(req, res) => {
    let event

    try {
        event = Stripe.createWebhook(req.body, req.header('Stripe-Signature'))
    } catch (err) {
        console.log(err)
        return res.sendStatus(400)
    }

    const data = event.data.object

    console.log(event.type, data)
        // TODO: Develop necessary events
    switch (event.type) {
        case 'customer.created':
            console.log(JSON.stringify(data))
            if (data) {
                let user = await UserService.addUser({
                    email: data.email,
                    password: 'Test1234', //TODO: optimize
                    billingID: data.id,
                    role: Roles.Customer,
                    firstName: data.name.split(' ')[0],
                    lastName: data.name.split(' ')[1],
                    phoneNumber: data.phone,
                    dateOfBirth: null,
                    city: data.address ? data.address.city : null,
                    brand: null,
                    model: null,
                    plate: null,
                    plan: 'none',
                    endDate: null
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
            {
                // TODO: move all logic to user.service
                const user = await UserService.getUserByBillingID(data.customer)

                if (data.plan.id === process.env.PRODUCT_BASIC) {
                    console.log('You are talking about basic product')
                    user.membershipInfo.plan = 'basic'
                }

                if (data.plan.id === process.env.PRODUCT_PRO) {
                    console.log('You are talking about pro product')
                    user.membershipInfo.plan = 'pro'
                }

                user.membershipInfo.hasTrial = true
                user.membershipInfo.endDate = new Date(data.current_period_end * 1000)

                await user.save()

                break
            }
        case 'customer.subscription.updated':
            {
                // started trial
                const user = await UserService.getUserByBillingID(data.customer)

                if (data.plan.id == process.env.PRODUCT_BASIC) {
                    console.log('You are talking about basic product')
                    user.membershipInfo.plan = 'basic'
                }

                if (data.plan.id === process.env.PRODUCT_PRO) {
                    console.log('You are talking about pro product')
                    user.membershipInfo.plan = 'pro'
                }

                const isOnTrial = data.status === 'trialing'

                if (isOnTrial) {
                    user.membershipInfo.hasTrial = true
                    user.membershipInfo.endDate = new Date(data.current_period_end * 1000)
                } else if (data.status === 'active') {
                    user.membershipInfo.hasTrial = false
                    user.membershipInfo.endDate = new Date(data.current_period_end * 1000)
                }

                if (data.canceled_at) {
                    // cancelled
                    console.log('You just canceled the subscription' + data.canceled_at)
                    user.membershipInfo.plan = 'none'
                    user.membershipInfo.hasTrial = false
                    user.membershipInfo.endDate = null
                }
                console.log('actual', user.membershipInfo.hasTrial, data.current_period_end, user.membershipInfo.plan)

                await user.save()
                console.log('customer changed', JSON.stringify(data))
                break
            }
        case 'customer.subscription.deleted':
            break;
        default:
    }
    res.sendStatus(200)
}

exports.checkout = async(req, res) => {
    const customer = req.user
    const { product, customerID } = req.body

    const price = productToPriceMap[product]

    try {
        const session = await Stripe.createCheckoutSession(customerID, price)

        const ms =
            new Date().getTime() + 1000 * 60 * 60 * 24 * process.env.TRIAL_DAYS
        const n = new Date(ms)

        customer.membershipInfo.plan = product
        customer.membershipInfo.hasTrial = true
        customer.membershipInfo.endDate = n
        customer.save()

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

exports.billing = async(req, res) => {
    const { customer } = req.body
    console.log('customer', customer)

    const session = await Stripe.createBillingSession(customer)
    console.log('session', session)

    res.json({ url: session.url })
}