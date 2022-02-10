const { ROLES } = require('../collections/user/user.model')

function canDeleteLocation(user) {
    return (
        user.role === ROLES.ADMIN
    )
}

function canEditLocation(user) {
    return (
        [ROLES.ADMIN, ROLES.MANAGER].includes(user.role)
    )
}

function canDeleteUser(user) {
    return (
        user.role === ROLES.ADMIN
    )
}

function canDeleteCar(user, carID) {
    return (
        user.role === ROLES.ADMIN || user?.cars?.includes(carID)
    )
}

function canEditCar(user, carID) {
    return (
        [ROLES.ADMIN, ROLES.MANAGER].includes(user.role) || user?.cars?.includes(carID)
    )
}

function canValidateMemberships(user) {
    return (
        user.role === ROLES.ADMIN || user.role === ROLES.MANAGER || user.role === ROLES.CASHIER
    )
}

module.exports = {
    canDeleteCar,
    canEditCar,
    canDeleteLocation,
    canEditLocation,
    canDeleteUser,
    canValidateMemberships
}