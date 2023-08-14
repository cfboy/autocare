const SubscriptionService = require('../collections/subscription')
const LocationService = require('../collections/location')
const UserService = require('../collections/user')
const { ROLES } = require('../collections/user/user.model')
const alertTypes = require('../helpers/alertTypes')

async function validateSubscriptions(req, res, next) {
    // console.debug('validateSubscriptions')
    let user = await SubscriptionService.setStripeInfoToUser(req.user)

    if (user?.subscriptions?.length < 1 && [ROLES.CUSTOMER].includes(user.role)) {
        req.flash('warning', 'Create a membership to continue.')
        // res.redirect('/create-subscriptions')
        res.redirect('/subscribe')
    } else {
        let invalidSubs = user?.subscriptions.filter(subs => subs.items.some(item => !item.isValid))

        if (invalidSubs?.length > 0) {
            req.session.invalidSubs = invalidSubs
            res.redirect('/handleInvalidSubscriptions')
        } else
            return next()
    }
}

// async function redirectBySubscriptionStatus(req, res, next) {
//     // console.debug('redirectBySubscriptionStatus')
//     let user = req.user
//     let invalidSubs = req.session.invalidSubs

//     if (user?.subscriptions?.length < 1 && [ROLES.CUSTOMER].includes(user.role)) {
//         req.flash('warning', 'Create a membership to continue.')
//         res.redirect('/create-subscriptions')
//     } else if (invalidSubs?.length > 0) {
//         res.redirect('/handleInvalidSubscriptions')
//     } else
//         return next()
// }

/**
 * This function validate the currentLocation in session. 
 * If the user not have locations then redirect to logout.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
async function validateLocation(req, res, next) {
    let user = req.user
    if ([ROLES.CUSTOMER].includes(user.role)) {
        return next()
    } else {
        let currentLocation = req.session.location,
            userHasThisLocation = req.user.locations.some(location => location.id === currentLocation?._id)

        if (user?.locations.length == 0) {
            //If the user is not associated to any location, then redirect to logout.
            req.flash('error', 'This user not have any location assigned to work. Please contact the administrator.')

            res.redirect('/logout');
        } else if (!currentLocation || !userHasThisLocation) {
            //If the location is not in the session storage or if the user is removed from de currentLocation.
            if (user?.locations.length > 1) {
                //if the user has multiple locations then redirect to choose one locaiton.
                res.redirect('/selectLocation')
            } else {
                //If the user has only one location, then set the values.
                //Default Assignment
                req.session.location = user?.locations[0]
                console.log(`DEFAULT CURRENT LOCATION: ${req.session.location?.name}`)
                console.log(`LOCATION AGENT: ${req.session.location?.agentID}`);
                return next()
            }
        } else {
            return next()
        }
    }
}


/**
 * This function verify if the user need to auto-select the current location.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
async function validateSelectCurrectLocation(req, res, next) {
    let user = req.user

    if ([ROLES.CUSTOMER].includes(user.role)) {
        return res.send('This user not need to select location.')
    } else {
        return next()
    }
}


/**
 * This function validate if the account of the logged user is completed (Active)
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
async function validateActiveAccount(req, res, next) {

    if (req.user) {
        let user = await UserService.getUserById(req.user.id)

        if (user?.isIncomplete()) {
            req.flash('warning', 'Finish your account information to continue.')
            res.redirect('/activateAccount')
        } else {
            return next()
        }
    } else {
        res.redirect('/logout');
    }
}

module.exports = {
    validateSubscriptions,
    // redirectBySubscriptionStatus,
    validateLocation,
    validateSelectCurrectLocation,
    validateActiveAccount
}