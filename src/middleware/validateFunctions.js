const Stripe = require('../connect/stripe')
const { ROLES } = require('../collections/user/user.model')


async function checkSubscriptions(req, res, next) {
    console.debug('checkSubscriptions')
    let user = await Stripe.setStripeInfoToUser(req.user)
    if (user?.subscriptions?.length < 1 && [ROLES.CUSTOMER].includes(user.role)) {
        req.flash('warning', 'Create a subscription to continue.')
        res.redirect('/create-subscriptions')
    } else
        return next()
}


async function checkItems(req, res, next) {
    console.debug('checkItems')
    let user = await Stripe.setStripeInfoToUser(req.user)
    let invalidItems = user.subscriptions.filter(subs => subs.data.items.data.some(item => !item.isValid))
    if (invalidItems.length > 0 && ![ROLES.ADMIN].includes(user.role)) {
        res.redirect('/handleInvalidItems')
    } else
        return next()
}

module.exports = {
    checkSubscriptions,
    checkItems
}