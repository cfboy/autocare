const { canValidateMemberships } = require('../config/permissions')
const alertTypes = require('../helpers/alertTypes')

module.exports = async function authValidateMembership(req, res, next) {
    if (canValidateMemberships(req.user)) {
        return next()
    }
    req.session.message = `Not allowed to validate membership.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/account')
}