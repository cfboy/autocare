const ServiceService = require('../collections/services')
const SubscriptionService = require('../collections/subscription')
const Stripe = require('../connect/stripe')

exports.services = async (req, res) => {
    try {

        // Message for alerts
        let { message, alertType } = req.session
        // Passport store the user in req.user
        // TODO: implement for othe user.
        user = await Stripe.setStripeInfoToUser(req.user)

        // clear message y alertType
        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }

        if (!user) {
            res.redirect('/')
        } else {

            // let userCars = await CarService.getAllCarsByUser(user)
            let userCars = await SubscriptionService.getAllCarsByUser(user)

            let services = await ServiceService.getServicesByCars(userCars)

            // Manage services by car on client side.
            res.render('services/index.ejs', {
                user, message, alertType,
                services
            })

        }
    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render the user services."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')

    }
}

exports.view = async (req, res) => {
    try {

        // Message for alerts
        let { message, alertType } = req.session,
            // Passport store the user in req.user
            user = req.user

        // clear message y alertType
        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }

        if (!user) {
            res.redirect('/')
        } else {
            let id = req.params.id
            let service = await ServiceService.getServiceByID(id)

            res.render('services/view.ejs', {
                user, message, alertType,
                service, car: service?.car
            })

        }
    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render the service."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')

    }
}