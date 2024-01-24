const SubscriptionService = require('../collections/subscription')
const { ROLES } = require('../collections/user/user.model')
const { STATUS } = require('../connect/stripe');
const ServiceService = require('../collections/services')
const UserService = require('../collections/user')
const CarService = require('../collections/cars')
const alertTypes = require('../helpers/alertTypes')
const UtilizationService = require('../collections/utilization')
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
            //Used in canAddCar
            user = await SubscriptionService.setStripeInfoToUser(req.user)

        // clear message y alertType
        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }


        if ([ROLES.ADMIN, ROLES.MANAGER].includes(user.role)) {
            // Handle invalid Cars
            let nullUserCars = await CarService.getCarsWithUserNull()
            if (nullUserCars.length > 0)
                await CarService.handleCarsWithUserNull(nullUserCars)

            cars = await CarService.getCars()

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

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: carsController -> Trying to find user cars. ${error.message}`)
        req.session.message = 'Error trying to find user cars.'
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

        let hasDuplicatedServices = false

        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        let id = req.params.id,
            car = await CarService.getCarByID(id)

        if (car) {
            car.allServices = await ServiceService.getServicesByCar(car)
            let utilization = await UtilizationService.getUtilizationByCar(car)

            // this gives an object with dates as keys
            // Create groups of services.
            if ([ROLES.ADMIN].includes(user.role)) {
                const groups = car.allServices.reduce((groups, service) => {
                    const serviceDate = service.created_date;
                    var date = new Date(serviceDate.getTime());
                    date.setHours(0, 0, 0, 0);
                    if (!groups[date]) {
                        groups[date] = [];
                    }
                    groups[date].push(service);
                    return groups;
                }, {});

                // Edit: to add it in the array format instead
                const groupArrays = Object.keys(groups).map((date) => {
                    return {
                        date,
                        services: groups[date]
                    };
                });

                // Set duplicated flag to service.
                for (group of groupArrays) {
                    if (group.services.length > 1) {
                        for (service of group.services) {
                            service.duplicated = true
                            hasDuplicatedServices = true
                        }
                    }
                }
            }
            res.status(200).render('cars/view.ejs', {
                user,
                car,
                utilization,
                message,
                alertType,
                canEditCar: canEditCar(user, car.id, car.allServices),
                canManageCars: canManageCars(user),
                hasDuplicatedServices
            })
        } else {
            message = 'Car not found.'
            alertType = alertTypes.ErrorAlert
            console.log('Car not found.')
            res.redirect('/cars', { message, alertType })
        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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
        for (sub of user.subscriptions) {
            for (item of sub.items) {
                if (item.cars.length < item.data.quantity && sub.data.status == STATUS.ACTIVE) {
                    siToAddCar.push(item)
                }
            }
        }

        let userCars = await CarService.getAllCarsByUserWithoutSubs(user)

        res.render('cars/create.ejs', { user, allMakes, allModels, siToAddCar, itemID, userCars, message, alertType })

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error)
        res.status(500).send('Something went wrong')
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
            car = await CarService.getCarByID(carID),
            user = req.user

        if (car) {
            let { allMakes, allModels } = await CarService.getAllMakes(),
                userCars = await CarService.getAllCarsByUserWithoutSubs(user)

            res.status(200).render('cars/edit.ejs', { user, userCars, car, allMakes, allModels, url: (url == '/cars' || url == '/account') ? url : `${url}/${carID}` })
        }

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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
            if (await CarService.canUseThisCarForNewSubs(car)) {
                //Remove old car of old subscriptions. 
                if (car.cancel_date != null)
                    await CarService.removeCarFromAllSubscriptions(car)
                // Add car to subscription
                // fields.subItem.split('/')[0] has the subscription ID
                let subscriptionID = fields.subItem.split('/')[0]
                // fields.subItem.split('/')[1] has the subItem ID 
                let itemID = fields.subItem.split('/')[1]

                //Get subscription by id to handleUtilization.
                let currentSub = await SubscriptionService.getSubscriptionById(subscriptionID)
                // Add old utilization / History
                await UtilizationService.handleUtilization(car, currentSub.data.current_period_start, currentSub.data.current_period_end)

                let subscription = await SubscriptionService.addSubscriptionCar(subscriptionID, car, itemID)

                if (subscription) {
                    req.session.message = `Added Car to subscription: ${subscription.id}. New Car:  ${car.carName()}`
                }

                req.session.message = `New Car:  ${car.carName()}.`
                req.session.alertType = alertTypes.CompletedActionAlert
                req.flash('info', 'Car created.')
            } else {
                req.session.message = `This Car: (${car.carName()}) can not be added to this subscription..`
                req.session.alertType = alertTypes.WarningAlert
            }
        } else {
            req.session.message = `Car not found or created.`
            req.session.alertType = alertTypes.ErrorAlert
        }

        // TODO: add dynamic redirect
        res.redirect('/memberships')

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
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
            req.session.message = `Car updated: ${car.carName()}.`
            req.session.alertType = alertTypes.CompletedActionAlert
        }
        res.redirect(`${url}`)

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error.message)
        req.session.message = "Error trying to update the car information."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect(`${url}`)
    }
}

/**
 * This function deletes existing car.
 * First remove the reference on subscription obj, then delete the Car obj.
 * @param {*} req 
 * @param {*} res 
 */
// TODO: TEST THIS FUNCTION
exports.delete = async (req, res) => {
    console.log('Deleting Car...')
    const carID = req.params.id

    try {
        let car = await CarService.getCarByID(carID)
        // removeCarFromAllSubscriptions = await CarService.removeCarFromAllSubscriptions(car)

        if (car) {
            CarService.deleteCar(car.id) //TODO: verify if is need to delete the car forever.
            // Set the message for alert. 
            req.session.message = `Car Deleted.`
            req.session.alertType = alertTypes.CompletedActionAlert
        } else {
            req.session.message = "Can't delete car."
            req.session.alertType = alertTypes.ErrorAlert
        }

    } catch (error) {
        console.error(`ERROR-CAR-CONTROLLER : ${error.message}`)
        req.session.message = "Can't delete car."
        req.session.alertType = alertTypes.ErrorAlert
    }

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
        const lingua = req.res.lingua.content

        let { plateNumber, newItem, addToCart, subscriptionEmail, oldProcess } = req.body,
            car = await CarService.getCarByPlate(plateNumber),
            subscriptionList = req.body.subscriptionList,
            invalidCar = false,
            invalidMsj = ''
        canUseThisCar = car ? await CarService.canUseThisCarForNewSubs(car) : false
        let customer, item = null,
            addType

        // if the canUseThisCar is true, it means that this car is an existing and valid car to assign to a new membership.
        if ((car && !canUseThisCar)) {
            invalidCar = true
            invalidMsj = lingua.car.existingCar

        } else if (subscriptionList?.some(car => car.plate === plateNumber)) {
            invalidCar = true
            invalidMsj = lingua.car.alreadyAddedToCart

        } else if (addToCart) {
            if (oldProcess) {
                addType = 'db'
                // If the user is logged create a cart in the DB.
                let result = await UserService.addItemToCart(req.user.id, newItem)
                item = result.itemToRtrn
                if (result.customer && item)
                    console.debug('Item Added successfully to ' + subscriptionEmail)

            } else {
                addType = 'cookie'
                // If the user is not logged in create a cart in the cookies.
                let cookieCart
                if (!req.cookies.cart) {
                    cookieCart = JSON.stringify([]);
                } else {
                    cookieCart = req.cookies.cart
                }
                cookieCart = JSON.parse(cookieCart);
                cookieCart.push(newItem)
                res.cookie('cart', JSON.stringify(cookieCart));
                res.cookie('subscriptionEmail', subscriptionEmail);
                item = newItem;
            }

        }

        res.send({ existingCar: invalidCar, invalidMsj: invalidMsj, item, addType, subscriptionEmail })

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req?.user?.email)
            })
        console.error(`ERROR: carController -> Trying to validate car plate. ${error.message}`)
        res.render('Error validating car plate.')
    }

}

exports.syncUtilization = async (req, res) => {
    try {
        let cars = JSON.parse(req.body.cars)

        if (cars) {
            let updatedQty = await UtilizationService.syncCarsUtilization(cars)
            res.send({ updatedQty: updatedQty, message: `Synchronization Completed. (Updated Cars: ${updatedQty})` })

        } else {
            res.send({ updatedQty: 0, message: `Not cars to synchronize.` })
        }


    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: carsController -> Trying to syncUtilization. ${error.message}`)
        res.send({ message: 'Error on sync % utilization.' })
    }
}