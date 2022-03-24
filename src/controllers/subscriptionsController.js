const SubscriptionService = require('../collections/subscription')
const alertTypes = require('../helpers/alertTypes')

/**
 * This function renders the handle invalid subscriptions template.
 * @param {*} req 
 * @param {*} res 
 */
exports.handleInvalidSubscriptions = async (req, res) => {
    try {
        console.debug('handleInvalidSubscriptions')
        const user = req.user
        let { invalidSubs, message, alertType } = req.session

        // Clear session variables
        // TODO: Move to external function
        // req.session.invalidSubs = null
        req.session.message = null
        req.session.alertType = null


        res.status(200).render('subscriptions/handleInvalidSubscriptions.ejs', { user, message, alertType, invalidSubs })

    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render edit cars form."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/cars')
    }
}