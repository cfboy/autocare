const ServiceService = require('../collections/services')
const SubscriptionService = require('../collections/subscription')
const CarService = require('../collections/cars')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const { ROLES } = require('../collections/user/user.model')
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
            let cars = []
            if ([ROLES.ADMIN, ROLES.MANAGER].includes(user.role))
                cars = await CarService.getCars()
            else
                cars = await SubscriptionService.getAllCarsByUser(user)


            let services = await ServiceService.getServicesByCars(cars)

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
        let { userID, carID, inputType } = req.body

        if (userID) {
            let authorizedBy = req.user
            let car = await CarService.getCarByID(carID)
            let item = await SubscriptionService.getSubscriptionItemByCar(car)
            let customer = await SubscriptionService.getUserByCar(car)
            // TODO: Change location 
            let service = await ServiceService.addService(car, authorizedBy, authorizedBy.locations[0], customer, item?.data?.price?.product?.name, inputType)

            if (car && service)
                //Log this action.
                HistoryService.addHistory(`Use Service: ${service.id}`, historyTypes.SERVICE, customer, service.location)

            res.render('ajaxSnippets/useServiceResult.ejs', { customer, service, car })
        } else {
            req.session.message = `USER ID UNDEFINED`
            req.session.alertType = alertTypes.ErrorAlert
            console.debug(`userID is undefined.`)
            res.render(`Error trying to log service.`)
        }
    } catch (error) {
        console.debug("ERROR: dashboardController -> Tyring to log use service.")
        console.debug(error)
        req.session.message = `ERROR: ${error.message}`
        req.session.alertType = alertTypes.ErrorAlert
        res.render(`Error trying to log service.`)
    }
}