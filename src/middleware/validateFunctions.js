const SubscriptionService = require('../collections/subscription')
const { ROLES } = require('../collections/user/user.model')
const alertTypes = require('../helpers/alertTypes')

async function validateSubscriptions(req, res, next) {
    console.debug('validateSubscriptions')
    let user = await SubscriptionService.setStripeInfoToUser(req.user)
    let invalidSubs = user?.subscriptions.filter(subs => subs.items.some(item => !item.isValid))
    req.session.invalidSubs = invalidSubs
    return next()
}

async function redirectBySubscriptionStatus(req, res, next) {
    console.debug('redirectBySubscriptionStatus')
    let user = req.user
    let invalidSubs = req.session.invalidSubs

    if (user?.subscriptions?.length < 1 && [ROLES.CUSTOMER].includes(user.role)) {
        req.flash('warning', 'Create a subscription to continue.')
        res.redirect('/create-subscriptions')
    } else if (invalidSubs?.length > 0) {
        res.redirect('/handleInvalidSubscriptions')
    } else
        return next()
}

module.exports = {
    validateSubscriptions,
    redirectBySubscriptionStatus
}