const {ROLES} = require('../collections/user/user.model')

function canDeleteLocation(user) {
    return (
        user.role === ROLES.ADMIN
    )
}

function canDeleteUser(user) {
    return (
        user.role === ROLES.ADMIN
    )
}

function canValidateMemberships(user) {
    return (
        user.role === ROLES.ADMIN || user.role === ROLES.MANAGER || user.role === ROLES.CASHIER
    )
}

module.exports = {
    canDeleteLocation,
    canDeleteUser,
    canValidateMemberships
}