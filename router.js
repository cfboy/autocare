require('./src/connect/mongodb') //Connection to MongoDB
const Stripe = require('./src/connect/stripe')
const setCurrentUser = require('./src/middleware/setCurrentUser')
const hasPlan = require('./src/middleware/hasPlan')
const auth = require('./src/controllers/auth')
const userController = require('./src/controllers/user')
const dashboards = require('./src/controllers/dashboards')

const express = require('express');
const router = express.Router();

const productToPriceMap = {
    basic: process.env.PRODUCT_BASIC,
    pro: process.env.PRODUCT_PRO
}

// Main Route
router.get('/', function(req, res) {

    // If the session is active then redirect to the account.
    if (req.session.user) {
        res.redirect('/account')
    } else {
        // Get Message and Type for alerts
        let { message, email, alertType } = req.session

        // Destroy the session if exist anny message.
        if (message)
            req.session.destroy()

        res.render('login.ejs', { message, email, alertType })
    }
})


//------ Auth Routes ------
router.post('/login', auth.login)

router.get('/create-account', function(req, res) {
    res.render('register.ejs')
})

router.post('/register', auth.register)

router.get('/logout', auth.logout)

// TODO: Move to Stripe Controller
router.post('/webhook', auth.webhook)

//------ User Routes ------
router.get('/create-user', userController.createUser)
router.get('/view-user/:id', userController.viewUser)
router.get('/edit-user/:id', userController.editUser)

//------ USER CRUDS ------
router.post('/create-user', userController.save)
router.post('/edit-user', userController.update)
router.get('/delete-user/:id', userController.delete)


//------ Dashboard Routes ------
router.get('/account', dashboards.account)

// ---------------------------------------

// TODO: Move to Stripe Controller
//------ Payment Routes ------
router.post('/checkout', setCurrentUser, async(req, res) => {
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

router.post('/billing', setCurrentUser, async(req, res) => {
    const { customer } = req.body
    console.log('customer', customer)

    const session = await Stripe.createBillingSession(customer)
    console.log('session', session)

    res.json({ url: session.url })
})

// ---------------------------------------

router.get('/none', [setCurrentUser, hasPlan('none')], async function(
    req,
    res,
    next
) {
    res.status(200).render('none.ejs')
})

router.get('/basic', [setCurrentUser, hasPlan('basic')], async function(
    req,
    res,
    next
) {
    res.status(200).render('basic.ejs')
})

router.get('/pro', [setCurrentUser, hasPlan('pro')], async function(
    req,
    res,
    next
) {
    res.status(200).render('pro.ejs')
})


module.exports = router;