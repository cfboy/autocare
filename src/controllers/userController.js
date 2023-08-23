const UserService = require('../collections/user')
const { ROLES } = require('../collections/user/user.model')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')
const bcrypt = require('bcrypt');
// const { municipalities } = require('../helpers/municipalities')
const CarService = require('../collections/cars')
const ServiceService = require('../collections/services')
const SubscriptionService = require('../collections/subscription')
const cars = require('../collections/cars')


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
        let userType = 'users' //This variable is used to compose the url to redirect on edit.
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
            let users = []

            if ([ROLES.ADMIN, ROLES.MANAGER].includes(user.role))
                // users = await UserService.getUsers(user.id)
                users = await UserService.getUsersExcludeRole(ROLES.CUSTOMER)

            res.render('user/index.ejs', { user, users, message, alertType, userType })

        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error("ERROR: userController -> Tyring to find users.")
        console.error(error.message)
        req.session.message = 'Error tyring to find users.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

/**
 * This function render all users except the current user.
 * If the current user is ROLE.MANAGER then find only CUSTOMERS users.
 * @param {*} req 
 * @param {*} res 
 */
exports.customers = async (req, res) => {
    try {
        // Message for alerts
        let { message, alertType } = req.session
        let userType = 'customers' //This variable is used to compose the url to redirect on edit.

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
            let users = await UserService.getUsersPerRole(req, ROLES.CUSTOMER)

            res.render('user/index.ejs', { user, users, message, alertType, userType })

        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error("ERROR: userController -> Tyring to find customers.")
        console.error(error.message)
        req.session.message = 'Error tyring to find customers.'
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
                customerInfo = await Stripe.addNewCustomer(fields.email?.toLowerCase(), fields.firstName,
                    fields.lastName,
                    fields.phoneNumber)
            }

            var hashPassword = await bcrypt.hash(fields.password, 10)

            user = await UserService.addUser({
                email: fields.email?.toLowerCase(),
                password: hashPassword,
                billingID: customerInfo.id,
                role: fields.role,
                firstName: fields.firstName,
                lastName: fields.lastName,
                phoneNumber: fields.phoneNumber
            })

            console.log(`A new user added to DB. The ID for ${user.email} is ${user.id}`)

            req.session.message = `User Created ${user.email}.`
            req.session.alertType = alertTypes.CompletedActionAlert
            req.flash('info', 'User created.')

            if (user.role === ROLES.CUSTOMER)
                res.redirect('/customers')
            else
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
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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
            findByBillingID = req?.query?.billingID ? true : false,
            cars,
            userType = req?.query?.userType,
            viewProfile = req?.query?.viewType === 'myProfile'

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
            if (customer.billingID && !viewProfile) {
                customer = await SubscriptionService.setStripeInfoToUser(customer)

                cars = await CarService.getAllCarsByUser(customer)

                for (car of cars) {
                    car.subscription = await SubscriptionService.getLastSubscriptionByCar(car)
                }

            }
            res.status(200).render('user/view.ejs', {
                user: req.user,
                isMyProfile,
                customer,
                subscriptions: customer?.subscriptions,
                cars,
                message,
                alertType,
                userType
            })
        } else {
            message = 'Customer not found.'
            alertType = alertTypes.ErrorAlert
            console.log('Customer not found.')
            res.redirect('/users', { message, alertType })
        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error)
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
        const fromProfile = req.query.fromProfile;
        const customer = await UserService.getUserById(id)
        const userType = req.query.userType

        if (customer) {
            let urlQuery = fromProfile ? `?viewType=myProfile` : '';

            if (ROLES)
                selectRoles = Object.entries(ROLES)

            let composedUrl = (req.user.role == ROLES.CUSTOMER) ? `/customers/${req.user.id}${urlQuery}` : ((url || userType) == '/users' || (url || userType) == '/customers' || url == '/account' || url == '/validateMembership') ? url : url == "/editCustomers" ? `/customers/${id}` : `${url}/${id}${urlQuery}`

            res.status(200).render('user/edit.ejs', { user: req.user, customer, selectRoles, url: composedUrl })
        } else {
            console.log('User not found.')
            res.redirect(`${url}`)
        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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
        const fromProfile = req.query.fromProfile;
        const customer = await UserService.getUserById(id)

        if (customer) {
            let urlQuery = fromProfile ? `?viewType=myProfile` : '';
            //  (url == '/users' || url == '/account' || url == '/validateMembership') ? url : `${url}/${id}`
            let composedUrl = (req.user.role == ROLES.CUSTOMER) ? `/customers/${req.user.id}${urlQuery}` : ((url || userType) == '/users' || (url || userType) == '/customers' || url == '/account' || url == '/validateMembership') ? url : url == "/editCustomers" ? `/customers/${id}` : `${url}/${id}${urlQuery}`

            res.status(200).render('user/changePassword.ejs', { user: req.user, customer, url: composedUrl, fromProfile })
        } else {
            console.log('User not found.')
            res.redirect(`${url}`)
        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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

exports.notifications = async (req, res) => {
    try {
        let user = await UserService.getUserById(req.user.id)
        let { message, alertType } = req.session

        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }

        if (user) {
            let notifications = user.notifications
            res.status(200).render('user/notifications.ejs', {
                user: req.user,
                notifications,
                message,
                alertType
            })
        } else {
            message = 'Customer not found.'
            alertType = alertTypes.ErrorAlert
            console.log('Customer not found.')
            res.redirect('/account', { message, alertType })
        }
    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render the user notifications."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')

    }
}

exports.changeNotificationState = async (req, res) => {
    let changed = false
    try {
        let { userId, notificationId, newStatus, allNotifications } = req.body
        let customer
        if (notificationId) {
            customer = await UserService.changeNotificationState(userId, notificationId, newStatus)
        } else if (allNotifications) {
            // console.debug("readAllNotifications")
            customer = await UserService.readAllNotifications(userId)
        }

        if (customer)
            changed = true

        res.send({ changed })
    } catch (error) {
        console.error("ERROR: userController -> Tyring to change notification state.")
        console.error(error.message)
        res.send({ changed })

    }
}

exports.removeFromCart = async (req, res) => {
    // NOTE: in the cart the items have the propperty id, in the DB is _id
    let itemToRemove = req.body.item,
        subscriptionList = req.body.subscriptionList
    let returnValues
    let user = req.user;
    if (user) {
        if (itemToRemove.addType == 'cookie') {
            let cookieCart = req.cookies.cart;
            cookieCart = JSON.parse(cookieCart);
            cookieCart = cookieCart.filter(item => item.id !== itemToRemove.id);
            if (cookieCart.length == 0)
                res.cookie('subscriptionEmail', '');
            res.cookie('cart', JSON.stringify(cookieCart));
            cookieCart = cookieCart.filter(item => item.id !== itemToRemove.id);
        }

        //Anyways try to remove from the DB if the user is logged in.
        let result = await UserService.removeItemFromCart(req.user.id, itemToRemove)
        if (result) {
            subscriptionList = subscriptionList.filter(item => item._id !== itemToRemove._id)
            returnValues = { itemRemoved: true, subscriptionList: subscriptionList }
        } else
            returnValues = { itemRemoved: false, subscriptionList: subscriptionList }

    } else {
        let cookieCart = req.cookies.cart;
        cookieCart = JSON.parse(cookieCart);
        cookieCart = cookieCart.filter(item => item.id !== itemToRemove.id);
        if (cookieCart.length == 0)
            res.cookie('subscriptionEmail', '');

        res.cookie('cart', JSON.stringify(cookieCart));
        returnValues = { itemRemoved: true, subscriptionList: cookieCart }
    }

    res.send(returnValues)
}

exports.validateEmail = async (req, res) => {
    try {
        const lingua = req.res.lingua.content

        let { email } = req.body,
            user = await UserService.getUserByEmail(email),
            invalidEmail = false,
            invalidMsj = '';

        if (user) {
            invalidEmail = true
            invalidMsj = lingua.existEmail
        }

        res.status(200).send({ invalidEmail: invalidEmail, invalidMsj: invalidMsj })

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: userController -> Tyring to validate email. ${error.message}`)
        res.status(500).send('Error validating email.')
    }

}
