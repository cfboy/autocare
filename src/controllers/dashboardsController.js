const UserService = require('../collections/user')
const { ROLES } = require('../collections/user/user.model')
const Stripe = require('../connect/stripe')
const ReportsService = require('../collections/reports')

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

exports.termsAndConditions = async (req, res) => {
    let lang = res.lingua.locale

    res.render('termsAndConditions.ejs', { lang })
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

        // Passport store the user in req.user
        let user = req.user,
            role = user.role,
            // prices = await Stripe.getAllPrices(),
            params

        // Show balance on dashboard.
        // if (user?.billingID) {
        //     let { totalString } = await Stripe.getCustomerBalanceTransactions(user.billingID)
        //     user.balance = totalString
        // }
        params = {
            user,
            //  prices,
            message, alertType
            // , subscriptions: user?.subscriptions
        }

        let reports = await ReportsService.getReports()
        let reportURL
        switch (role) {
            case ROLES.ADMIN:
                // clear message y alertType
                if (message) {
                    req.session.message = ''
                    req.session.alertType = ''
                }
                reportURL = reports.find(report => report.name.indexOf('Dashboard') != -1)?.url
                // Get Customers
                // customers = await UserService.getUsersPerRole(req, ROLES.CUSTOMER)
                params = { ...params, reportURL }
                res.render('dashboards/mainDashboard.ejs', params)
                break;
            case ROLES.CUSTOMER:
                // res.render('dashboards/customer.ejs', params)
                res.redirect('/memberships')
                break;
            case ROLES.MANAGER:
                // clear message y alertType
                if (message) {
                    req.session.message = ''
                    req.session.alertType = ''
                }
                reportURL = reports.find(report => report.name.indexOf('Service') != -1)?.url
                // Get Customers
                // customers = await UserService.getUsersPerRole(req, ROLES.CUSTOMER)
                params = { ...params, reportURL }

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
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: dashboardController -> Trying generate user dashboard. ${error.message}`)
    }
}