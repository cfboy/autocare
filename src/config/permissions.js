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
        user.role === ROLES.ADMIN ||
        user.subscriptions.find(subs => subs.items.find(item => item.cars.some(car => car == carID)))
    )
}

function canAddCar(user) {
    return (
        [ROLES.ADMIN].includes(user.role) || user?.cars?.length < 1
    )
}

function canEditCar(user, carID) {
    return (
        [ROLES.ADMIN, ROLES.MANAGER].includes(user.role) ||
        user.subscriptions.find(subs => subs.items.find(item => item.cars.some(car => car.id == carID)))
    )
}

function canManageCars(user) {
    return (
        [ROLES.ADMIN].includes(user.role) || user?.services.length < 1
    )
}

function canValidateMemberships(user) {
    return (
        user.role === ROLES.ADMIN || user.role === ROLES.MANAGER || user.role === ROLES.CASHIER
    )
}

function canChangePassword(user, userID) {
    return (
        user.role === ROLES.ADMIN || user.id === userID
    )
}

module.exports = {
    canManageCars,
    canAddCar,
    canDeleteCar,
    canEditCar,
    canDeleteLocation,
    canEditLocation,
    canDeleteUser,
    canValidateMemberships,
    canChangePassword
}