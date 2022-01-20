const UserService = require('../collections/user')
const alertTypes = require('../helpers/alertTypes')


// ------------------------------- CRUDS ------------------------------- 


// ------------------------------- Create -------------------------------

// Route for create user.
exports.createUser = async(req, res) => {
    let { message, alertType } = req.session
        // clear message y alertType
    req.session.message = ''
    req.session.alertType = ''

    res.render('user/create.ejs', { user: req.user, message, alertType })
}


// TODO: Test this method. NOT FINISHED
exports.save = async(req, res) => {
    const {
        email,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth,
        city,
        brand,
        model,
        plate
    } = req.body

    var { password } = req.body //Password is variable for encryption.
    try {

        console.log('Creating New User: ', email)

        let user = await UserService.getUserByEmail(email)
        let customerInfo = {}

        if (!user) {
            console.log(`Email ${email} does not exist. Making one...`)
            customerInfo = await Stripe.getCustomerByEmail(email) //TODO: getCustomerByEmail not return the user
            if (!customerInfo) {
                customerInfo = await Stripe.addNewCustomer(email, firstName,
                    lastName,
                    phoneNumber,
                    city)
            }

            password = Crypto.encryptData(password)

            user = await UserService.addUser({
                email,
                password,
                billingID: customerInfo.id,
                role: Roles.Customer,
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth,
                city,
                brand,
                model,
                plate,
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

        if (customer) {
            res.status(200).render('user/index.ejs', { user: req.user, customer, message, alertType })
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
            res.status(200).render('user/edit.ejs', { user: req.user, customer, url: url })
        } else {
            console.log('User not found.')
            res.redirect(`/${url}`)
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
            req.session.message = `User updated ${user.email}`
            req.session.alertType = alertTypes.CompletedActionAlert
        }
        // res.status(201).send(user)
        res.redirect(`/${url}`)


    } catch (error) {
        req.session.message = `Error trying to update user.`
        req.session.alertType = alertTypes.ErrorAlert
            // res.status(400).send(error)
        res.redirect(`/${url}`)

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