const UserService = require('../collections/user')
const { ROLES } = require('../collections/user/user.model')
const Stripe = require('../connect/stripe')
const hasPlan = require('../middleware/hasPlan')

// TODO: Use User Role to redirect to different dashboards.
exports.account = async (req, res) => {
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
        stripeSubscription,
        stripeCustomer,
        products,
        users, hasSubscription = false,
        params

    params = { user, message, alertType }

    try {
        products = await Stripe.getAllProducts()

        if (user.billingID) {
            stripeCustomer = await Stripe.getCustomerByID(user.billingID)
            if (stripeCustomer) {
                stripeSubscription = stripeCustomer?.subscriptions?.data[0]
                if (stripeSubscription) {
                    hasSubscription = true
                    // find Product on this sub.
                    stripeSubscription.product = products.find(({ id }) => id === stripeSubscription.plan.product)
                }
            }
        }
        params = { ...params, stripeCustomer, stripeSubscription, product: stripeSubscription?.product, hasSubscription, products }
    } catch (error) {
        console.error("ERROR: dashboardController -> Tyring to find stripeInfo.")
        console.error(error.message)
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
}

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

exports.validate = async (req, res) => {

    let carPlate = req.body.tagNumber
    let customer = await UserService.getUserByPlate(carPlate)
    let membershipStatus = Stripe.STATUS.NONE
    let stripeSubscription
    if (customer) {
        let stripeUser = await Stripe.getCustomerByID(customer.billingID)
        stripeSubscription = stripeUser?.subscriptions?.data[0]
        if (stripeSubscription) {
            membershipStatus = stripeSubscription?.status
        }
    }

    res.render('ajaxSnippets/validationResult.ejs', { customer, stripeSubscription, membershipStatus })
}