const { canDeleteUser } = require('../config/permissions')
const alertTypes = require('../helpers/alertTypes')

module.exports = async function authDeleteUser(req, res, next) {
    if (canDeleteUser(req.user)) {
        return next()
    }
    req.session.message = `Not allowed to delete users.`
    req.session.alertType = alertTypes.WarningAlert
    res.status(401).redirect('/account')
}