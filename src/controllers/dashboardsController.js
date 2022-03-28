const UserService = require('../collections/user')
const { ROLES } = require('../collections/user/user.model')
const Stripe = require('../connect/stripe')

/**
 * This function renders the home page / pricing page.
 * @param {*} req 
 * @param {*} res 
 */
exports.home = async (req, res) => {
    let user = req.user,
        // products = await Stripe.getAllProducts(),
        prices = await Stripe.getAllPrices()


    res.render('index.ejs', {
        prices,
        //  products,
        user
    })
}

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
            prices = await Stripe.getAllPrices(),
            params

        params = {
            user, prices, message, alertType,
            subscriptions: user?.subscriptions
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
                if (message) {
                    req.session.message = message
                    req.session.alertType = alertType
                }

                res.redirect('/validateMembership')
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