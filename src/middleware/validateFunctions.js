const SubscriptionService = require('../collections/subscription')
const { ROLES } = require('../collections/user/user.model')


async function checkSubscriptions(req, res, next) {
    console.debug('checkSubscriptions')
    let user = await SubscriptionService.setStripeInfoToUser(req.user)
    let invalidSubs = user?.subscriptions.filter(subs => subs.items.some(item => !item.isValid))

    if (user?.subscriptions?.length < 1 && [ROLES.CUSTOMER].includes(user.role)) {
        req.flash('warning', 'Create a subscription to continue.')
        res.redirect('/create-subscriptions')
    } else if (invalidSubs?.length > 0) {
        req.session.invalidSubs = invalidSubs
        res.redirect('/handleInvalidSubscriptions')
    } else
        return next()
}

module.exports = {
    checkSubscriptions
}