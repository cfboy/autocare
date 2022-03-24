const SubscriptionService = require('../collections/subscription')
const CarService = require('../collections/cars')
const alertTypes = require('../helpers/alertTypes')

/**
 * This function renders the handle invalid subscriptions template.
 * @param {*} req 
 * @param {*} res 
 */
exports.handleInvalidSubscriptions = async (req, res) => {
    try {
        console.debug('handleInvalidSubscriptions')
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
        console.debug('confirmValidCars')
        let { message, alertType } = req.session

        let { subscriptionID, selectedCars, carsToRemove } = req.body

        let subscription = await SubscriptionService.getSubscriptionById(subscriptionID)

        if (!subscription)
            throw new Error(`Not found subscription.`)


        selectedCars = selectedCars ? selectedCars.split(',') : []

        carsToRemove = carsToRemove ? carsToRemove.split(',') : []

        for (carID of carsToRemove) {
            let car = await CarService.getCarByID(carID)
            if (car) {
                car = await CarService.updateCar(carID, { cancel_date: subscription?.data?.current_period_end })
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
    // TODO: update invalid list
    res.redirect('/account')
}