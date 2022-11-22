const SubscriptionService = require('../collections/subscription')
const CarService = require('../collections/cars')
const alertTypes = require('../helpers/alertTypes')
const ServiceService = require('../collections/services')
const { STATUS } = require('../connect/stripe');
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const Stripe = require('../connect/stripe')

let readingObjs = {}

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
        let cart = user.cart
        if (user.billingID) {
            let { allMakes, allModels } = await CarService.getAllMakes()

            const prices = await Stripe.getAllPrices()

            let userCars = await CarService.getAllCarsByUserWithoutSubs(user)

            res.render('auth/createSubs.ejs', { cart, message, alertType, user, allMakes, allModels, prices, userCars })
        } else {
            req.session.message = "This user don't have stripe account."
            req.session.alertType = alertTypes.WarningAlert
            res.redirect('/account')
        }
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

    res.render('dashboards/validateMembership.ejs', { user, message, alertType })

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
            car = await CarService.getCarByPlate(carPlate),
            user = req.user

        let customer, subscription, services, hasService

        if (car) {
            // TODO: Handle new/different subscriptions for old cars.
            // subscription = await SubscriptionService.getSubscriptionByCar(car)
            // subscription = await SubscriptionService.getLastActiveSubscriptionByCar(car)
            subscription = await SubscriptionService.getLastSubscriptionByCar(car)

            customer = subscription?.user
            services = await ServiceService.getServicesByCar(car)
            hasService = services.some(service => service.created_date.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0))
            car.hasService = hasService
            car.isValid = car?.cancel_date ? (car.cancel_date < new Date()) : true
            // TODO: use selected location 
            //Log this action.
            // let actionType = inputType == 'System' ? historyTypes.SYSTEM_ACTION : historyTypes.USER_ACTION
            // HistoryService.addHistory(`Validate Membership: ${carPlate}`, actionType, req.user, req?.user?.locations[0])
        }

        res.render('ajaxSnippets/validationResult.ejs', {
            user,
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
            req.io.emit('carcheck-data', req.body);
        }

        res.status(200).send('Ok')
    } catch (error) {
        console.error(error)
        console.error('REKOR-SCOUT: ERROR --> ' + error.message)
        res.status(500).send("Error")
    }
}

exports.readingData = async (req, res) => {
    try {
        let dataType = req.body.data_type,
            bodyResult = req.body,
            cameras = bodyResult?.video_streams
            cameraID = req.session.cameraID

        for (var camera of cameras) {
            if (camera.camera_name == cameraID)
                console.log(`REKOR-SCOUT: Camera: ${camera?.camera_name}`)
        }

        switch (dataType) {
            case 'alpr_results':
                req.io.emit('reading-plates');

                /**
                 * Scout generates an alpr_results JSON value for every
                 * frame of video in which a license plate is recognized. 
                 * 
                 * This is for single plate reads.
                 * https://docs.rekor.ai/rekor-scout/application-integration/json-plate-results
                 */

                // console.log("Processing Time (MS): " + bodyResult.processing_time_ms)

                let plate = bodyResult.results[0].plate
                // console.log(`IDENTFIED PLATE: ${plate} (${bodyResult.results[0].confidence})`)
                readingObjs = {
                    "plate": plate
                }

                if (readingObjs.plate !== '' & readingObjs.plate?.length > 3) {
                    // console.debug(`IDENTFIED PLATE: ${plate} (${bodyResult.results[0].confidence})`)
                    req.io.emit('read-plates', readingObjs);
                }

                req.io.emit('stop-reading-plates');
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
                    // "color": bodyResult.vehicle.color[0].name,
                    // "brand": bodyResult.vehicle.make[0].name,
                    // "model": bodyResult.vehicle.make_model[0].name,
                    // "year": bodyResult.vehicle.year[0].name
                }
                console.debug("alpr_group - CAR DETAILS: ")
                console.debug("-> PLATE: " + readingObjs.plate)
                // console.debug("-> COLOR: " + readingObjs.color)
                // console.debug("-> BRAND: " + readingObjs.brand)
                // console.debug("-> MODEL: " + readingObjs.model)
                // console.debug("-> YEAR : " + readingObjs.year)

                // Load info to a global queue list.
                // if (!readingQueue.some(car => car.plate === readingObjs.plate))
                //     readingQueue.push(readingObjs)


                // req.io.emit('read-plates', readingQueue);

                break;

            case 'heartbeat':
                /**
                 * Every minute, the Scout Agent adds one heartbeat message to the queue. 
                 * The heartbeat provides general health and status information.
                 */
                console.log('heartbeat: Video Streams: (' + bodyResult.video_streams.length + ')')

                break;

            default:
                console.log('REKOR-SCOUT: No dataType detected.');
        }

        res.status(200).send('Ok')
    } catch (error) {
        console.error(error)
        console.error('REKOR-SCOUT: ERROR --> ' + error.message)
        res.status(500).send("Error")
    }
}

/**
 * This function renders the handle invalid subscriptions template.
 * @param {*} req 
 * @param {*} res 
 */
exports.handleInvalidSubscriptions = async (req, res) => {
    try {
        // console.debug('handleInvalidSubscriptions')
        const user = req.user
        let { invalidSubs, message, alertType } = req.session

        // Clear session variables
        // TODO: Move to external function
        // req.session.invalidSubs = null
        req.session.message = null
        req.session.alertType = null


        res.status(200).render('subscriptions/handleInvalidSubscriptions.ejs', { user, message, alertType, invalidSubs })

    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render edit cars form."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/cars')
    }
}

exports.confirmValidCars = async (req, res) => {
    try {
        // console.debug('confirmValidCars')

        let { subscriptionID, selectedCars, carsToRemove } = req.body

        let subscription = await SubscriptionService.getSubscriptionById(subscriptionID)

        if (!subscription)
            throw new Error(`Not found subscription.`)


        selectedCars = selectedCars ? selectedCars.split(',') : []
        // Clean Cancel Date
        for (carID of selectedCars) {
            let car = await CarService.getCarByID(carID)
            if (car) {
                car = await CarService.updateCar(carID, { cancel_date: null })
            }

        }

        carsToRemove = carsToRemove ? carsToRemove.split(',') : []
        // Set Cancel Date
        for (carID of carsToRemove) {
            let car = await CarService.getCarByID(carID)
            if (car) {
                car = await CarService.updateCar(carID, { cancel_date: new Date(subscription?.data?.current_period_end * 1000) })
            }

        }

        req.session.message = `Confirmed ${selectedCars.length} valid cars `
        req.session.alertType = alertTypes.CompletedActionAlert

    } catch (error) {
        console.debug(error.message)
        console.debug(error)
        req.session.message = "Error trying to confirm valid cars."
        req.session.alertType = alertTypes.ErrorAlert
    }
    res.redirect('/account')
}

/**
 * This function sync the selected subscription with stripe to update all information of this subscription.
 * The btn has the property value and this value is the subscription ID.
 * @param {*} req 
 * @param {*} res 
 */
exports.syncSubscription = async (req, res) => {
    try {

        let subscriptionID = req.body.value

        if (subscriptionID) {
            let subscription = await Stripe.getSubscriptionById(subscriptionID)

            if (subscription) {
                let subscriptionItems = subscription.items.data
                let mySubscription = await SubscriptionService.getSubscriptionById(subscription.id)

                items = []
                for (subItem of subscriptionItems) {
                    let itemToUpdate = mySubscription?.items?.find(item => item.id == subItem.id)
                    if (itemToUpdate) {
                        let newItem = { id: itemToUpdate.id, cars: itemToUpdate.cars, data: subItem }
                        items.push(newItem)
                    }
                }

                updates = {
                    data: subscription,
                    items: items
                }

                subscription = await SubscriptionService.updateSubscription(subscription.id, updates);

                alertInfo = { message: `Your membership ${subscription.id} has been updated successfully. `, alertType: alertTypes.BasicAlert }
                console.debug(alertInfo.message)
                res.send(`Sync Completed. The page is reloaded in a few seconds...`)

            } else {
                console.debug('Not found Membership.')

                res.send('Not found Membership.')
            }
        } else {
            console.log('Missing membership ID')
            res.send('Missing Membership ID.')
        }

    } catch (error) {
        console.error("ERROR: subscriptionsController -> Tyring to sync membership.")
        console.error(error.message)
        res.render('Error on sync membership.')
    }
}