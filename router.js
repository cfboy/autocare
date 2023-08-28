// Controllers
const stripeController = require('./src/controllers/stripeController'),
    authController = require('./src/controllers/authController'),
    userController = require('./src/controllers/userController'),
    locationController = require('./src/controllers/locationController'),
    dashboardsController = require('./src/controllers/dashboardsController'),
    historyController = require('./src/controllers/historyController'),
    carsController = require('./src/controllers/carsController'),
    servicesController = require('./src/controllers/servicesController'),
    reportsController = require('./src/controllers/reportsController'),
    subscriptionsController = require('./src/controllers/subscriptionsController')

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
    authDeleteService,
    authValidateMembership,
    authChangePassword,
    authChangePrices } = require('./src/middleware/authFunctions')

const { validateSubscriptions, validateLocation, validateSelectCurrectLocation, validateActiveAccount } = require('./src/middleware/validateFunctions')


// Main Route
router.get('/', checkAuthenticated, validateActiveAccount, (req, res) => {
    res.redirect('/account')
})

//------ Dashboard Routes ------

router.get('/home', dashboardsController.home)

router.get('/termsandconditions', dashboardsController.termsAndConditions)

router.get('/account', checkAuthenticated, validateActiveAccount, validateLocation, dashboardsController.account)

//------ Auth Routes ------

router.get('/login', checkNotAuthenticated, (req, res) => {

    let { message, email, alertType } = req.session

    // Clear session alerts variables.
    if (message) {
        req.session.message = ''
        req.session.alertType = ''
    }
    // TODO: Optimize this approach.
    if (req.flash('error')[0] == 'VALIDATION')
        res.redirect('/activateAccountRequest')
    else
        res.render('auth/login.ejs', { message, email, alertType })
})

router.post('/login', checkNotAuthenticated, authController.login)

router.get('/auth/google', authController.googleLogin);
router.get('/auth/google/callback', authController.googleCallBack);
router.get('/connectGoogleAccount', authController.connectGoogleAccount);

router.get('/create-account', checkNotAuthenticated, authController.createAccount)

router.post('/register', checkNotAuthenticated, authController.register)

// Activate account
router.get('/activateAccountRequest', authController.activateAccountRequest)
router.post('/activateAccountRequest', authController.activateAccountRequestController)
router.get('/activateAccount', authController.activateAccountForm)
router.post('/activateAccount', authController.activateAccount)

router.get('/logout', checkAuthenticated, authController.logout)

router.delete('/logout', checkAuthenticated, authController.logout)

router.get('/selectLocation', checkAuthenticated, authController.selectLocation)

router.post('/changeLocation', checkAuthenticated, authController.changeLocation)

//------ Forgot Password Routes ------
router.get('/resetPasswordRequest', checkNotAuthenticated, authController.resetPasswordRequest)
router.get('/resetPassword', checkNotAuthenticated, authController.resetPassword)
router.post("/resetPasswordRequest", checkNotAuthenticated, authController.resetPasswordRequestController);
router.post("/resetPassword", checkNotAuthenticated, authController.resetPasswordController);

//------ History Routes ------
router.get('/history', checkAuthenticated, validateLocation, historyController.history)
router.get('/activity', checkAuthenticated, validateLocation, historyController.activity)

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
router.get('/cars', checkAuthenticated, validateLocation, carsController.cars)
router.get('/car/:id', checkAuthenticated, carsController.view)
router.get('/cars/create', checkAuthenticated, authAddCar, carsController.create)
router.get('/edit-car/:id', checkAuthenticated, authEditCar, carsController.edit)

router.post('/syncUtilization', checkAuthenticated, carsController.syncUtilization)

//------ Subscriptions/Memberships Routes ------
router.get('/memberships', checkAuthenticated, validateSubscriptions, subscriptionsController.memberships)
router.get('/validateMembership', checkAuthenticated, authValidateMembership, subscriptionsController.validateMembership)
router.post('/validateMembership', checkAuthenticated, authValidateMembership, subscriptionsController.validate)
router.post('/carcheck', subscriptionsController.carCheck)
router.post('/readingData', subscriptionsController.readingData)
router.get('/create-subscriptions', checkAuthenticated, subscriptionsController.createSubscriptions)
router.get('/subscribe', subscriptionsController.subscribe)
router.get('/handleInvalidSubscriptions', checkAuthenticated, subscriptionsController.handleInvalidSubscriptions)
router.post('/confirmValidCars', checkAuthenticated, subscriptionsController.confirmValidCars)
router.post('/syncSubscription', checkAuthenticated, subscriptionsController.syncSubscription)
router.post('/syncCustomerSubscriptions', checkAuthenticated, subscriptionsController.syncCustomerSubscriptions)
router.post('/removeCar', checkAuthenticated, subscriptionsController.removeCarOfSubscription)


router.post('/cars/create', checkAuthenticated, authAddCar, carsController.save)
router.post('/edit-car', checkAuthenticated, authEditCar, carsController.update)
router.get('/delete-car/:id', checkAuthenticated, authDeleteCar, carsController.delete)

// router.post('/clearQueue', checkAuthenticated, subscriptionsController.clearQueue)
router.post('/validatePlate', carsController.validatePlate)
router.post('/validateEmail', userController.validateEmail)
router.post('/removeFromCart', userController.removeFromCart)
router.post('/cancelOrder', userController.cancelOrder)

//------ Services Routes ------
router.get('/services', checkAuthenticated, servicesController.services)
router.get('/service/:id', checkAuthenticated, servicesController.view)
router.post('/useService', checkAuthenticated, authValidateMembership, servicesController.useService)
router.get('/delete-service/:id', checkAuthenticated, authDeleteService, servicesController.delete)

//------ Location Routes ------
router.get('/locations', checkAuthenticated, locationController.locations)
router.get('/getCurrentLocation', checkAuthenticated, validateSelectCurrectLocation, locationController.getCurrentLocation)
router.get('/create-location', checkAuthenticated, locationController.createLocation)
router.get('/view-location/:id', checkAuthenticated, locationController.viewLocation)
router.get('/edit-location/:id', checkAuthenticated, authEditLocation, locationController.editLocation)

//------ Location CRUDS ------
router.post('/create-location', checkAuthenticated, locationController.save)
router.post('/edit-location', checkAuthenticated, authEditLocation, locationController.update)
router.get('/delete-location/:id', checkAuthenticated, authDeleteLocation, locationController.delete)

// ---------------------------------------

router.get('/reports', checkAuthenticated, reportsController.reports)
router.get('/reports/:id', checkAuthenticated, reportsController.viewReport)
router.get('/create-report', checkAuthenticated, reportsController.createReport)
router.get('/edit-report/:id', checkAuthenticated, reportsController.editReport)

router.post('/create-report', checkAuthenticated, reportsController.save)
router.post('/edit-report', checkAuthenticated, reportsController.update)
router.get('/delete-report/:id', checkAuthenticated, reportsController.delete)

router.post('/getGrossVolumeDistributedReport', checkAuthenticated, reportsController.getGrossVolumeDistributedReport)

//------ Stripe and Payment Routes ------
router.get('/charges', checkAuthenticated, stripeController.charges)
router.get('/invoices', checkAuthenticated, stripeController.invoices)
router.post('/changePrices', checkAuthenticated, authChangePrices, stripeController.changePrice)



router.post('/webhook', stripeController.webhook)

router.post('/checkout', checkAuthenticated, stripeController.checkout)
router.post('/checkoutWithEmail', stripeController.checkoutWithEmail)

router.get('/completeCheckoutSuccess', stripeController.completeCheckoutSuccess)

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