// Connections
require('./src/connect/mongodb') //Connection to MongoDB

// Controllers
const stripeController = require('./src/controllers/stripeController'),
    authController = require('./src/controllers/authController'),
    userController = require('./src/controllers/userController'),
    locationController = require('./src/controllers/locationController'),
    dashboardsController = require('./src/controllers/dashboardsController'),
    historyController = require('./src/controllers/historyController'),
    carsController = require('./src/controllers/carsController')

// Express
const express = require('express');
const router = express.Router();

// Middleware helpers 
const { checkAuthenticated,
    checkNotAuthenticated,
    authDeleteLocation,
    authEditLocation,
    authEditCar,
    authDeleteUser,
    authDeleteCar,
    authValidateMembership } = require('./src/middleware/authFunctions'),
    hasPlan = require('./src/middleware/hasPlan')

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
// router.post('/create-history', checkAuthenticated, historyController.save)
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

//------ Cars Routes ------
router.get('/cars', checkAuthenticated, carsController.cars)
router.get('/car/:id', checkAuthenticated, carsController.view)
router.get('/create-car', checkAuthenticated, carsController.create)
router.get('/edit-car/:id', checkAuthenticated, authEditCar, carsController.edit)

router.post('/create-car', checkAuthenticated, carsController.save)
router.post('/edit-car', checkAuthenticated, authEditCar, carsController.update)
router.get('/delete-car/:id', checkAuthenticated, authDeleteCar, carsController.delete)

//------ Location Routes ------
router.get('/locations', checkAuthenticated, locationController.locations)
router.get('/create-location', checkAuthenticated, locationController.createLocation)
router.get('/view-location/:id', checkAuthenticated, locationController.viewLocation)
router.get('/edit-location/:id', checkAuthenticated, authEditLocation, locationController.editLocation)

//------ Location CRUDS ------
router.post('/create-location', checkAuthenticated, locationController.save)
router.post('/edit-location', checkAuthenticated, authEditLocation, locationController.update)
router.get('/delete-location/:id', checkAuthenticated, authDeleteLocation, locationController.delete)

//------ Dashboard Routes ------
router.get('/account', checkAuthenticated, dashboardsController.account)

router.get('/validateMembership', checkAuthenticated, authValidateMembership, dashboardsController.validateMembership)
router.post('/validateMembership', checkAuthenticated, authValidateMembership, dashboardsController.validate)
router.post('/useService', checkAuthenticated, authValidateMembership, dashboardsController.useService)

// ---------------------------------------

//------ Stripe and Payment Routes ------
router.post('/webhook', stripeController.webhook)

router.post('/checkout', checkAuthenticated, stripeController.checkout)

router.post('/billing', checkAuthenticated, stripeController.billing)

// ---------------------------------------

router.get('/none', [checkAuthenticated, hasPlan('none')], async function (
    req,
    res,
    next
) {
    res.status(200).render('none.ejs')
})

router.get('/basic', [checkAuthenticated, hasPlan('basic')], async function (
    req,
    res,
    next
) {
    res.status(200).render('basic.ejs')
})

router.get('/pro', [checkAuthenticated, hasPlan('pro')], async function (
    req,
    res,
    next
) {
    res.status(200).render('pro.ejs')
})

// if (process.env.NODE_ENV !== 'production') {
// The last route for not found pages.
// router.get('*', (req, res) =>
//     // res.send('Page Not found 404')
//     res.status(404).redirect('/account')

// );
// }


module.exports = router;