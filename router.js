// Connections
require('./src/connect/mongodb') //Connection to MongoDB

// Controllers
const stripeController = require('./src/controllers/stripeController')
const authController = require('./src/controllers/authController')
const userController = require('./src/controllers/userController')
const locationController = require('./src/controllers/locationController')
const dashboardsController = require('./src/controllers/dashboardsController')
const historyController = require('./src/controllers/historyController')

// Express
const express = require('express');
const router = express.Router();

// Middleware helpers
const checkAuthenticated = require('./src/middleware/checkAuthenticated')
const checkNotAuthenticated = require('./src/middleware/checkNotAuthenticated')
const hasPlan = require('./src/middleware/hasPlan')
const authDeleteLocation = require('./src/middleware/authDeleteLocation')
const authDeleteUser = require('./src/middleware/authDeleteUser')

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

    res.render('auth/login.ejs', { message, email, alertType })
})

router.post('/login', checkNotAuthenticated, authController.login)

router.get('/create-account', checkNotAuthenticated, (req, res) => {
    res.render('auth/register.ejs')
})

router.post('/register', checkNotAuthenticated, authController.register)
router.delete('/logout', checkAuthenticated, authController.logout)

//------ History Routes ------
router.get('/history', checkAuthenticated, historyController.history)
router.get('/activity', checkAuthenticated, historyController.activity)

router.get('/history/:id', checkAuthenticated, historyController.viewHistory)

//------ History CRUDS ------
router.post('/create-history', checkAuthenticated, historyController.save)
router.get('/delete-history/:id', checkAuthenticated, authDeleteUser, historyController.delete)


//------ User Routes ------
router.get('/users', checkAuthenticated, userController.users)
router.get('/create-user', checkAuthenticated, userController.createUser)
router.get('/view-user/:id', checkAuthenticated, userController.viewUser)
router.get('/edit-user/:id', checkAuthenticated, userController.editUser)

//------ USER CRUDS ------
router.post('/create-user', checkAuthenticated, userController.save)
router.post('/edit-user', checkAuthenticated, userController.update)
router.get('/delete-user/:id', checkAuthenticated, authDeleteUser, userController.delete)


//------ Location Routes ------
router.get('/locations', checkAuthenticated, locationController.locations)
router.get('/create-location', checkAuthenticated, locationController.createLocation)
router.get('/view-location/:id', checkAuthenticated, locationController.viewLocation)
router.get('/edit-location/:id', checkAuthenticated, locationController.editLocation)

//------ Location CRUDS ------
router.post('/create-location', checkAuthenticated, locationController.save)
router.post('/edit-location', checkAuthenticated, locationController.update)
router.get('/delete-location/:id', checkAuthenticated, authDeleteLocation, locationController.delete)

//------ Dashboard Routes ------
router.get('/account', checkAuthenticated, dashboardsController.account)

// ---------------------------------------

//------ Stripe and Payment Routes ------
router.post('/webhook', stripeController.webhook)

router.post('/checkout', checkAuthenticated, stripeController.checkout)

router.post('/billing', checkAuthenticated, stripeController.billing)

// ---------------------------------------

router.get('/none', [checkAuthenticated, hasPlan('none')], async function(
    req,
    res,
    next
) {
    res.status(200).render('none.ejs')
})

router.get('/basic', [checkAuthenticated, hasPlan('basic')], async function(
    req,
    res,
    next
) {
    res.status(200).render('basic.ejs')
})

router.get('/pro', [checkAuthenticated, hasPlan('pro')], async function(
    req,
    res,
    next
) {
    res.status(200).render('pro.ejs')
})

if (process.env.NODE_ENV !== 'production') {
    // The last route for not found pages.
    router.get('*', (req, res) =>
        // res.send('Page Not found 404')
        res.status(404).redirect('/account')

    );
}


module.exports = router;