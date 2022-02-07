const LocationService = require('../collections/location')
const UserService = require('../collections/user')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const { ROLES } = require('../collections/user/user.model')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')

// ------------------------------- CRUDS ------------------------------- 

// ------------------------------- Create -------------------------------

exports.locations = async (req, res) => {
    // Message for alerts
    let { message, alertType } = req.session
    // clear message y alertType
    if (message) {
        req.session.message = ''
        req.session.alertType = ''
    }
    // Passport store the user in req.user
    let user = req.user

    if (!user) {
        res.redirect('/')
    } else {
        let locations = await LocationService.getLocations()

        res.render('location/index.ejs', { user, locations, message, alertType })

    }
}

// Route for create location.
exports.createLocation = async (req, res) => {
    let { message, alertType } = req.session

    // clear message y alertType
    req.session.message = ''
    req.session.alertType = ''
    // TODO: Find all products to link with location
    const products = await Stripe.getAllProducts(),
        users = await UserService.getUsersPerRoles([ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER])

    res.render('location/create.ejs', { user: req.user, products, users, message, alertType })
}

exports.save = async (req, res) => {
    const fields = req.body
    try {
        console.log('Creating New Location: ', fields.name)

        let location = await LocationService.getLocationByName(fields.name)
        if (!location) {
            console.log(`Location ${fields.name} does not exist. Making one...`)
            // TODO: Add Location to DB
            location = await LocationService.addLocation({ name: fields.name, services: fields.services, users: fields.users })

            console.log(
                `A new Location to DB. The ID for ${location.name} is ${location.id}`
            )

            req.session.message = `Location Created ${location.name}.`
            req.session.alertType = alertTypes.CompletedActionAlert

            res.redirect('/locations')

        } else {
            let message = `That Location ${location.name} already exist.`
            console.log(message)

            // Set the message for alert. 
            req.session.message = message
            req.session.alertType = alertTypes.WarningAlert
            res.redirect('/locations')
        }
    } catch (error) {
        // console.error(error.message)
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
        // res.status(400).send(error)
        res.redirect('/locations')
    }
}

// ------------------------------- Read -------------------------------
exports.viewLocation = async (req, res) => {
    try {
        let { message, alertType } = req.session
        let services = []

        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        const id = req.params.id;
        const location = await LocationService.getLocationById(id)

        if (location) {
            //On location.services the values is the stripe product id.

            for (const service of location.services) {
                console.debug(`LOCATION-CONTROLLER: Service: ${service}`)
                let serviceInfo = await Stripe.getProductInfoById(service)
                if (serviceInfo)
                    services.push(serviceInfo)
            }

            location.services = services

            const locationUsers = await UserService.getLocationUsers(location?.users?.toObject())
            // const testGetMultipleUsers = await UserService.getUsersPerRoles([ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER])
            location.users = locationUsers
            res.status(200).render('location/view.ejs', { user: req.user, location, message, alertType })
        } else {
            console.log('LOCATION-CONTROLLER: Location not found.')
            res.redirect('/locations')
        }
    } catch (error) {
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/locations')
    }
}

// ------------------------------- Update -------------------------------

// Route for view/edit location info.
exports.editLocation = async (req, res) => {
    try {
        const id = req.params.id;
        const url = req.query.url ? req.query.url : '/locations'
        let location = await LocationService.getLocationById(id)

        if (location) {
            const products = await Stripe.getAllProducts(),
                users = await UserService.getUsersPerRoles([ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER])

            res.status(200).render('location/edit.ejs', { user: req.user, products, users, location, url: url == '/locations' ? url : `${url}/${id}` })
        } else {
            console.log('LOCATION-CONTROLLER: Location not found.')
            res.redirect(`${url}`)
        }
    } catch (error) {
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/locations')
    }
}

exports.update = async (req, res) => {

    const url = req.query.url
    try {
        // Handle checkbox value.
        req.body.isActive = req.body.isActive == 'on' ? true : false
        req.body.services = req.body.services ? req.body.services : []
        req.body.users = req.body.users ? req.body.users : []
        let unselectedUsers = req.body.unselectedUsers ? req.body.unselectedUsers.split(',') : []

        const location = await LocationService.updateLocation(req.body.id, req.body)

        if (!location) {
            req.session.message = `Can't update Location  ${req.body.name}`
            req.session.alertType = alertTypes.WarningAlert

        } else {
            req.flash('info', 'Update Completed.')
            req.session.message = `Location updated ${location.name}`
            req.session.alertType = alertTypes.CompletedActionAlert

            if (location.users) {
                // Update user locations.
                for (user of location.users) {

                    let updatedUser = await UserService.updateUser(user, { location: location })

                    if (!updatedUser) {
                        console.debug(`LOCATION-CONTROLLER: Can't update User  ${user?.email}.`)

                    } else {
                        console.debug(`LOCATION-CONTROLLER: Updated User  ${user?.email}.`)
                    }
                }
            }
            if (unselectedUsers){
                for (user of unselectedUsers) {
                    let updatedUser = await UserService.updateUser(user, { location: null })

                    if (!updatedUser) {
                        req.session.message += `Cant Remove User from Location  ${user?.email}.`

                    } else {
                        req.session.message += `Removed User from updated ${user.email}.`
                    }
                }
            }
        }
        res.redirect(`${url}`)

    } catch (error) {
        req.session.message = error.message
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect(`${url}`)
    }
}

// ------------------------------- Delete -------------------------------
exports.delete = async (req, res) => {
    console.log('Deleting Location...')
    const id = req.params.id

    try {
        LocationService.deleteLocation(id)

        // Set the message for alert. 
        req.session.message = `Location Deleted.`
        req.session.alertType = alertTypes.CompletedActionAlert

    } catch (error) {
        console.log(`ERROR-LOCATION-CONTROLLER : ${error.message}`)
        req.session.message = "Can't delete location."
        req.session.alertType = alertTypes.ErrorAlert
    }

    try {
        HistoryService.addHistory("Location deleted", historyTypes.USER_ACTION, req.user, null)
    } catch (error) {
        console.debug(`ERROR-LOCATION-CONTROLLER : ${error.message}`)
        req.session.message = "Can't add to History."
        req.session.alertType = alertTypes.ErrorAlert
    }
    res.redirect('/locations')

}