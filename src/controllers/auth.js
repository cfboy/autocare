const UserService = require('../collections/user')
const Crypto = require('../middleware/crypto')
const Stripe = require('../connect/stripe')
const Roles = require('../middleware/roles')
const alertTypes = require('../helpers/alertTypes')

exports.login = async(req, res) => {
    const { email, password } = req.body
    let { message, alertType } = ''
    let error = false

    console.log('email', email)

    if (!email || !password) {
        console.log(`Missing Email or password.`)
        message = `Missing email or password.`
        alertType = alertTypes.ErrorAlert // Set the message for alert. 
        error = true
    }

    if (!error) {
        let user = await UserService.getUserByEmail(email)
        let customerInfo = {}

        if (!user) {
            error = true
            console.log(`This user ${email} does not exist.`)
            message = `This user ${email} does not exist.`
                // Set the message for alert. 
            alertType = alertTypes.WarningAlert
        } else {
            if (password != Crypto.decryptData(user.password)) {
                error = true
                console.log(`Wrong password.`)
                message = `That email/password combination was not found.`
                alertType = alertTypes.ErrorAlert
            }
            if (!error) {
                // TODO: validate if the user is a customer or admin
                let stripeCustomer = await Stripe.getCustomerByID(user.billingID)
                if (!stripeCustomer) {
                    error = true
                    message = `Not found Stripe User`
                    alertType = alertTypes.ErrorAlert
                }
                if (!error) {
                    //Validate if the user is deleted on Stripe.
                    if (stripeCustomer.deleted) {
                        try {
                            console.log(`User exists on DB, but not in Stripe.`)
                            customerInfo = await Stripe.addNewCustomer(user.email, user.personalInfo.firstName,
                                    user.personalInfo.lastName,
                                    user.personalInfo.phoneNumber,
                                    user.personalInfo.city)
                                // Update the BillingID of User. 
                            customer = await UserService.updateBillingID(user.id, customerInfo.id)
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
    }

    if (error) {
        req.session.message = message
        req.session.alertType = alertType
        res.redirect('/')
    } else {
        req.session.user = email
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
                role: Roles.Customer,
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth,
                city,
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
        req.session.user = email

        res.redirect('/account')
    } else {
        let message = `That email already exist, please login.`
        console.log(
            `The existing ID for ${email} is ${JSON.stringify(customerInfo)}`
        )
        req.session.email = email

        // Set the message for alert. 
        req.session.message = message
        req.session.alertType = alertTypes.WarningAlert
        res.redirect('/')
    }
}

exports.logout = async(req, res) => {
    console.log('Log out...')
        // res.clearCookie('connect.sid', { path: '/' }).status(200);
    req.session.destroy()
    console.log('Good Bye.')
    res.redirect('/')
}

// TODO: Move to another controller.
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
                    password: 'Test1234',
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