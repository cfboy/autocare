const { ROLES } = require('../collections/user/user.model')
const { STATUS } = require('../connect/stripe');

function isAdmin(user) {
    return (
        user.role === ROLES.ADMIN
    )
}

function canEditCustomer(user, customer) {
    return (
        user.role === ROLES.ADMIN || user.role === ROLES.MANAGER || user.id === customer.id
    )
}

function canManageSubscriptions(user, customer                              ) {
    return (
        user.role === ROLES.ADMIN || user.role === ROLES.MANAGER || user.id === customer.id
    )
}
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

function canDeleteService(user) {
    return (
        user.role === ROLES.ADMIN
    )
}

function canDeleteCar(user, carID, services) {
    return (
        user.role === ROLES.ADMIN || (carID && services.length == 0)
    )
}

function canAddCar(user) {
    let canAdd = (
        user.subscriptions.some(sub => sub.items.some(item => item?.cars?.length < item.data.quantity) && sub.data.status == STATUS.ACTIVE)
    )

    return canAdd
}

function canEditCar(user, carID, services) {

    return (
        [ROLES.ADMIN, ROLES.MANAGER].includes(user.role) || (carID && services?.length == 0)
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
    canEditCustomer,
    canAddCar,
    canDeleteCar,
    canEditCar,
    canDeleteLocation,
    canEditLocation,
    canDeleteUser,
    canValidateMemberships,
    canChangePassword,
    canDeleteService,
    isAdmin,
    canManageSubscriptions
}