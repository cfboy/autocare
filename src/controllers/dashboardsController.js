const UserService = require('../collections/user')
const {ROLES} = require('../collections/user/user.model')
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
    let user = req.user

    if (!user) {
        res.redirect('/')
    } else {
        let role = user.role
        let products, users
        switch (role) {
            case ROLES.ADMIN:
                products = await Stripe.getAllProducts()
                if (products) {
                    // Get price of all products.
                    for (const product of products) {
                        product.priceInfo = await Stripe.getProductPrice(product.id)
                    }
                }
                // Get Customers
                users = await UserService.getUsersPerRole(req, ROLES.CUSTOMER)
                res.render('dashboards/admin.ejs', { user, products, users, message, alertType })
                break;
            case ROLES.CUSTOMER:
                if (user.membershipInfo.plan == 'none') {
                    products = await Stripe.getAllProducts()
                    if (products) {
                        // Get price of all products.
                        for (const product of products) {
                            product.priceInfo = await Stripe.getProductPrice(product.id)
                        }
                    }
                }
                res.render('dashboards/customer.ejs', { user, products, message, alertType })
                break;
            case ROLES.MANAGER:
                products = await Stripe.getAllProducts()
                if (products) {
                    // Get price of all products.
                    for (const product of products) {
                        product.priceInfo = await Stripe.getProductPrice(product.id)
                    }
                }
                // Get Customers
                users = await UserService.getUsersPerRole(req, ROLES.CUSTOMER)
                res.render('dashboards/admin.ejs', { user, products, users, message, alertType })
                break;
            default:
                console.log('No ROLE detected.');
        }
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

    if (customer) {
        let stripeUser = await Stripe.getCustomerByID(customer.billingID)

        if (stripeUser?.subscriptions?.data[0]) {
            membershipStatus = stripeUser?.subscriptions?.data[0]?.status
        }
    }

    res.render('ajaxSnippets/validationResult.ejs', { customer, membershipStatus })
}