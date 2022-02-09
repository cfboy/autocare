const UserService = require('../collections/user')
const { ROLES } = require('../collections/user/user.model')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')

/**
 * This function handle the dashboards of the different roles. 
 * @param {*} req 
 * @param {*} res 
 */
exports.account = async (req, res) => {
    try {
        // Message for alerts
        let { message, alertType } = req.session
        // clear message y alertType
        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        // Passport store the user in req.user
        let user = req.user,
            role = user.role,
            products = await Stripe.getAllProducts(),
            params

        params = { user, products, message, alertType }

        if (user.billingID) {
            user = await Stripe.setStripeInfoToUser(user, products)
        }
        params = {
            ...params,
            stripeSubscription: user?.stripe?.subscription,
            membershipStatus: user?.stripe?.subscription ? user?.stripe?.subscription?.status : Stripe.STATUS.NONE
        }
        switch (role) {
            case ROLES.ADMIN:
                // Get Customers
                customers = await UserService.getUsersPerRole(req, ROLES.CUSTOMER)
                params = { ...params, customers }
                res.render('dashboards/mainDashboard.ejs', params)
                break;
            case ROLES.CUSTOMER:
                res.render('dashboards/customer.ejs', params)
                break;
            case ROLES.MANAGER:
                // Get Customers
                customers = await UserService.getUsersPerRole(req, ROLES.CUSTOMER)
                params = { ...params, customers }

                res.render('dashboards/mainDashboard.ejs', params)
                break;

            case ROLES.CASHIER:
                // Get Customers
                customers = await UserService.getUsersPerRole(req, ROLES.CUSTOMER)
                params = { ...params, customers }
                res.render('dashboards/mainDashboard.ejs', params)
                break;
            default:
                console.log('No ROLE detected.');
                res.redirect('/logout')

        }
    } catch (error) {
        console.error("ERROR: dashboardController -> Tyring to find stripeInfo.")
        console.error(error.message)
    }
}

/**
 * This function render the validateMembership template. 
 * @param {*} req 
 * @param {*} res 
 */
exports.validateMembership = async (req, res) => {
    // Message for alerts
    let { message, alertType } = req.session

    // clear message y alertType
    if (message) {
        req.session.message = ''
        req.session.alertType = ''
    }
    let user = req.user

    res.render('dashboards/validateMembership.ejs', { user, message, alertType })

}

/**
 * This function search the user by car plate number and return the membership status.
 * This function is called by ajax function.
 * The result is rendered in the validateMembership page.
 * @param {*} req 
 * @param {*} res 
 */
exports.validate = async (req, res) => {
    try {
        let carPlate = req.body.tagNumber,
            customer = await UserService.getUserByPlate(carPlate)

        if (customer) {
            customer = await Stripe.setStripeInfoToUser(customer)
            // TODO: use selected location 
            //Log this action.
            // HistoryService.addHistory(`Validate Membership: ${carPlate}`, historyTypes.USER_ACTION, req.user, req?.user?.locations[0])
        }


        res.render('ajaxSnippets/validationResult.ejs', {
            customer,
            stripeSubscription: customer?.stripe?.subscription,
            membershipStatus: customer?.stripe?.subscription ? customer?.stripe?.subscription?.status : Stripe.STATUS.NONE
        })
    } catch (error) {
        console.error("ERROR: dashboardController -> Tyring to validate membership.")
        console.error(error.message)
        res.render('Error validating membership.')
    }
}

/**
 * This function is to handle use service action. 
 * This function is called by ajax function.
 * Make a call to add new service on user schema.
 * Log the service to the history.
 * Then render the resuls of customer and service added.
 * @param {body.userID} req 
 * @param {*} res 
 */
exports.useService = async (req, res) => {
    try {
        let userID = req.body.userID

        if (userID) {
            let [customer, service] = await UserService.addNewService(userID, req.user, req?.user?.locations[0])
            if (customer && service)
                //Log this action.
                HistoryService.addHistory(`Use Service: ${service.id}`, historyTypes.SERVICE, service.user, service.location)

            res.render('ajaxSnippets/useServiceResult.ejs', { customer, service })
        } else {
            req.session.message = `USER ID UNDEFINED`
            req.session.alertType = alertTypes.ErrorAlert
            console.debug(`userID is undefined.`)
            res.redirect('/validateMembership')
        }
    } catch (error) {
        console.debug("ERROR: dashboardController -> Tyring to log use service.")
        console.debug(error.message)
        req.session.message = `ERROR: ${error.message}`
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/validateMembership')
    }
}