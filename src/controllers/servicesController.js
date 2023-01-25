const ServiceService = require('../collections/services')
const SubscriptionService = require('../collections/subscription')
const CarService = require('../collections/cars')
const UtilizationService = require('../collections/utilization')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const { ROLES } = require('../collections/user/user.model')
const UserService = require('../collections/user')
const alertTypes = require('../helpers/alertTypes')

exports.services = async (req, res) => {
    try {

        // Message for alerts
        let { message, alertType } = req.session
        // Passport store the user in req.user
        // TODO: implement for othe user.
        // user = await SubscriptionService.setStripeInfoToUser(req.user)

        user = req.user
        // clear message y alertType
        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        
        let services
        if ([ROLES.ADMIN, ROLES.MANAGER].includes(user.role)) {
            services = await ServiceService.getServicesByLocation(req.session.location)
        } else
            services = await ServiceService.getServicesByUser(user)

        // Manage services by car on client side.
        res.render('services/index.ejs', {
            user, message, alertType,
            services
        })
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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
            let { item, subscription } = await SubscriptionService.getSubscriptionItemByCar(car)
            let customer = await UserService.getUserById(car.user_id)
            let currentLocation = req.session.location ? req.session.location : 'N/A'

            service = await ServiceService.addService(car, authorizedBy, currentLocation._id, customer, item?.data?.price?.product?.name, inputType)

            if (car && service) {
                await UtilizationService.calculateUtilizationPercent(car, true)

                //Log this action.
                HistoryService.addHistory(`Use Service: ${service.id}`, historyTypes.SERVICE, customer, service.location)
            }

            res.render('ajaxSnippets/useServiceResult.ejs', { customer, service, car })
        } else {
            req.session.message = `USER ID UNDEFINED`
            req.session.alertType = alertTypes.ErrorAlert
            console.debug(`userID is undefined.`)
            res.render(`Error trying to log service.`)
        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: dashboardController -> Tyring to log use service. ${error.message}`)
        req.session.message = `ERROR: ${error.message}`
        req.session.alertType = alertTypes.ErrorAlert
        res.render(`Error trying to log service.`)
    }
}

/**
 * This function deletes a service.
 * @param {*} req 
 * @param {*} res 
 */
exports.delete = async (req, res) => {
    console.log('Deleting services...')
    const serviceID = req.params.id

    try {
        ServiceService.deleteService(serviceID)
        // Set the message for alert. 
        req.session.message = `Service Deleted.`
        req.session.alertType = alertTypes.CompletedActionAlert

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR-SERVICE-CONTROLLER : ${error.message}`)
        req.session.message = "Can't delete service."
        req.session.alertType = alertTypes.ErrorAlert
    }

    // Redirect to cars for update the utilization percentage.
    res.redirect('/cars')

}
