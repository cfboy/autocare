const LocationService = require('../collections/location')
const UserService = require('../collections/user')
const HistoryService = require('../collections/history')
const { historyTypes } = require('../collections/history/history.model')
const { ROLES } = require('../collections/user/user.model')
const Stripe = require('../connect/stripe')
const alertTypes = require('../helpers/alertTypes')

/**
 * This function render all locations.
 * @param {*} req 
 * @param {*} res 
 */
exports.locations = async (req, res) => {
    try {
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
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: locationController -> Trying to find locations. ${error.message}`)
        req.session.message = 'Error trying to find locations.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')
    }
}

/**
 * This function render the form to create a new location.
 * @param {*} req 
 * @param {*} res 
 */
exports.createLocation = async (req, res) => {
    let { message, alertType } = req.session

    // clear message y alertType
    req.session.message = ''
    req.session.alertType = ''
    try {
        const products = await Stripe.getAllProducts(),
            // Exclude users with customer role for location users relationship.
            users = await UserService.getUsersPerRoles([ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER])

        res.render('location/create.ejs', { user: req.user, products, users, message, alertType })
    } catch (error) {
        console.error(`ERROR: locationController -> Trying to render create location form. ${error.message}`)
        req.session.message = 'Error trying to render create location form.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/locations')
    }
}

/**
 * This function save/create the new location with their properties.
 * @param {*} req 
 * @param {*} res 
 */
exports.save = async (req, res) => {
    const fields = req.body
    try {
        console.log('Creating New Location: ', fields.name)

        let newLocation = { name: fields.name, services: fields.services, users: fields.users, agentID: fields.agentID }
        let location = await LocationService.getLocationByName(fields.name)
        if (!location) {
            console.debug(`Location ${fields.name} does not exist. Making one...`)
            // Add Location to DB
            location = await LocationService.addLocation(newLocation)

            if (location.users) {
                // Update user locations.
                for (user of location.users) {
                    let updatedUser = await UserService.addUserLocation(user, location)
                    if (!updatedUser)
                        console.debug(`ERROR: LOCATION-CONTROLLER: Can't update User ${updatedUser?.email}.`)
                    else
                        console.debug(`LOCATION-CONTROLLER: Updated User ${updatedUser?.email}.`)
                }
            }

            console.log(
                `A new Location to DB. The ID for ${location.name} is ${location.id}`
            )

            req.session.message = `Location Created ${location.name}.`
            req.session.alertType = alertTypes.CompletedActionAlert
            req.flash('info', 'Location created.')

            res.redirect(`/view-location/${location.id}`)

        } else {
            let message = `That Location ${location.name} already exist.`
            console.error(message)

            // Set the message for alert. 
            req.session.message = message
            req.session.alertType = alertTypes.WarningAlert
            res.redirect('/locations')
        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error.message)
        req.session.message = 'Error trying to create new location.'
        req.session.alertType = alertTypes.ErrorAlert
        // res.status(400).send(error)
        res.redirect('/locations')
    }
}

/**
 * This function render the specific location details.
 * @param {*} req 
 * @param {*} res 
 */
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

            // const locationUsers = await UserService.getUsersByLocationID(location)
            // location.users = locationUsers
            res.status(200).render('location/view.ejs', { user: req.user, location, message, alertType })
        } else {
            console.log('LOCATION-CONTROLLER: Location not found.')
            res.redirect('/locations')
        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error.message)
        req.session.message = 'Error trying to view location details.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/locations')
    }
}

/**
 * This function render the form to edit the location info.
 * @param {*} req 
 * @param {*} res 
 */
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
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error.message)
        req.session.message = 'Error trying to render edit location form.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/locations')
    }
}

/**
 * This function update the existing location properties.
 * @param {*} req 
 * @param {*} res 
 */
exports.update = async (req, res) => {

    const url = req.query.url
    try {
        // Handle checkbox value.
        req.body.isActive = req.body.isActive == 'on' ? true : false
        // Handle empty values.
        req.body.services = req.body.services ? req.body.services : []
        req.body.users = req.body.users ? req.body.users : []
        // Identify the removed users to update their relationship.
        let unselectedUsers = req.body.unselectedUsers ? req.body.unselectedUsers.split(',') : [],
            newSelectedUsers = req.body.newSelectedUsers ? req.body.newSelectedUsers.split(',') : []


        let location = await LocationService.updateLocation(req.body.id, req.body)

        if (!location) {
            req.session.message = `Can't update Location  ${req.body.name}`
            req.session.alertType = alertTypes.WarningAlert

        } else {
            if (location.users && newSelectedUsers.length > 0) {
                // Update user locations.
                for (user of location.users) {

                    // let updatedUser = await UserService.updateUser(user, { location: location })
                    let updatedUser = await UserService.addUserLocation(user, location)
                    if (!updatedUser)
                        console.debug(`ERROR: LOCATION-CONTROLLER: Can't update User ${updatedUser?.email}.`)
                    // else
                    //     console.debug(`LOCATION-CONTROLLER: Updated User ${updatedUser?.email}.`)

                }
            }
            if (unselectedUsers.length > 0) {
                for (user of unselectedUsers) {
                    let updatedUser = await UserService.removeUserLocation(user, location._id)
                    if (!updatedUser)
                        console.debug(`ERROR: LOCATION-CONTROLLER: Can't remove User ${updatedUser?.email}.`)
                    // else
                    //     console.debug(`LOCATION-CONTROLLER: Removed user ${updatedUser?.email}.`)

                }
            }

            //Update the location in session if is the same location.
            if (location.id == req.session.location._id) {
                req.session.location = location
            }

            req.flash('info', 'Location Updated.')
            req.session.message = `Location updated ${location.name}`
            req.session.alertType = alertTypes.CompletedActionAlert
        }
        res.redirect(`${url}`)

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error.message)
        req.session.message = "Error trying to update the location information."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect(`${url}`)
    }
}

// ------------------------------- Delete -------------------------------
/**
 * This function deletes existing loction.
 * @param {*} req 
 * @param {*} res 
 */
exports.delete = async (req, res) => {
    console.log('Deleting Location...')
    const id = req.params.id

    try {
        LocationService.deleteLocation(id)
        // TODO: remove location form user

        // Set the message for alert. 
        req.session.message = `Location Deleted.`
        req.session.alertType = alertTypes.CompletedActionAlert

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR-LOCATION-CONTROLLER : ${error.message}`)
        req.session.message = "Can't delete location."
        req.session.alertType = alertTypes.ErrorAlert
    }

    //Log this action.
    try {
        HistoryService.addHistory("Location deleted", historyTypes.USER_ACTION, req.user, null)
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR-LOCATION-CONTROLLER : ${error.message}`)
        req.session.message = "Can't add to History Log."
        req.session.alertType = alertTypes.ErrorAlert
    }
    res.redirect('/locations')

}


/**
 * This function return the current locations.
 * @param {*} req 
 * @param {*} res 
 */
exports.getCurrentLocation = async (req, res) => {
    try {
        var currentLocation = req.session.location
        var userHasThisLocation = req.user.locations.some(location => location.id === currentLocation?._id)

        const redirect = currentLocation && userHasThisLocation ? false : true;
        res.status(200).send({ redirect: redirect, location: currentLocation ? currentLocation?._id : null })

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error("ERROR: locationController -> Trying to send current location.")
        res.status(500).send(error)
    }
}