const UserService = require('../collections/user')
const { ROLES } = require('../collections/user/user.model')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')
const bcrypt = require('bcrypt');
const passport = require('passport')
const { municipalities } = require('../helpers/municipalities');
const fetch = require('node-fetch');

require("../config/passport");
require("../config/local");

/**
 * Authenticate the user. Store the user object on req.user.
 * 
 */
exports.login =
    passport.authenticate('local', {
        successRedirect: '/account',
        failureRedirect: '/login',
        failureFlash: true
    })

/**
 * This function render the create account form.
 * @param {*} req 
 * @param {*} res 
 */
exports.createAccount = async (req, res) => {
    let product = req.query.product

    req.session.selectedProduct = product
    res.render('auth/register.ejs', { municipalities })
}

/**
 * This function render the create subscriptions form.
 * @param {*} req 
 * @param {*} res 
 */
exports.createSubscriptions = async (req, res) => {
    try {
        let { message, alertType } = req.session
        // clear message y alertType
        req.session.message = ''
        req.session.alertType = ''

        let user = req.user
        const apiRoute = 'GetAllMakes?format=json'
        const apiResponse = await fetch(
            'https://vpic.nhtsa.dot.gov/api/vehicles/' + apiRoute
        )
        let apiResponseJSON
        let allMakes = []

        if (apiResponse.ok) {
            apiResponseJSON = await apiResponse.json()
            allMakes = apiResponseJSON?.Results
        }

        const prices = await Stripe.getAllPrices()

        res.render('auth/createSubs.ejs', { message, alertType, user, allMakes: allMakes, allModels: [], prices })
    }
    catch (error) {
        console.error(error)
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

/**
 * This function verify if the user exist on the DB, if not then create new user. 
 * @param {*} req 
 * @param {*} res 
 */
exports.register = async (req, res) => {
    // TODO: Optimize this method.
    try {
        const {
            email,
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            city
        } = req.body

        var { password } = req.body

        console.debug('email', email)

        let customer = await UserService.getUserByEmail(email)
        let customerInfo = {}

        if (!customer) {
            console.debug(`Email ${email} does not exist. Making one.`)

            customerInfo = await Stripe.getCustomerByEmail(email)
            if (!customerInfo) {
                customerInfo = await Stripe.addNewCustomer(email, firstName,
                    lastName,
                    phoneNumber,
                    city)
            }

            hashPassword = await bcrypt.hash(password, 10)

            customer = await UserService.addUser({
                email,
                password: hashPassword,
                billingID: customerInfo.id,
                role: ROLES.CUSTOMER,
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth
            })

            console.debug(
                `A new user added to DB. The ID for ${customer.email} is ${customer.id}`
            )

            req.session.message = `Account Created.`
            req.session.alertType = alertTypes.CompletedActionAlert
            req.flash('info', 'Account Created!');

            // Login the user
            req.login(customer, function (err) {
                if (err) {
                    console.log(err);
                }
            })
            // if (req.session.selectedProduct) {
            // let product = encodeURIComponent(req.session.selectedProduct);
            // req.session.selectedProduct = '';
            // let billingID = encodeURIComponent(customer.billingID)
            // res.redirect(`/stripeCheckout?product=${product}&customerID=${billingID}`)
            res.redirect('create-subscriptions')
            // }
            // else
            // res.redirect('/account')

        } else {
            let message = `That email already exist, please login.`
            req.flash('info', message);
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

/**
 * This method clean the session and remove the authenticated user.
 * @param {*} req 
 * @param {*} res 
 */
exports.logout = async (req, res) => {
    console.debug('Log out...')
    req.logOut()
    res.redirect("/");
}