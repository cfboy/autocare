const ServiceService = require('../collections/services')
const UserService = require('../collections/user')
const SubscriptionService = require('../collections/subscription')
const { canDeleteCar,
    canEditCar,
    canDeleteLocation,
    canAddCar,
    canEditLocation,
    canDeleteUser,
    canValidateMemberships,
    canChangePassword,
    canDeleteService,
    isAdmin } = require('../config/permissions'),
    alertTypes = require('../helpers/alertTypes')


async function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    // req.flash('error', 'You needed to be logged in to visit that page!');

    res.redirect('/login')
}

async function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/account')
    }
    next()
}

async function authDeleteCar(req, res, next) {
    let carID = req.params.id
    let user = await SubscriptionService.setStripeInfoToUser(req.user)
    let services = await ServiceService.getServicesByCar(carID)

    if (carID && canDeleteCar(user, carID, services)) {
        return next()
    }
    req.session.message = `Not allowed to delete this car.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/cars')
}

async function authAddCar(req, res, next) {

    let user = req.user

    if (req.query?.userID) { // This is come from GET route.
        user = await UserService.getUserById(req.query?.userID)
    } else if (req.body.userID) { // This is come from POST rout.
        user = await UserService.getUserById(req.body.userID)
    }

    user = await SubscriptionService.setStripeInfoToUser(user)

    if (canAddCar(user)) {
        return next()
    }
    req.session.message = `Not allowed to add a car.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/account')
}

async function authEditCar(req, res, next) {
    let carID = req.body.id ? req.body.id : req.params.id ? req.params.id : ''
    let user = req.user

    let services = await ServiceService.getServicesByCar(carID)

    if (carID && canEditCar(user, carID, services)) {
        return next()
    }
    req.session.message = `Not allowed to edit this car.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/cars')
}

async function authDeleteLocation(req, res, next) {
    if (canDeleteLocation(req.user)) {
        return next()
    }
    req.session.message = `Not allowed to delete locations.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/locations')
}

async function authEditLocation(req, res, next) {
    if (canEditLocation(req.user)) {
        return next()
    }
    req.session.message = `Not allowed to edit this location.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/locations')
}

async function authDeleteUser(req, res, next) {
    if (canDeleteUser(req.user)) {
        return next()
    }
    req.session.message = `Not allowed to delete users.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/account')
}

async function authValidateMembership(req, res, next) {
    if (canValidateMemberships(req.user)) {
        return next()
    }
    req.session.message = `Not allowed to validate membership.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/account')
}

async function authChangePassword(req, res, next) {
    let userID = req.body.id ? req.body.id : req.params.id ? req.params.id : ''

    if (userID && canChangePassword(req.user, userID)) {
        return next()
    }
    req.session.message = `Not allowed to change password.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/account')
}

async function authDeleteService(req, res, next) {
    if (canDeleteService(req.user)) {
        return next()
    }
    req.session.message = `Not allowed to delete this service.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/services')
}

async function authChangePrices(req, res, next) {
    if (isAdmin(req.user)) {
        return next()
    }
    req.session.message = `Not allowed to change prices.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/account')
}

module.exports = {
    checkAuthenticated,
    checkNotAuthenticated,
    authAddCar,
    authDeleteCar,
    authEditCar,
    authDeleteLocation,
    authEditLocation,
    authDeleteUser,
    authValidateMembership,
    authChangePassword,
    authDeleteService,
    authChangePrices
}