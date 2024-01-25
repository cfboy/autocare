const HistoryService = require('../collections/history')
const alertTypes = require('../helpers/alertTypes')
const { ROLES } = require('../collections/user/user.model')

/**
 * This function render the current user history.
 * @param {*} req 
 * @param {*} res 
 */
exports.activity = async (req, res) => {
    try {
        // Message for alerts
        let { message, alertType } = req.session

        // clear message y alertType
        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        // Passport store the user in req.user
        let user = req.user

        if (!user) {
            res.redirect('/')
        } else {

            let historial = await HistoryService.getMyHistory(req.user)

            res.render('history/index.ejs', { user, historial, message, alertType })

        }
    } catch (error) {
        console.error(`ERROR: historyController -> Trying to find My Activity. ${error.message}`)
        req.session.message = 'Error trying to find My Activity.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

/**
 * This function render all history log.
 * @param {*} req 
 * @param {*} res 
 */
exports.history = async (req, res) => {
    try {
        // Message for alerts
        let { message, alertType } = req.session

        // clear message y alertType
        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        // Passport store the user in req.user
        let user = req.user

        if (!user) {
            res.redirect('/')
        } else {
            let historial = await HistoryService.getHistory()

            res.render('history/index.ejs', { user, historial, message, alertType })

        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: historyController -> Trying to find History Log. ${error.message}`)
        req.session.message = 'Error trying to find History Log.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

/**
 * This function render the specific Hisitory details.
 * @param {*} req 
 * @param {*} res 
 */
exports.viewHistory = async (req, res) => {
    try {
        let { message, alertType } = req.session

        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        const id = req.params.id;
        const history = await HistoryService.getHistoryById(id)
        var isMyActivity = false
        if (history) {
            isMyActivity = (req.user.id === history.user.id)
            const canView = (isMyActivity || req.user.role == ROLES.ADMIN)
            if (canView) {
                res.status(200).render('history/view.ejs', { user: req.user, isMyActivity, history, message, alertType })
            } else {
                req.session.message = "Can't view this actitiy."
                req.session.alertType = alertTypes.WarningAlert
                res.redirect('/account')

            }
        } else {
            console.log('History not found.')
            res.redirect('/account')
        }
    } catch (error) {
        console.error(`ERROR: historyController -> Trying to view History details. ${error.message}`)
        req.session.message = 'Error trying to view History details.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

/**
 * This function is for delete history object.
 * @param {*} req 
 * @param {*} res 
 */
exports.delete = async (req, res) => {
    console.debug('Deleting User...')
    const id = req.params.id

    try {
        UserService.deleteUser(id)
        // Set the message for alert. 
        req.session.message = `User Deleted.`
        req.session.alertType = alertTypes.CompletedActionAlert
        res.redirect('/account')
    } catch (error) {
        console.log(`ERROR: historyController -> ${error.message}`)
        req.session.message = "Can't delete user."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')

    }
}