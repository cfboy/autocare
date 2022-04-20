const SubscriptionService = require('../collections/subscription')
const { ROLES } = require('../collections/user/user.model')
const ServiceService = require('../collections/services')
const UserService = require('../collections/user')
const CarService = require('../collections/cars')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const alertTypes = require('../helpers/alertTypes')
const Stripe = require('../connect/stripe')
const UtilizationService = require('../collections/utilization')
const { canDeleteCar,
    canManageCars,
    canEditCar,
    canAddCar
} = require('../config/permissions')
const userService = require('../collections/user/user.service')

/**
 * This function render all cars of current user.
 *
 * @param {*} req 
 * @param {*} res 
 */
exports.cars = async (req, res) => {
    try {
        // Message for alerts
        let { message, alertType } = req.session,
            cars,
            // Passport store the user in req.user
            user = await SubscriptionService.setStripeInfoToUser(req.user)

        // clear message y alertType
        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }

        if (!user) {
            res.redirect('/')
        } else {
            // Handle invalid Cars
            let nullUserCars = await CarService.getCarsWithUserNull()
            if (nullUserCars.length > 0)
                await CarService.handleCarsWithUserNull(nullUserCars)

            if ([ROLES.ADMIN, ROLES.MANAGER].includes(user.role)) {
                cars = await CarService.getCars()

                // Execute this logic for Admins and Managers to calculate utilization on old cars.
                for (carObj of cars) {
                    let subscription = await SubscriptionService.getSubscriptionByCar(carObj)
                    let startDate = new Date(subscription.data.current_period_start * 1000),
                        endDate = new Date(subscription.data.current_period_end * 1000),
                        daysBetweenTwoDates = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)

                    let services = await ServiceService.getServicesByCarBetweenDates(carObj, startDate, endDate),
                        percentage = (services.length / daysBetweenTwoDates)

                    if (carObj.utilization?.start_date == null || carObj.utilization?.end_date == null || carObj?.utilization?.services != services.length || carObj?.utilization?.percentage != percentage)
                        await CarService.updateCar(carObj.id, {
                            'utilization.start_date': startDate,
                            'utilization.end_date': endDate,
                            'utilization.services': services.length,
                            'utilization.percentage': percentage
                        })
                }

            } else {
                cars = await CarService.getAllCarsByUser(user)
            }

            // Get allServices for car. 
            for (carObj of cars) {
                carObj.allServices = await ServiceService.getServicesByCar(carObj)
            }

            res.render('cars/index.ejs', {
                user, cars, message, alertType,
                canAddCar: canAddCar(user),
                canManageCars: canManageCars(user)
            })

        }
    } catch (error) {
        console.error("ERROR: carsController -> Tyring to find user cars.")
        console.error(error.message)
        req.session.message = 'Error tyring to find user cars.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

/**
 * This function renders the car information.
 * @param {*} req 
 * @param {*} res 
 */
exports.view = async (req, res) => {
    try {
        let { message, alertType } = req.session,
            user = req.user;

        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        let id = req.params.id,
            car = await CarService.getCarByID(id)

        if (car) {
            car.allServices = await ServiceService.getServicesByCar(car)
            let utilization = await UtilizationService.getUtilizationByCar(car)
            res.status(200).render('cars/view.ejs', {
                user,
                car,
                utilization,
                message,
                alertType,
                canEditCar: canEditCar(user, car.id, car.allServices),
                canManageCars: canManageCars(user)
            })
        } else {
            message = 'Car not found.'
            alertType = alertTypes.ErrorAlert
            console.log('Car not found.')
            res.redirect('/cars', { message, alertType })
        }
    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render the car information."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')

    }
}

/**
 * This function renders the create cars form.
 * @param {*} req 
 * @param {*} res 
 */

exports.create = async (req, res) => {
    let { message, alertType } = req.session
    // This values are filled if click Add Car Btn in a subscription item.
    let { itemID, userID } = req.query
    let user = req.user

    if (userID) {
        user = await UserService.getUserById(userID)
    }
    // clear message y alertType
    req.session.message = ''
    req.session.alertType = ''

    try {
        let { allMakes, allModels } = await CarService.getAllMakes()

        let siToAddCar = []
        // let stripeItem
        user = await SubscriptionService.setStripeInfoToUser(user)
        for (subscription of user.subscriptions) {
            for (item of subscription.items) {
                // stripeItem = await Stripe.getSubscriptionItemById(item.id)
                if (item.cars.length < item.data.quantity) {
                    siToAddCar.push(item)
                }
            }
        }

        res.render('cars/create.ejs', { user, allMakes, allModels, siToAddCar, itemID, message, alertType })

    } catch (error) {
        console.log(error)
        res.status(500).send('Something went worng')
    }
}

/**
 * This function renders the edit car.
 * @param {*} req 
 * @param {*} res 
 */
exports.edit = async (req, res) => {
    try {
        const carID = req.params.id,
            url = req.query.url ? req.query.url : '/account',
            car = await CarService.getCarByID(carID)

        if (car) {
            let { allMakes, allModels } = await CarService.getAllMakes()
            res.status(200).render('cars/edit.ejs', { user: req.user, car, allMakes, allModels, url: (url == '/cars' || url == '/account') ? url : `${url}/${carID}` })
        }

    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render edit cars form."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/cars')
    }
}

/**
 * This function save/create the new car.
 * @param {*} req 
 * @param {*} res 
 */
exports.save = async (req, res) => {
    const fields = req.body
    try {
        console.log('Creating New Car: ', fields.brand)

        let car = await CarService.addCar(fields.brand, fields.model, fields.plate, fields.userID)

        if (car) {
            console.debug(`A new car added to DB. ID: ${car.id}.`)

            // Add car to subscription
            // fields.subItem.split('/')[0] has the subscription ID
            // fields.subItem.split('/')[1] has the subItem ID 
            let subscription = await SubscriptionService.addSubscriptionCar(fields.subItem.split('/')[0], car, fields.subItem.split('/')[1])

            if (subscription) {
                req.session.message = `
            Added Car to subscription: ${subscription.id}

            New Car:  ${car.brand} - ${car.model} - ${car.plate}`
            }

            req.session.message = `New Car:  ${car.brand} - ${car.model} - ${car.plate}.`
            req.session.alertType = alertTypes.CompletedActionAlert
            req.flash('info', 'Car created.')
        } else {
            req.session.message = `Car not created..`
            req.session.alertType = alertTypes.ErrorAlert
            // req.flash('er', 'Car created.')
        }
        res.redirect('/cars')

    } catch (error) {
        console.error(error)
        console.error(error.message)

        if (error.code === 11000)
            req.session.message = "This car is already registered in the system."
        else
            req.session.message = "Error trying to add car to subscription."

        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

/**
 * This function update the existing car properties.
 * @param {*} req 
 * @param {*} res 
 */
exports.update = async (req, res) => {

    const url = req.query.url
    try {

        let car = await CarService.updateCar(req.body.id, req.body)

        if (!car) {
            req.session.message = `Can't update car  ${req.body.brand}`
            req.session.alertType = alertTypes.WarningAlert

        } else {
            req.flash('info', 'Car Updated.')
            req.session.message = `Car updated: ${car.model} - ${car.brand} - ${car.plate}.`
            req.session.alertType = alertTypes.CompletedActionAlert
        }
        res.redirect(`${url}`)

    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to update the car information."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect(`${url}`)
    }
}

/**
 * This function deletes existing car.
 * First remove the reference on User obj, then delete the Car obj.
 * @param {*} req 
 * @param {*} res 
 */
exports.delete = async (req, res) => {
    console.log('Deleting Car...')
    const carID = req.params.id

    try {
        let car = await CarService.getCarByID(carID),
            subscription = await SubscriptionService.getSubscriptionByCar(car)

        let item = subscription.items.find(item =>
            item.cars.find(itemCar =>
                itemCar.id = car.id))

        let updatedSubscription = await SubscriptionService.removeSubscriptionCar(subscription.id, item.id, car)


        // Validate if the car is removed from user.
        let notDeletedCar = updatedSubscription.items.some(item =>
            item.cars.some(itemCar =>
                itemCar.id = car.id))

        if (!updatedSubscription || notDeletedCar) {
            req.session.message = `Can't delete the car from subscription.`
            req.session.alertType = alertTypes.WarningAlert
        } else {
            CarService.deleteCar(carID) //TODO: verify if is need to delete the car forever.
            // Set the message for alert. 
            req.session.message = `Car Deleted.`
            req.session.alertType = alertTypes.CompletedActionAlert
        }

    } catch (error) {
        console.debug(error)
        console.log(`ERROR-CAR-CONTROLLER : ${error.message}`)
        req.session.message = "Can't delete car."
        req.session.alertType = alertTypes.ErrorAlert
    }

    // //Log this action.
    // try {
    //     HistoryService.addHistory("Location deleted", historyTypes.USER_ACTION, req.user, null)
    // } catch (error) {
    //     console.debug(`ERROR-LOCATION-CONTROLLER : ${error.message}`)
    //     req.session.message = "Can't add to History Log."
    //     req.session.alertType = alertTypes.ErrorAlert
    // }

    res.redirect('/cars')

}

/**
 * This function is called on AJAX function to validate if the carPlate is valid or not.
 * The validation is make looking into the recently added car to cart before checkout or in the Car tables on DB.
 * @param {*} req 
 * @param {*} res 
 */
exports.validatePlate = async (req, res) => {
    try {
        let { plateNumber, newItem, addToCart } = req.body,
            car = await CarService.getCarByPlate(plateNumber),
            subscriptionList = req.body.subscriptionList,
            existingCar = false


        if (car || subscriptionList?.some(car => car.plate === plateNumber)) {
            existingCar = true
        } else if (addToCart) {
            let [customer, item] = await UserService.addItemToCart(req.user.id, newItem)

            if (customer && item)
                console.debug('Item Added successfully')
        }

        res.send({ existingCar: existingCar })

    } catch (error) {
        console.error("ERROR: carController -> Tyring to validate car plate.")
        console.error(error.message)
        res.render('Error validating car plate.')
    }

}