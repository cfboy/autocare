const HistoryService = require('../collections/history')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')
const Roles = require('../config/roles')
const bcrypt = require('bcrypt');

// ------------------------------- CRUDS ------------------------------- 


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

// TODO: Test this method. NOT FINISHED
exports.save = async(req, res) => {
    const fields = req.body
    try {
        console.log('Creating New User: ', fields.email)

        let user = await UserService.getUserByEmail(fields.email)
        let customerInfo = {}

        if (!user) {
            console.log(`Email ${fields.email} does not exist. Making one...`)
            customerInfo = await Stripe.getCustomerByEmail(fields.email)
            if (!customerInfo) {
                customerInfo = await Stripe.addNewCustomer(fields.email, fields.firstName,
                    fields.lastName,
                    fields.phoneNumber,
                    fields.city)
            }

            var hashPassword = await bcrypt.hash(fields.password, 10)

            user = await UserService.addUser({
                email: fields.email,
                password: hashPassword,
                billingID: customerInfo.id,
                role: fields.role,
                firstName: fields.firstName,
                lastName: fields.lastName,
                phoneNumber: fields.phoneNumber,
                dateOfBirth: fields.dateOfBirth,
                city: fields.city,
                brand: fields.brand,
                model: fields.model,
                plate: fields.plate,
                plan: 'none',
                endDate: null
            })

            console.log(
                `A new user added to DB. The ID for ${user.email} is ${user.id}`
            )

            req.session.message = `User Created ${user.email}.`
            req.session.alertType = alertTypes.CompletedActionAlert

            res.redirect('/users')

        } else {
            let message = `That email ${user.email} already exist.`
            console.log(`The existing ID for ${user.email} is ${user.id}`)

            // Set the message for alert. 
            req.session.message = message
            req.session.alertType = alertTypes.WarningAlert
            res.redirect('/create-user')
        }
    } catch (error) {
        // console.error(error.message)
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
            // res.status(400).send(error)
        res.redirect('/account')
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
        const customer = await UserService.getUserById(id)
        var isMyProfile = false
        if (customer) {
            isMyProfile = (req.user.id === customer.id)
            res.status(200).render('user/view.ejs', { user: req.user, isMyProfile, customer, message, alertType })
        } else {
            console.log('Customer not found.')
            res.redirect('/users')
        }
    } catch (error) {
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
            // res.status(400).send(error)
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