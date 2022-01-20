const UserService = require('../collections/user')
const Stripe = require('../connect/stripe')
const Roles = require('../config/roles')
const alertTypes = require('../helpers/alertTypes')
const bcrypt = require('bcrypt');
const passport = require('passport');
require("../config/passport");
require("../config/local");

exports.login = passport.authenticate('local', {
    successRedirect: '/account',
    failureRedirect: '/login',
    failureFlash: true
})

exports.register = async(req, res) => {
    // TODO: Finish this method.
    try {
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

        var { password } = req.body

        console.log('email', email)

        let customer = await UserService.getUserByEmail(email)
        let customerInfo = {}

        if (!customer) {
            console.debug(`Email ${email} does not exist. Making one. `)

            customerInfo = await Stripe.getCustomerByEmail(email)
            if (!customerInfo) {
                customerInfo = await Stripe.addNewCustomer(email, firstName,
                    lastName,
                    phoneNumber,
                    city)
            }

            password = await bcrypt.hash(password, 10)

            customer = await UserService.addUser({
                email,
                password,
                billingID: customerInfo.id,
                role: Roles.CUSTOMER,
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
                `A new user added to DB. The ID for ${customer.email} is ${customer.id}`
            )

            // req.session.user = email
            req.session.message = `Account Created.`
            req.session.alertType = alertTypes.CompletedActionAlert
            res.redirect('/account')
        } else {
            let message = `That email already exist, please login.`
            console.log(
                `The existing ID for ${email} is ${JSON.stringify(customerInfo)}`
            )
            req.session.email = email

            // Set the message for alert. 
            req.session.message = message
            req.session.alertType = alertTypes.WarningAlert
            res.redirect('/login')
        }
    } catch (error) {
        console.error(error)
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/login')
    }
}

exports.logout = async(req, res) => {
    console.log('Log out...')
    req.logOut()
    res.redirect("/");
}