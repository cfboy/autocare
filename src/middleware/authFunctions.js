const { canDeleteCar,
    canEditCar,
    canDeleteLocation,
    canEditLocation,
    canDeleteUser,
    canValidateMemberships,
    canChangePassword } = require('../config/permissions'),
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

    if (carID && canDeleteCar(req.user, carID)) {
        return next()
    }
    req.session.message = `Not allowed to delete this car.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/cars')
}

async function authEditCar(req, res, next) {
    let carID = req.body.id ? req.body.id : req.params.id ? req.params.id : ''

    if (carID && canEditCar(req.user, carID)) {
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

module.exports = {
    checkAuthenticated,
    checkNotAuthenticated,
    authDeleteCar,
    authEditCar,
    authDeleteLocation,
    authEditLocation,
    authDeleteUser,
    authValidateMembership,
    authChangePassword
}