const UserService = require('../collections/user')
const Stripe = require('../connect/stripe')
const Roles = require('../config/roles')
const hasPlan = require('../middleware/hasPlan')

// TODO: Use User Role to redirect to different dashboards.
exports.account = async(req, res) => {
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
            case Roles.ADMIN:
                products = await Stripe.getAllProducts()
                if (products) {
                    // Get price of all products.
                    for (const product of products) {
                        product.priceInfo = await Stripe.getProductPrice(product.id)
                    }
                }
                // Get Customers
                users = await UserService.getUsersPerRole(Roles.CUSTOMER)
                res.render('dashboards/admin.ejs', { user, products, users, message, alertType })
                break;
            case Roles.CUSTOMER:
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
            case Roles.MANAGER:
                products = await Stripe.getAllProducts()
                if (products) {
                    // Get price of all products.
                    for (const product of products) {
                        product.priceInfo = await Stripe.getProductPrice(product.id)
                    }
                }
                // Get Customers
                users = await UserService.getUsersPerRole(Roles.CUSTOMER)
                res.render('dashboards/admin.ejs', { user, products, users, message, alertType })
                break;
            default:
                console.log('No ROLE detected.');
        }
    }
}