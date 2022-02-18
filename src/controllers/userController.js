const UserService = require('../collections/user')
const { ROLES } = require('../collections/user/user.model')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')
const bcrypt = require('bcrypt');


// ------------------------------- Create -------------------------------

/**
 * This function render all users except the current user.
 * If the current user is ROLE.MANAGER then find only CUSTOMERS users.
 * @param {*} req 
 * @param {*} res 
 */
exports.users = async (req, res) => {
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
            let users
            if (user.role == ROLES.MANAGER)
                users = await UserService.getUsersPerRole(req, ROLES.CUSTOMER)
            else
                if (user.role == ROLES.ADMIN)
                    users = await UserService.getUsers(user.id)


            res.render('user/index.ejs', { user, users, message, alertType })

        }
    } catch (error) {
        console.error("ERROR: userController -> Tyring to find users.")
        console.error(error.message)
        req.session.message = 'Error tyring to find users.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

/**
 * This function renders the create user form.
 * @param {*} req 
 * @param {*} res 
 */
exports.createUser = async (req, res) => {
    let { message, alertType } = req.session
    let selectRoles = []
    // clear message y alertType
    req.session.message = ''
    req.session.alertType = ''
    const isAdmin = req.user.role === ROLES.ADMIN

    if (ROLES) {
        if (isAdmin)
            selectRoles = Object.entries(ROLES)
        else {
            // If the current user role is not ADMIN, then the only users they can create are Customers.
            const { CUSTOMER } = ROLES
            const subset = { CUSTOMER }
            selectRoles = Object.entries(subset)
        }

        res.render('user/create.ejs', { user: req.user, message, alertType, selectRoles })
    }
}

/**
 * This function save/create the new user.
 * @param {*} req 
 * @param {*} res 
 */
exports.save = async (req, res) => {
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
                city: fields.city
            })

            console.log(`A new user added to DB. The ID for ${user.email} is ${user.id}`)

            req.session.message = `User Created ${user.email}.`
            req.session.alertType = alertTypes.CompletedActionAlert
            req.flash('info', 'User created.')
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
        console.error(error.message)
        req.session.message = "Error trying to create user."
        req.session.alertType = alertTypes.ErrorAlert
        // res.status(400).send(error)
        res.redirect('/account')
    }
}

/**
 * This function renders the user information.
 * Find by billingID when the call comes from validate membership.
 * @param {*} req 
 * @param {*} res 
 */
exports.viewUser = async (req, res) => {
    try {
        let { message, alertType } = req.session,
            findByBillingID = req?.query?.billingID ? true : false

        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        let id = req.params.id, customer
        if (findByBillingID)
            customer = await UserService.getUserByBillingID(id)
        else
            customer = await UserService.getUserById(id)

        let isMyProfile = false

        if (customer) {
            isMyProfile = (req.user.id === customer.id)
            if (customer.billingID) {
                customer = await Stripe.setStripeInfoToUser(customer)
            }

            res.status(200).render('user/view.ejs', {
                user: req.user,
                isMyProfile,
                customer,
                stripeSubscription: customer?.stripe?.subscription,
                membershipStatus: customer?.stripe?.subscription ? customer?.stripe?.subscription?.status : Stripe.STATUS.NONE,
                message,
                alertType
            })
        } else {
            message = 'Customer not found.'
            alertType = alertTypes.ErrorAlert
            console.log('Customer not found.')
            res.redirect('/users', { message, alertType })
        }
    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render the user information."
        req.session.alertType = alertTypes.ErrorAlert
        // res.status(400).send(error)
        res.redirect('/account')

    }
}

/**
 * This function renders the edit user form.
 * @param {*} req 
 * @param {*} res 
 */
exports.editUser = async (req, res) => {
    try {
        const id = req.params.id;
        const url = req.query.url ? req.query.url : '/account'
        const customer = await UserService.getUserById(id)

        if (customer) {
            if (ROLES)
                selectRoles = Object.entries(ROLES)

            res.status(200).render('user/edit.ejs', { user: req.user, customer, selectRoles, url: (url == '/users' || url == '/account' || url == '/validateMembership') ? url : `${url}/${id}` })
        } else {
            console.log('User not found.')
            res.redirect(`${url}`)
        }
    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render edit user form."
        req.session.alertType = alertTypes.ErrorAlert
        // res.status(400).send(error)
        res.redirect('/account')
    }
}

/**
 * This function renders the change password form.
 * @param {*} req 
 * @param {*} res 
 */
exports.changePassword = async (req, res) => {
    try {
        const id = req.params.id;
        const url = req.query.url ? req.query.url : '/account'
        const customer = await UserService.getUserById(id)

        if (customer) {
            res.status(200).render('user/changePassword.ejs', { user: req.user, customer, url: (url == '/users' || url == '/account' || url == '/validateMembership') ? url : `${url}/${id}` })
        } else {
            console.log('User not found.')
            res.redirect(`${url}`)
        }
    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render change password form."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

/**
 * This function updates the user object with new properties.
 * @param {*} req 
 * @param {*} res 
 */
exports.update = async (req, res) => {
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

/**
 * This function updates the user password.
 * @param {*} req 
 * @param {*} res 
 */
exports.updatePassword = async (req, res) => {
    const url = req.query.url
    try {
        req.body.password = await bcrypt.hash(req.body.password, 10)

        const user = await UserService.updateUser(req.body.id, req.body)

        if (!user) {
            req.session.message = `Can't update User  ${req.body.email}`
            req.session.alertType = alertTypes.WarningAlert
        } else {
            req.flash('info', 'Password Updated Completed.')
            req.session.message = `Password updated ${user.email}`
            req.session.alertType = alertTypes.CompletedActionAlert
        }
        res.redirect(`${url}`)

    } catch (error) {
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect(`${url}`)
    }
}

/**
 * This function delete the user object.
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
    } catch (error) {
        console.log(`ERROR: ${error.message}`)
        req.session.message = "Error trying to delete user."
        req.session.alertType = alertTypes.ErrorAlert
    }

    try {
        HistoryService.addHistory("User deleted", historyTypes.USER_ACTION, req.user, null)
    } catch (error) {
        console.debug(`ERROR: userController: ${error.message}`)
        req.session.message = "Can't add delete user action to History."
        req.session.alertType = alertTypes.ErrorAlert
    }
    res.redirect('/users')
}