const UserService = require('../collections/user')
const CarService = require('../collections/cars')
const { ROLES } = require('../collections/user/user.model')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')

let readingObjs = {}
let readingQueue = []

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
            products = await Stripe.getAllProducts(),
            params

        params = { user, products, message, alertType }

        if (user.billingID) {
            user = await Stripe.setStripeInfoToUser(user, products)
        }
        params = {
            ...params,
            stripeSubscription: user?.stripe?.subscription,
            membershipStatus: user?.stripe?.subscription ? user?.stripe?.subscription?.status : Stripe.STATUS.NONE
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
    } catch (error) {
        console.error("ERROR: dashboardController -> Tyring to find stripeInfo.")
        console.error(error.message)
    }
}

/**
 * This function render the validateMembership template. 
 * @param {*} req 
 * @param {*} res 
 */
exports.validateMembership = async (req, res) => {
    // Message for alerts
    let { message, alertType } = req.session

    // clear message y alertType
    if (message) {
        req.session.message = ''
        req.session.alertType = ''
    }
    let user = req.user

    res.render('dashboards/validateMembership.ejs', { user, message, alertType, readingQueue })

}

/**
 * This function search the user by car plate number and return the membership status.
 * This function is called by ajax function.
 * The result is rendered in the validateMembership page.
 * @param {*} req 
 * @param {*} res 
 */
exports.validate = async (req, res) => {
    try {
        let carPlate = req.body.tagNumber,
            car = await CarService.getCarByPlate(carPlate)

        let customer

        if (car)
            customer = await UserService.getUserByCar(car)

        if (customer) {
            customer = await Stripe.setStripeInfoToUser(customer)
            // TODO: use selected location 
            //Log this action.
            HistoryService.addHistory(`Validate Membership: ${carPlate}`, historyTypes.USER_ACTION, req.user, req?.user?.locations[0])
        }


        res.render('ajaxSnippets/validationResult.ejs', {
            customer,
            car,
            stripeSubscription: customer?.stripe?.subscription,
            membershipStatus: customer?.stripe?.subscription ? customer?.stripe?.subscription?.status : Stripe.STATUS.NONE
        })
    } catch (error) {
        console.error("ERROR: dashboardController -> Tyring to validate membership.")
        console.error(error.message)
        res.render('Error validating membership.')
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
        let userID = req.body.userID

        if (userID) {
            // TODO: Change location
            let [customer, service] = await UserService.addNewService(userID, req.user, req?.user?.locations[0])
            if (customer && service)
                //Log this action.
                HistoryService.addHistory(`Use Service: ${service.id}`, historyTypes.SERVICE, customer, service.location)

            res.render('ajaxSnippets/useServiceResult.ejs', { customer, service })
        } else {
            req.session.message = `USER ID UNDEFINED`
            req.session.alertType = alertTypes.ErrorAlert
            console.debug(`userID is undefined.`)
            res.redirect('/validateMembership')
        }
    } catch (error) {
        console.debug("ERROR: dashboardController -> Tyring to log use service.")
        console.debug(error.message)
        req.session.message = `ERROR: ${error.message}`
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/validateMembership')
    }
}

exports.carCheck = async (req, res) => {
    try {
        if (req.body?.error) {
            console.log(`REKOR-SCOUT: ERROR on JSON ${req.body.error}`)
        }
        else {
            let dataType = req.body.data_type,
                bodyResult = req.body
            console.log(`REKOR-SCOUT: Data Type: ${dataType}`)
            switch (dataType) {
                case 'alpr_results':
                    /**
                     * Scout generates an alpr_results JSON value for every
                     * frame of video in which a license plate is recognized. 
                     * 
                     * This is for single plate reads.
                     * https://docs.rekor.ai/rekor-scout/application-integration/json-plate-results
                     */

                    console.log("Processing Time (MS): " + bodyResult.processing_time_ms)
                    for (result of bodyResult.results) {
                        console.log("IDENTFIED PLATE: " + result?.plate)
                    }

                    break;

                case 'alpr_group':
                    /**
                     * Scout generates an alpr_group JSON value for a collection of similar license plates,
                     * generally delegating a single plate group per vehicle. 
                     * If more real-time results are needed, 
                     * it is recommended that you ignore the plate_group value and use only the individual plate results.
                     * 
                     * https://docs.rekor.ai/rekor-scout/application-integration/json-group-results
                     */
                    readingObjs = {
                        "plate": bodyResult.best_plate_number,
                        "color": bodyResult.vehicle.color[0].name,
                        "brand": bodyResult.vehicle.make[0].name,
                        "model": bodyResult.vehicle.make_model[0].name,
                        "year": bodyResult.vehicle.year[0].name
                    }
                    console.debug("CAR DETAILS: ")
                    console.debug("-> PLATE: " + readingObjs.plate)
                    console.debug("-> COLOR: " + readingObjs.color)
                    console.debug("-> BRAND: " + readingObjs.brand)
                    console.debug("-> MODEL: " + readingObjs.model)
                    console.debug("-> YEAR : " + readingObjs.year)

                    // Load info to a global queue list.
                    if (!readingQueue.some(car => car.plate === readingObjs.plate))
                        readingQueue.push(readingObjs)

                    break;

                case 'heartbeat':
                    /**
                     * Every minute, the Scout Agent adds one heartbeat message to the queue. 
                     * The heartbeat provides general health and status information.
                     */
                    console.log('Video Streams: ' + bodyResult.video_streams.length)

                    break;

                default:
                    console.log('REKOR-SCOUT: No dataType detected.');
            }
            req.io.emit('read-plates', readingQueue);
        }
    } catch (error) {
        console.error(error)
        console.error('REKOR-SCOUT: ERROR --> ' + error.message)
    }
}