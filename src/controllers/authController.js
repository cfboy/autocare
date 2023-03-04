const UserService = require('../collections/user')
const LocationService = require('../collections/location')
const { ROLES } = require('../collections/user/user.model')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')
const bcrypt = require('bcrypt');
const passport = require('passport')
const Auth = require('../config/auth.service')
const { municipalities } = require('../helpers/municipalities');
const sendEmail = require("../utils/email/sendEmail");

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
 * This function verify if the user exist on the DB, if not then create new user. 
 * @param {*} req 
 * @param {*} res 
 */
exports.register = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            city
        } = req.body

        const lingua = req.res.lingua.content

        var { email, password } = req.body

        email = email?.toLowerCase()

        // console.debug('email', email)

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
                dateOfBirth,
                city
            })

            if (customer) {
                console.debug(
                    `A new user added to DB. The ID for ${customer.email} is ${customer.id}`
                )

                req.session.message = lingua.accountCreated
                req.session.alertType = alertTypes.CompletedActionAlert
                req.flash('info', lingua.accountCreated);

                // Login the user
                req.login(customer, function (err) {
                    if (!err) {
                        res.redirect('/create-subscriptions')
                    } else {
                        console.log(err);
                    }
                })

                // Send Email
                var resultEmail = await sendEmail(
                    customer.email,
                    "welcome",
                    {
                        name: customer?.personalInfo?.firstName + ' ' + customer?.personalInfo?.lastName
                    }
                )

                if (!resultEmail.sent) {
                    bugsnag.notify(new Error(resultEmail.data),
                        function (event) {
                            event.setUser(email)
                        })
                }
            } else {
                req.bugsnag.notify(new Error('Account Not Created.'))
            }


        } else {
            let message = lingua.existEmail
            req.flash('warning', message);
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
        req.bugsnag.notify(new Error(error))
        console.error(`ERROR: authController - register(). ${error.message}`)
        req.session.message = `Error on registration.`
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

    let flashTypes = Object.keys(req.session.flash),
        flashValues = Object.values(req.session.flash)

    req.logout(function (err) {
        if (err) { return next(err); }

        for (var type of flashTypes) {
            for (var value of flashValues) {
                req.flash(type, value)
            }
        }

        res.redirect('/');
    });
}

/**
 * This function render the request reset password form.
 * @param {*} req 
 * @param {*} res 
 */
exports.resetPasswordRequest = async (req, res) => {
    let { message, email, alertType } = req.session

    // Clear session alerts variables.
    if (message) {
        req.session.message = ''
        req.session.alertType = ''
    }

    res.render('auth/resetPasswordRequest.ejs', { message, email, alertType })
}

/**
 * This function render the reset password form.
 * @param {*} req 
 * @param {*} res 
 */
exports.resetPassword = async (req, res) => {
    let { message, email, alertType } = req.session
    const lingua = req.res.lingua.content
    let { id, token } = req.query

    // Clear session alerts variables.
    if (message) {
        req.session.message = ''
        req.session.alertType = ''
    }

    let [isValid, tokenMessage] = await Auth.validateToken(lingua, id, token)

    if (isValid)
        res.render('auth/resetPassword.ejs', { message, email, alertType, id, token })
    else {

        req.flash('error', tokenMessage);
        res.redirect('/login')
    }
}

/**
 * This function handle the request of password reset.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.resetPasswordRequestController = async (req, res, next) => {
    const lingua = req.res.lingua.content

    const [requestSuccess, message] = await Auth.resetPasswordRequest(lingua,
        req.body.email, req.bugsnag);

    if (requestSuccess) {
        req.flash('info', message);

        res.redirect('/login')
    } else {
        req.flash('error', message);
        res.redirect('/resetPasswordRequest')
    }
    // return res.json(resetPasswordRequestService);
};

/**
 * This function handle the reset password.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.resetPasswordController = async (req, res, next) => {
    const lingua = req.res.lingua.content

    const [requestSuccess, message] = await Auth.resetPassword(lingua,
        req.body.userId,
        req.body.token,
        req.body.password,
        req.bugsnag
    );

    if (requestSuccess) {
        req.flash('info', message);
        req.session.message = message
        req.session.alertType = alertTypes.CompletedActionAlert
    } else {
        req.flash('error', message);
        req.session.message = message
        req.session.alertType = alertTypes.ErrorAlert
    }

    res.redirect('/login')
};

/**
 * This function is for redirect to a selectLocation view.
 * @param {*} req 
 * @param {*} res 
 */
exports.selectLocation = async (req, res) => {
    let user = req.user,
        userLocations = req.user.locations

    res.render('auth/selectLocation.ejs', { userLocations })
}

/**
 * This function receive the id of the new location and then set this value on session. (locationID).
 * Return a response message.
 * @param {*} req 
 * @param {*} res 
 */
exports.changeLocation = async (req, res) => {
    try {
        let { locationID } = req.body

        if (locationID) {
            let location = await LocationService.getLocationById(locationID)
            // res.cookie('currentLocation', locationID)
            console.log('CURRENT LOCATION: ' + location?.id);
            console.log('LOCATION AGENT: ' + location?.agentID);
            req.session.location = location

            req.flash('info', 'Location ' + location?.name)
            res.status(200).send(locationID);
        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: changeLocation -> Tyring to change location. ${error.message}`)
        req.session.message = `ERROR: ${error.message}`
        req.session.alertType = alertTypes.ErrorAlert
        res.status(500).send(error);
    }
}