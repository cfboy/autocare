const UserService = require('../collections/user')
const CarService = require('../collections/cars')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const alertTypes = require('../helpers/alertTypes')

/**
 * This function render all cars of current user.
 * If the current user is ROLE.MANAGER then find only CUSTOMERS users.
 * @param {*} req 
 * @param {*} res 
 */
exports.cars = async (req, res) => {
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
            cars = await CarService.getCars(user.cars)

            res.render('cars/index.ejs', { user, cars, message, alertType })

        }
    } catch (error) {
        console.error("ERROR: userController -> Tyring to find user cars.")
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
        let { message, alertType } = req.session

        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        let id = req.params.id,
            car = await CarService.getCarByID(id)

        if (car) {
            res.status(200).render('cars/view.ejs', {
                user: req.user,
                car,
                message,
                alertType
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
    // clear message y alertType
    req.session.message = ''
    req.session.alertType = ''

    res.render('cars/create.ejs', { user: req.user, message, alertType })
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

        if (car)
            res.status(200).render('cars/edit.ejs', { user: req.user, car, url: (url == '/cars' || url == '/account' || url == '/validateMembership') ? url : `${url}/${id}` })

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

        let car = await CarService.addCar(fields.name ? fields.name : 'My Car', fields.brand, fields.model, fields.plate)

        console.debug(`A new car added to DB. ID: ${car.id}.`)

        // Add car to user
        let user = await UserService.addUserCar(req.user.id, car)

        req.session.message = `New Car: ${car.name}.`
        req.session.alertType = alertTypes.CompletedActionAlert
        req.flash('info', 'Car created.')
        res.redirect('/cars')

    } catch (error) {
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
            req.session.message = `Can't update car  ${req.body.name}`
            req.session.alertType = alertTypes.WarningAlert

        } else {
            req.flash('info', 'Car Updated.')
            req.session.message = `Car updated ${car.name}`
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
    const id = req.params.id

    try {
        let user = UserService.removeUserCar(req.user.id, id)
        if (!user) {
            req.session.message = `Can't delete the car from user.`
            req.session.alertType = alertTypes.CompletedActionAlert
        } else {
            CarService.deleteCar(id)
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