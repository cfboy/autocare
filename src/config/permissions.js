const ROLES = require('./roles')

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

module.exports = {
    canDeleteLocation,
    canDeleteUser
}