const UserService = require('../collections/user')
const Stripe = require('../connect/stripe')
const Roles = require('../middleware/roles')

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
        let products = await Stripe.getAllProducts()
        if (products) {
            // Get price of all products.
            for (const product of products) {
                product.priceInfo = await Stripe.getProductPrice(product.id)
            }
        }
        let users = await UserService.getUsers()
        res.render('dashboard.ejs', { user, products, users, message, alertType })
    }
}