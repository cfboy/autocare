const HistoryService = require('../collections/history')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')
const bcrypt = require('bcrypt');
const Roles = require('../config/roles')

// ------------------------------- CRUDS ------------------------------- 

exports.activity = async(req, res) => {
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
}

// ------------------------------- Create -------------------------------
exports.history = async(req, res) => {
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
}

// ------------------------------- Read -------------------------------
// Route for view user info.
exports.viewHistory = async(req, res) => {
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
            const canView = (isMyActivity || req.user.role == Roles.ADMIN)
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
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

// ------------------------------- Delete -------------------------------
exports.delete = async(req, res) => {
    console.log('Deleting User...')
    const id = req.params.id

    try {
        UserService.deleteUser(id)
            // Set the message for alert. 
        req.session.message = `User Deleted.`
        req.session.alertType = alertTypes.CompletedActionAlert
        res.redirect('/account')
    } catch (error) {
        console.log(`ERROR on user.js delete: ${error.message}`)
        req.session.message = "Can't delete user."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')

    }
}