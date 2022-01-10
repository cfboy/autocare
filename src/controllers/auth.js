const UserService = require('../user')
const Crypto = require('../middleware/crypto')
const Stripe = require('../connect/stripe')


exports.login = async(req, res) => {
    const { email, password } = req.body
    let { message, alertType } = ''
    let error = false

    console.log('email', email)

    if (!email || !password) {
        console.log(`Missing Email or password.`)
        message = `Missing email or password.`
        alertType = 'error'
            // Set the message for alert. 
        error = true
    }

    if (!error) {
        let user = await UserService.getUserByEmail(email)
        let customerInfo = {}

        if (!user) {
            error = true
            console.log(`email ${email} does not exist.`)
            message = `This user ${email} does not exist.`
                // Set the message for alert. 
            alertType = 'warning'
        } else {
            // TODO: Decrypt Password
            if (password != Crypto.decryptData(user.password)) {
                error = true
                console.log(`Wrong password.`)
                message = `That email/password combination was not found.`
                alertType = 'error'
            }
            if (!error) {
                // TODO: validate if the user is a customer or admin
                let stripeCustomer = await Stripe.getCustomerByID(user.billingID)
                    //Validate if the user is deleted on Stripe.
                if (stripeCustomer.deleted) {
                    try {
                        console.log(`User exists on DB, but not in Stripe.`)
                        customerInfo = await Stripe.addNewCustomer(user.email)
                            // Update the BillingID of User. 
                        customer = await UserService.updateBillingID(user.email, customerInfo.id)
                        console.log(
                            `A new user signed up and addded to Stripe. The ID for ${user.email}.`
                        )
                    } catch (e) {
                        console.log(e)
                        res.status(200).json({ e })
                        return
                    }
                }

                // TODO: Optimize and change this Trial Logic.
                const isTrialExpired =
                    user.membershipInfo.plan != 'none' && user.membershipInfo.endDate < new Date().getTime()

                if (isTrialExpired) {
                    console.log('trial expired')
                    user.membershipInfo.hasTrial = false
                    user.save()
                } else {
                    console.log(
                        `No trial information, Has trial: ${user.membershipInfo.hasTrial}, 
                            Plan: ${user.membershipInfo.plan},
                            End Date: ${user.membershipInfo.endDate}`
                        // user.membershipInfo.endDate < new Date().getTime()
                    )
                }
                console.log(
                    `The existing ID for ${email} is ${user.billingID}`
                )
            }
        }
    }

    if (error) {
        req.session.message = message
            // AlertTypes: success, error, warning, question, info. 
        req.session.alertType = alertType
        res.redirect('/')
    } else {
        req.session.email = email
        res.redirect('/account')
    }
}

exports.register = async(req, res) => {
    // TODO: Finish this method.
    const {
        email,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth,
        city,
        brand,
        model,
        plate
    } = req.body

    var { password } = req.body

    console.log('email', email)

    let customer = await UserService.getUserByEmail(email)
    let customerInfo = {}

    if (!customer) {
        console.log(`email ${email} does not exist. Making one. `)
        try {
            customerInfo = await Stripe.getCustomerByEmail(email)
            if (!customerInfo) {
                customerInfo = await Stripe.addNewCustomer(email, firstName,
                    lastName,
                    phoneNumber,
                    city)
            }

            password = Crypto.encryptData(password)

            customer = await UserService.addUser({
                email,
                password,
                billingID: customerInfo.id,
                role: 'customer',
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth,
                brand,
                model,
                plate,
                plan: 'none',
                endDate: null
            })

            console.log(
                `A new user signed up and addded to DB. The ID for ${email} is ${JSON.stringify(
                    customerInfo
                )}`
            )

            console.log(`User also added to DB. Information from DB: ${customer}`)
        } catch (e) {
            console.log(e)
            res.status(200).json({ e })
            return
        }
        req.session.email = email

        res.redirect('/account')
    } else {
        let message = `That email already exist, please login.`
        console.log(
            `The existing ID for ${email} is ${JSON.stringify(customerInfo)}`
        )
        req.session.email = email

        // Set the message for alert. 
        req.session.message = message

        // AlertTypes: success, error, warning, question, info. 
        req.session.alertType = 'warning'
        res.redirect('/')
    }
}

exports.account = async(req, res) => {
    let { email } = req.session
    let customer = await UserService.getUserByEmail(email)
    if (!customer) {
        res.redirect('/')
    } else {
        let products = await Stripe.getAllProducts()
        if (products) {
            // Get price of all products.
            for (const product of products) {
                product.priceInfo = await Stripe.getProductPrice(product.id)
            }
        }
        res.render('index.ejs', { customer, products })
    }
}

exports.logout = async(req, res) => {
    // req.session.email = null
    res.clearCookie('connect.sid', { path: '/' }).status(200);
    res.redirect('/')
}

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
    switch (event.type) {
        case 'customer.created':
            console.log(JSON.stringify(data))
            break
        case 'invoice.paid':
            break
        case 'customer.subscription.created':
            {
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
                    use.membershipInfo.endDate = new Date(data.current_period_end * 1000)
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
        default:
    }
    res.sendStatus(200)
}