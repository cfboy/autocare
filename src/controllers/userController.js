const UserService = require('../collections/user')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')
const Roles = require('../config/roles')
const bcrypt = require('bcrypt');

// ------------------------------- CRUDS ------------------------------- 


// ------------------------------- Create -------------------------------

// Route for create user.
exports.createUser = async(req, res) => {
    let { message, alertType } = req.session
    let selectRoles = []
        // clear message y alertType
    req.session.message = ''
    req.session.alertType = ''

    if (Roles)
        selectRoles = Object.entries(Roles)

    // const map = new Map(Object.entries(roles))

    res.render('user/create.ejs', { user: req.user, message, alertType, selectRoles })
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

            res.redirect('/account')

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
exports.viewUser = async(req, res) => {
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
            res.status(200).render('user/index.ejs', { user: req.user, isMyProfile, customer, message, alertType })
        } else {
            console.log('Customer not found.')
            res.redirect('/account')
        }
    } catch (error) {
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
            // res.status(400).send(error)
        res.redirect('/account')

    }
}

// ------------------------------- Update -------------------------------

// Route for view/edit user info.
exports.editUser = async(req, res) => {
    try {
        const id = req.params.id;
        const url = req.query.url ? req.query.url : '/account'
        const customer = await UserService.getUserById(id)

        if (customer) {
            res.status(200).render('user/edit.ejs', { user: req.user, customer, url: url == '/account' ? url : `${url}/${id}` })
        } else {
            console.log('User not found.')
            res.redirect(`${url}`)
        }
    } catch (error) {
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
            // res.status(400).send(error)
        res.redirect('/account')
    }
}

// TODO: Manage membership 
exports.update = async(req, res) => {
    const updates = Object.keys(req.body)
        // TODO: Implement allowedUpdates per ROLE.
        // const allowedUpdates = ['name', 'email']
        // const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
        // if (!isValidOperation) {

    // return res.status(400).send('Invalid updates!')
    // }
    const url = req.query.url
    try {
        const user = await UserService.updateUser(req.body.id, req.body)

        if (!user) {
            req.session.message = `Can't update User  ${req.body.email}`
            req.session.alertType = alertTypes.WarningAlert
                // return res.status(404).send()

        } else {
            req.flash('info', 'Update Completed.')
            req.session.message = `User updated ${user.email}`
            req.session.alertType = alertTypes.CompletedActionAlert
        }
        // res.status(201).send(user)
        res.redirect(`${url}`)


    } catch (error) {
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
            // res.status(400).send(error)
        res.redirect(`${url}`)

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