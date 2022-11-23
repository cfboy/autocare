const SubscriptionService = require('../collections/subscription')
const LocationService = require('../collections/location')
const { ROLES } = require('../collections/user/user.model')
const alertTypes = require('../helpers/alertTypes')

// TODO: Maybe invalid subs are wrong, because session is for all app and not for only the user.
async function validateSubscriptions(req, res, next) {
    // console.debug('validateSubscriptions')
    let user = await SubscriptionService.setStripeInfoToUser(req.user)
    let invalidSubs = user?.subscriptions.filter(subs => subs.items.some(item => !item.isValid))
    req.session.invalidSubs = invalidSubs
    return next()
}

async function redirectBySubscriptionStatus(req, res, next) {
    // console.debug('redirectBySubscriptionStatus')
    let user = req.user
    let invalidSubs = req.session.invalidSubs

    if (user?.subscriptions?.length < 1 && [ROLES.CUSTOMER].includes(user.role)) {
        req.flash('warning', 'Create a membership to continue.')
        res.redirect('/create-subscriptions')
    } else if (invalidSubs?.length > 0) {
        res.redirect('/handleInvalidSubscriptions')
    } else
        return next()
}

/**
 * This function validate the currentLocation in session. 
 * If the user not have locations then redirect to logout.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
async function validateLocation(req, res, next) {
    let user = req.user,
        currentLocation = req.session.location,
        userHasThisLocation = req.user.locations.some(location => location.id === currentLocation?._id)

    if ([ROLES.CUSTOMER].includes(user.role)) {
        res.next()
    } else {
        if (user?.locations.length == 0) {
            //If the user is not associated to any location, then redirect to logout.
            // TODO: Show flash after logout.
            req.flash('error', 'This user not have any location assigned to work.')

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

module.exports = {
    validateSubscriptions,
    redirectBySubscriptionStatus,
    validateLocation
}