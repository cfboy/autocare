const UserService = require('../collections/user')
const Stripe = require('../connect/stripe')
const Roles = require('../middleware/roles')


exports.account = async(req, res) => {
    let email = req.session.user
        // Message for alerts
    let { message, alertType } = req.session
        // clear message y alertType
    req.session.message = ''
    req.session.alertType = ''

    let customer = await UserService.getUserByEmail(email)
    if (!customer) {
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
        res.render('dashboard.ejs', { customer, products, users, message, alertType })
            // res.render('index.ejs', { customer, products, users })
    }
}