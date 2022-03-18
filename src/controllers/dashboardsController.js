const UserService = require('../collections/user')
const SubscriptionService = require('../collections/subscription')
const CarService = require('../collections/cars')
const ServiceService = require('../collections/services')
const AnalyticsService = require('../collections/analytics/service')
const { ROLES } = require('../collections/user/user.model')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes'),
    { STATUS } = require('../connect/stripe');

let readingObjs = {}
let readingQueue = []

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
            prices = await Stripe.getAllPrices(),
            params

        params = { user, prices, message, alertType }

        if (user?.billingID) {
            user = await Stripe.setStripeInfoToUser(user)
        }
        params = {
            ...params,
            subscriptions: user?.subscriptions
        }

        if (user?.subscriptions?.length < 1 && [ROLES.CUSTOMER].includes(user.role)) {
            req.flash('warning', 'Create a subscription to continue.')
            res.redirect('/create-subscriptions')
        } else {

            // let analytics = await AnalyticsService.getAnalytics()

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
        }
    } catch (error) {
        console.error("ERROR: dashboardController -> Tyring to find stripeInfo.")
        console.error(error.message)
    }
}

/**
 * This function render the create subscriptions form.
 * @param {*} req 
 * @param {*} res 
 */
exports.createSubscriptions = async (req, res) => {
    try {
        let { message, alertType } = req.session
        // clear message y alertType
        req.session.message = ''
        req.session.alertType = ''

        let user = req.user
        let { allMakes, allModels } = await CarService.getAllMakes()

        const prices = await Stripe.getAllPrices()

        res.render('auth/createSubs.ejs', { message, alertType, user, allMakes, allModels, prices })
    }
    catch (error) {
        console.error(error)
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
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
    // let domain = process.env.DOMAIN

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
        // TODO: handle multiple cars with the same plate
        let carPlate = req.body.plateNumber,
        inputType = req.body.inputType,
            car = await CarService.getCarByPlate(carPlate)

        let customer, subscription, services, hasService

        if (car) {
            subscription = await SubscriptionService.getSubscriptionByCar(car)
            services = await ServiceService.getServicesByCar(car)

            hasService = services.some(service => service.created_date.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0))
            car.hasService = hasService
            customer = subscription?.user
        }

        if (customer) {
            customer = await Stripe.setStripeInfoToUser(customer)
            subscription = customer.subscriptions.find(subscription => subscription.items.filter(item => item.cars.filter(itemCar => itemCar.id = car.id)))
            // TODO: use selected location 
            //Log this action.
            HistoryService.addHistory(`Validate Membership: ${carPlate}`, historyTypes.USER_ACTION, req.user, req?.user?.locations[0])
        }

        // Remove readed plate to readingQueue list.
        readingQueue = readingQueue.filter(item => carPlate !== item.plate)

        res.render('ajaxSnippets/validationResult.ejs', {
            customer,
            inputType,
            car,
            subscription
        })
    } catch (error) {
        console.error("ERROR: dashboardController -> Tyring to validate membership.")
        console.error(error.message)
        res.render('Error validating membership.')
    }
}

/**
 * This function is called from the REKOR software.
 * On req receive the results of reading. 
 * @param {*} req 
 * @param {*} res 
 */
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
                    req.io.emit('reading-plates');

                    // Timer to delay
                    await new Promise(resolve => setTimeout(resolve, 2000));

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
                        readingObjs = {
                            "plate": result.plate,
                            "color": '',
                            "brand": '',
                            "model": '',
                            "year": ''
                        }
                        console.debug("alpr_results - CAR DETAILS: ")
                        console.debug("-> PLATE: " + readingObjs.plate)

                        if (!readingQueue.some(car => car.plate === readingObjs.plate))
                            readingQueue.push(readingObjs)
                    }

                    req.io.emit('read-plates', readingQueue);

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
                    console.debug("alpr_group - CAR DETAILS: ")
                    console.debug("-> PLATE: " + readingObjs.plate)
                    console.debug("-> COLOR: " + readingObjs.color)
                    console.debug("-> BRAND: " + readingObjs.brand)
                    console.debug("-> MODEL: " + readingObjs.model)
                    console.debug("-> YEAR : " + readingObjs.year)

                    // Load info to a global queue list.
                    if (!readingQueue.some(car => car.plate === readingObjs.plate))
                        readingQueue.push(readingObjs)


                    req.io.emit('read-plates', readingQueue);

                    break;

                case 'heartbeat':
                    /**
                     * Every minute, the Scout Agent adds one heartbeat message to the queue. 
                     * The heartbeat provides general health and status information.
                     */
                    console.log('Video Streams: (' + bodyResult.video_streams.length + ')')

                    break;

                default:
                    console.log('REKOR-SCOUT: No dataType detected.');
            }
        }
    } catch (error) {
        console.error(error)
        console.error('REKOR-SCOUT: ERROR --> ' + error.message)
    }
}