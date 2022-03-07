const UserService = require('../collections/user')
const CarService = require('../collections/cars')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const alertTypes = require('../helpers/alertTypes')
const Stripe = require('../connect/stripe')
const { canDeleteCar,
    canManageCars,
    canEditCar,
    canAddCar
} = require('../config/permissions')

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
        user = await Stripe.setStripeInfoToUser(req.user)

        // clear message y alertType
        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }

        if (!user) {
            res.redirect('/')
        } else {
            let userCars = []
            // TODO: move this to service.
            for (customerSub of user.subscriptions) {
                // Iterates the items on DB subscription.
                for (customerItem of customerSub.items) {
                    // then iterates cars in DB item.
                    for (customerCar of customerItem.cars) {
                        userCars.push(customerCar)
                    }
                }
            }
            cars = await CarService.getCars(userCars)

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
            res.status(200).render('cars/view.ejs', {
                user,
                car,
                message,
                alertType,
                canEditCar: canEditCar(user, car.id),
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
    let { itemID } = req.query
    let user = req.user
    // clear message y alertType
    req.session.message = ''
    req.session.alertType = ''

    try {
        let { allMakes, allModels } = await CarService.getAllMakes()

        let siToAddCar = []
        let stripeItem
        for (subscription of user.subscriptions) {
            for (item of subscription.items) {
                stripeItem = await Stripe.getSubscriptionItemById(item.id)
                if (item.cars.length < stripeItem.quantity) {
                    siToAddCar.push(stripeItem)
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

        let car = await CarService.addCar(fields.brand, fields.model, fields.plate)

        console.debug(`A new car added to DB. ID: ${car.id}.`)

        // Add car to user
        let user = await UserService.addUserCar(req.user.id, car, fields.subItem.split('/')[0], fields.subItem.split('/')[1])

        req.session.message = `New Car:  ${car.brand} - ${car.model} - ${car.plate}.`
        req.session.alertType = alertTypes.CompletedActionAlert
        req.flash('info', 'Car created.')
        res.redirect('/cars')

    } catch (error) {
        console.error(error)
        console.error(error.message)

        if (error.code === 11000)
            req.session.message = "This car is already registered in the system."
        else
            req.session.message = "Error trying to add car to the current user."

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
            userCar = await UserService.getUserByCar(car)

        let subscription = userCar.subscriptions.find(subscription =>
            subscription.items.find(item =>
                item.cars.find(itemCar =>
                    itemCar.id = car.id)))

        let user = await UserService.removeUserCar(userCar.id, subscription.id, subscription.items[0].id, car)

        // Validate if the car is removed from user.
        let notDeletedCar = user?.subscriptions?.some(subscription =>
            subscription.items.some(item =>
                item.cars.some(itemCar =>
                    itemCar.id = car.id)))

        if (!user || notDeletedCar) {
            req.session.message = `Can't delete the car from user.`
            req.session.alertType = alertTypes.WarningAlert
        } else {
            CarService.deleteCar(carID)
            // Set the message for alert. 
            req.session.message = `Car Deleted.`
            req.session.alertType = alertTypes.CompletedActionAlert
        }

    } catch (error) {
        console.log(`ERROR-USER-CONTROLLER : ${error.message}`)
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
        let carPlate = req.body.plateNumber,
            car = await CarService.getCarByPlate(carPlate),
            subscriptionList = req.body.subscriptionList,
            existingCar = false


        if (car || subscriptionList.some(car => car.plate === carPlate)) {
            existingCar = true
        }

        res.send({ existingCar: existingCar })

    } catch (error) {
        console.error("ERROR: carController -> Tyring to validate car plate.")
        console.error(error.message)
        res.render('Error validating car plate.')
    }

}

exports.services = async (req, res) => {
    try {

        // Message for alerts
        let { message, alertType } = req.session,
            cars,
            // Passport store the user in req.user
            // TODO: implement for othe user.
            user = req.user

        // clear message y alertType
        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }

        if (!user) {
            res.redirect('/')
        } else {

            let userCars = await CarService.getAllCarsByUser(user)

            let services = await CarService.getAllServicesByCarList(userCars)

            // Manage services by car on client side.
            res.render('services/index.ejs', {
                user, cars, message, alertType,
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

// TODO: change services because the services now are on cars.
exports.viewService = async (req, res) => {
    try {

        // Message for alerts
        let { message, alertType } = req.session,
            cars,
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
            let id = req.params.id,
                carID = req.query.carID

            let service = await CarService.getServicesByIdAndCarId(id, carID)

            res.render('services/view.ejs', {
                user, message, alertType,
                service
            })

        }
    } catch (error) {
        console.error(error.message)
        req.session.message = "Error trying to render the service."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')

    }
}