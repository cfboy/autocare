// Connections
require('./src/connect/mongodb') //Connection to MongoDB
const Stripe = require('./src/connect/stripe')

// Controllers
const stripeController = require('./src/controllers/stripe.controller')
const auth = require('./src/controllers/auth')
const userController = require('./src/controllers/user')
const dashboards = require('./src/controllers/dashboards')

// Express
const express = require('express');
const router = express.Router();

// Middleware helpers
const setCurrentUser = require('./src/middleware/setCurrentUser')
const checkAuthenticated = require('./src/middleware/checkAuthenticated')
const checkNotAuthenticated = require('./src/middleware/checkNotAuthenticated')
const hasPlan = require('./src/middleware/hasPlan')


// Main Route
router.get('/', checkAuthenticated, (req, res) => {
    res.redirect('/account')
})

//------ Auth Routes ------

router.get('/login', checkNotAuthenticated, (req, res) => {

    let { message, email, alertType } = req.session

    // Clear session alerts variables.
    if (message) {
        req.session.message = ''
        req.session.alertType = ''
    }

    res.render('login.ejs', { message, email, alertType })
})

router.post('/login', checkNotAuthenticated, auth.login)

router.get('/create-account', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
})

router.post('/register', checkNotAuthenticated, auth.register)
router.delete('/logout', checkAuthenticated, auth.logout)

//------ User Routes ------
router.get('/create-user', checkAuthenticated, userController.createUser)
router.get('/view-user/:id', checkAuthenticated, userController.viewUser)
router.get('/edit-user/:id', checkAuthenticated, userController.editUser)

//------ USER CRUDS ------
router.post('/create-user', checkAuthenticated, userController.save)
router.post('/edit-user', checkAuthenticated, userController.update)
router.get('/delete-user/:id', checkAuthenticated, userController.delete)


//------ Dashboard Routes ------
router.get('/account', checkAuthenticated, dashboards.account)

// ---------------------------------------

//------ Stripe and Payment Routes ------
router.post('/webhook', stripeController.webhook)

router.post('/checkout', setCurrentUser, stripeController.checkout)

router.post('/billing', setCurrentUser, stripeController.billing)

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