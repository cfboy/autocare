require('dotenv').config()
require('./src/connect/mongodb')
const bodyParser = require('body-parser')
const express = require('express')
const session = require('express-session')
var MemoryStore = require('memorystore')(session)
const UserService = require('./src/user')
const Stripe = require('./src/connect/stripe')
const setCurrentUser = require('./src/middleware/setCurrentUser')
const hasPlan = require('./src/middleware/hasPlan')
var path = require('path');

const app = express()
app.use(session({
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    secret: 'keyboard cat'
}))

app.use('/webhook', bodyParser.raw({ type: 'application/json' }))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static('public'))
app.engine('html', require('ejs').renderFile)

const productToPriceMap = {
    basic: process.env.PRODUCT_BASIC,
    pro: process.env.PRODUCT_PRO
}

app.get('/none', [setCurrentUser, hasPlan('none')], async function(
    req,
    res,
    next
) {
    res.status(200).render('none.ejs')
})

app.get('/basic', [setCurrentUser, hasPlan('basic')], async function(
    req,
    res,
    next
) {
    res.status(200).render('basic.ejs')
})

app.get('/pro', [setCurrentUser, hasPlan('pro')], async function(
    req,
    res,
    next
) {
    res.status(200).render('pro.ejs')
})

app.get('/', function(req, res) {
    // Message for alerts
    let { message, alertType } = req.session

    // Destroy the session if exist anny message.
    if (message)
        req.session.destroy()

    res.render('login.ejs', { message, alertType })
})

app.get('/create-account', function(req, res) {
    res.render('register.ejs')
})

app.get('/account', async function(req, res) {
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

        // res.render('account.ejs', { customer, products })
        res.render('index.ejs', { customer, products })

    }
})

app.post('/login', async function(req, res) {
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
            message = `This user ${email} not exist.`
                // Set the message for alert. 
            alertType = 'warning'
        } else {
            // TODO: Decrypt Password
            if (password != user.password) {
                error = true
                console.log(`Wrong password.`)
                message = `Wrong password.`
                alertType = 'error'
            }
            if (!error) {
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
                    `The existing ID for ${email} is ${JSON.stringify(customerInfo)}`
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
})

app.post('/register', async function(req, res) {
    // TODO: Finish this method.
    const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth,
        city,
        brand,
        model,
        plate
    } = req.body

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

            customer = await UserService.addUser({
                email,
                password,
                billingID: customerInfo.id,
                role: 'user',
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
        let message = `The user ${email} has already exist.`
        console.log(
            `The existing ID for ${email} is ${JSON.stringify(customerInfo)}`
        )

        // Set the message for alert. 
        req.session.message = message

        // AlertTypes: success, error, warning, question, info. 
        req.session.alertType = 'warning'
        res.redirect('/')
    }
})

app.get('/logout', async function(req, res) {
    // req.session.email = null
    res.clearCookie('connect.sid', { path: '/' }).status(200);
    res.redirect('/')
})

app.post('/checkout', setCurrentUser, async(req, res) => {
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
})

app.post('/billing', setCurrentUser, async(req, res) => {
    const { customer } = req.body
    console.log('customer', customer)

    const session = await Stripe.createBillingSession(customer)
    console.log('session', session)

    res.json({ url: session.url })
})

app.post('/webhook', async(req, res) => {
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
})

const port = process.env.PORT || 4242

app.listen(port, () => console.log(`Listening on port ${port}!`))