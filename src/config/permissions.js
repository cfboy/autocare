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
    let subscription = user.subscriptions.find(subs => subs.items.find(item => item.cars.find(car => car.id == carID)))
    let car = subscription.items[0].cars[0]
    return (
        user.role === ROLES.ADMIN || (car && car.services.length == 0)
    )
}

function canAddCar(user) {
    return (
        [ROLES.ADMIN].includes(user.role) ||
        user.subscriptions.some(sub => sub.data.items.data.some(item => item.cars.length < item.quantity))
    )
}

function canEditCar(user, carID) {
    let subscription = user.subscriptions.find(subs => subs.items.find(item => item.cars.find(car => car.id == carID)))
    let car = subscription.items[0].cars[0]
    return (
        [ROLES.ADMIN, ROLES.MANAGER].includes(user.role) || (car && car.services.length == 0)
    )
}

function canManageCars(user) {
    return (
        [ROLES.ADMIN].includes(user.role)
        // || user?.services.length < 1
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