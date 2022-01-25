const { canDeleteLocation } = require('../config/permissions')
const alertTypes = require('../helpers/alertTypes')

module.exports = async function authDeleteLocation(req, res, next) {
    if (canDeleteLocation(req.user)) {
        return next()
    }
    req.session.message = `Not allowed to delete locations.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/account')
}