// Controllers
const stripeController = require('./src/controllers/stripeController'),
    authController = require('./src/controllers/authController'),
    userController = require('./src/controllers/userController'),
    locationController = require('./src/controllers/locationController'),
    dashboardsController = require('./src/controllers/dashboardsController'),
    historyController = require('./src/controllers/historyController'),
    carsController = require('./src/controllers/carsController'),
    servicesController = require('./src/controllers/servicesController'),
    reportsController = require('./src/controllers/reportsController')

// Express
const express = require('express');
const router = express.Router();

// Middleware helpers 
const { checkAuthenticated,
    checkNotAuthenticated,
    authDeleteLocation,
    authEditLocation,
    authAddCar,
    authEditCar,
    authDeleteUser,
    authDeleteCar,
    authValidateMembership,
    authChangePassword } = require('./src/middleware/authFunctions')

// Main Route
router.get('/', checkAuthenticated, (req, res) => {
    res.redirect('/account')
})

//------ Dashboard Routes ------

router.get('/home', dashboardsController.home)

router.get('/account', checkAuthenticated, dashboardsController.account)

router.get('/create-subscriptions', checkAuthenticated, dashboardsController.createSubscriptions)

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

router.get('/create-account', checkNotAuthenticated, authController.createAccount)

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
router.get('/customers', checkAuthenticated, userController.customers)
router.get('/create-user', checkAuthenticated, userController.createUser)
router.get('/customers/:id', checkAuthenticated, userController.viewUser)
router.get('/edit-user/:id', checkAuthenticated, userController.editUser)
router.get('/changePassword/:id', checkAuthenticated, authChangePassword, userController.changePassword)

//------ USER CRUDS ------
router.post('/create-user', checkAuthenticated, userController.save)
router.post('/edit-user', checkAuthenticated, userController.update)
router.post('/changePassword', checkAuthenticated, authChangePassword, userController.updatePassword)
router.get('/delete-user/:id', checkAuthenticated, authDeleteUser, userController.delete)

router.get('/notifications', checkAuthenticated, userController.notifications)
router.post('/changeNotificationState', checkAuthenticated, userController.changeNotificationState)

//------ Cars Routes ------
router.get('/cars', checkAuthenticated, carsController.cars)
router.get('/car/:id', checkAuthenticated, carsController.view)
router.get('/cars/create', checkAuthenticated, authAddCar, carsController.create)
router.get('/edit-car/:id', checkAuthenticated, authEditCar, carsController.edit)

router.post('/cars/create', checkAuthenticated, authAddCar, carsController.save)
router.post('/edit-car', checkAuthenticated, authEditCar, carsController.update)
router.get('/delete-car/:id', checkAuthenticated, authDeleteCar, carsController.delete)

router.post('/validatePlate', checkAuthenticated, carsController.validatePlate)

//------ Services Routes ------
router.get('/services', checkAuthenticated, servicesController.services)
router.get('/service/:id', checkAuthenticated, servicesController.view)

//------ Location Routes ------
router.get('/locations', checkAuthenticated, locationController.locations)
router.get('/create-location', checkAuthenticated, locationController.createLocation)
router.get('/view-location/:id', checkAuthenticated, locationController.viewLocation)
router.get('/edit-location/:id', checkAuthenticated, authEditLocation, locationController.editLocation)

//------ Location CRUDS ------
router.post('/create-location', checkAuthenticated, locationController.save)
router.post('/edit-location', checkAuthenticated, authEditLocation, locationController.update)
router.get('/delete-location/:id', checkAuthenticated, authDeleteLocation, locationController.delete)

router.get('/validateMembership', checkAuthenticated, authValidateMembership, dashboardsController.validateMembership)
router.post('/validateMembership', checkAuthenticated, authValidateMembership, dashboardsController.validate)
router.post('/useService', checkAuthenticated, authValidateMembership, dashboardsController.useService)

router.post('/carcheck', dashboardsController.carCheck)

// ---------------------------------------

router.get('/reports', checkAuthenticated, reportsController.reports)
router.get('/reports/:id', checkAuthenticated, reportsController.viewReport)
router.get('/create-report', checkAuthenticated, reportsController.createReport)
router.get('/edit-report/:id', checkAuthenticated, reportsController.editReport)

router.post('/create-report', checkAuthenticated, reportsController.save)
router.post('/edit-report', checkAuthenticated, reportsController.update)
router.get('/delete-report/:id', checkAuthenticated, reportsController.delete)


//------ Stripe and Payment Routes ------
router.get('/charges', checkAuthenticated, stripeController.charges)

router.post('/webhook', stripeController.webhook)

router.post('/checkout', checkAuthenticated, stripeController.checkout)

router.get('/completeCheckoutSuccess', checkAuthenticated, stripeController.completeCheckoutSuccess)

router.get('/stripeCheckout', stripeController.stripeCheckout)

router.post('/billing', checkAuthenticated, stripeController.billing)

// ---------------------------------------
// if (process.env.NODE_ENV !== 'production') {
// The last route for not found pages.
// router.get('*', (req, res) =>
//     // res.send('Page Not found 404')
//     res.status(404).redirect('/account')

// );
// }


module.exports = router;