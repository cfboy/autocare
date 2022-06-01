/**
 * This function add new user to DB.
 * @param {*} User 
 * @returns user
 */
const addUser = (User) => async ({
    email,
    password,
    role,
    billingID,
    firstName,
    lastName,
    phoneNumber,
    dateOfBirth,
    city
}) => {
    if (!email || !password || !firstName || !lastName || !phoneNumber || !billingID) {
        throw new Error(`USER: Missing Data. Please provide values for email=${email}, password=${password}, billingID=${billingID}, firstName=${firstName}, lastName=${lastName}, dateOfBirth=${dateOfBirth}`)
    }

    console.log(`USER: addUser(${email})`)

    const user = new User({
        email: email,
        password,
        billingID,
        role,
        personalInfo: {
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            city
        }
    })

    // TODO: handle errors and return the doc.
    return await user.save()
}

/**
 * This function updates the user properties.
 * @param {*} User 
 * @returns user
 */
const updateUser = (User) => async (id, updates) => {
    console.log(`updateUser() ID: ${id}`)
    // findByIdAndUpdate returns the user
    // updateOne is more quickly but not return the user.
    return await User.findByIdAndUpdate({ _id: id }, updates, function (err, doc) {
        if (err) {
            console.error(err.message)
        } else {
            console.debug("Updated : ", doc.email);
        }
    })
}

/**
 * This function add a new location to user location.
 * @param {id, location} User 
 * @returns User
 */
const addUserLocation = (User) => async (id, location) => {
    console.log(`addUserLocation() ID: ${id}`)
    // findByIdAndUpdate returns the user
    // updateOne is more quickly but not return the user.
    return await User.findByIdAndUpdate({ _id: id }, { $addToSet: { locations: location } }, function (err, doc) {
        if (err) {
            console.error(err.message)
        } else {
            console.debug("Location Added : ", doc.email);
        }
    })
}

/**
 * This function remove the location from user location.
 * @param {id, location} User 
 * @returns User
 */
const removeUserLocation = (User) => async (id, location) => {
    console.log(`removeUserLocation() ID: ${id}`)
    // findByIdAndUpdate returns the user
    // updateOne is more quickly but not return the user.
    return await User.findByIdAndUpdate({ _id: id }, { $pull: { locations: location } }, function (err, doc) {
        if (err) {
            console.error(err.message)
        } else {
            console.debug("Location Removed : ", doc.email);
        }
    })
}

// TODO: maybe need delete customer on Stripe 
/**
 * This function delete the user on DB.
 * @param {*} User 
 * @returns promise
 */
const deleteUser = (User) => (id) => {
    console.log(`deleteUser() by ID: ${id}`)

    return User.deleteOne({ _id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Deleted : ", docs);
        }
    })
}

/**
 * This function get all users from DB and populate the location information.
 * @param {*} User 
 * @returns 
 */
const getUsers = (User) => (userID) => {
    return User.find({ _id: { $ne: userID } }).populate('locations')
}

/**
 * This function get users by roles.
 * @param {*} User 
 * @returns user
 */
const getUsersPerRole = (User) => (req, role) => {
    return User.find({ role: role }).populate('locations')
}

/**
 * This function get users by list of roles.
 * @param {*} User 
 * @returns user
 */
const getUsersPerRoles = (User) => (roles) => {
    return User.find({ role: { $in: roles } }).populate('locations')
}

/**
 * This function get users excluding a role.
 * @param {*} User 
 * @returns user
 */
const getUsersExcludeRole = (User) => (role) => {
    return User.find({ role: { $ne: role } }).populate('locations')
}

/**
 * This function get user by id.
 * @param {*} User 
 * @returns user
 */
const getUserById = (User) => (id) => {
    console.log(`getUserById() by ID: ${id}`)

    return User.findOne({ _id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("USER-SERVICE: Found user: ", docs.email);
        }
    }).populate('locations')
}

/**
 * This function get user by email.
 * @param {*} User 
 * @returns user
 */
const getUserByEmail = (User) => async (email) => {
    console.log(`getUserByEmail(): ${email}`)

    return await User.findOne({ email })
}

/**
 * This function get user by billingID/Stripe ID.
 * @param {*} User 
 * @returns user
 */
const getUserByBillingID = (User) => async (billingID) => {
    return await User.findOne({ billingID })
}

/**
 * This function updates the user billingID by id.
 * @param {*} User 
 * @returns user
 */
const updateBillingID = (User) => async (id, billingID) => {
    console.log(`updateBilligID() ID: ${id}`)

    return await User.findByIdAndUpdate({ _id: id }, { billingID: billingID }, { new: true }, function (err, doc) {
        if (err) {
            console.log(err)
        } else {
            console.debug(`USER-SERVICE: Updated BillingID of ${doc.email} ->> ${doc.billingID}`);
        }
    })
}

/**
 * This function get all users by location.
 * @param {*} User 
 * @returns user list
 */
const getUsersByLocationID = (User) => async (location) => {
    return await User.find({ "locations": { _id: location.id } })
}

/**
 * This functions get all users by user list.
 * @param {*} User 
 * @returns user list
 */
const getUsersByList = (User) => async (users) => {
    return await User.find({ _id: { $in: users } }, function (err, doc) {
        if (err) {
            console.log(err.message)
        } else {
            console.debug(`USER-SERVICE: Found Location Users.`);
        }
    })
}

/**
 * This function add new notification to user.
 * @param {userID, message} User 
 * @returns user object
 */
const addNotification = (User) => async (id, message) => {
    console.log(`addNotification() ID: ${id}`)
    // let date = Date.now();
    let notification = {
        isRead: false,
        message: message,
        // created_date: new Date()
    }

    let customer = await User.findByIdAndUpdate({ _id: id },
        { $addToSet: { notifications: notification } },
        { new: true })
        .then(result => {
            if (result) {
                console.debug(`addNotification(): Successfully Added notification ${result.id}.`);
                return result
            } else {
                console.debug("addNotification(): No document returned.");
            }
        })
        .catch(err => console.error(`Failed to add notification: ${err}`));

    notification = (customer?.notifications.find(({ created_date }) => created_date.getTime() === new Date(notification.created_date).getTime()))

    return [customer, notification]
}

/**
 * This function add new notification to user.
 * @param {userID, authorizedBy, location} User 
 * @returns user object
 */
const changeNotificationState = (User) => async (userID, notificationID, value) => {
    console.log(`readNotification() ID: ${userID}`)
    let customer = await User.findByIdAndUpdate(
        {
            "_id": userID,
            "notifications": {
                "_id": notificationID
            }
        },
        {
            $set: { 'notifications.$[outer].isRead': JSON.parse(value) }
        },
        {
            "arrayFilters": [{ "outer._id": notificationID }]
        }, function (err, doc) {
            if (err) {
                console.error(err)
                console.error(err.message)
            } else {
                console.debug("Notification Changed.");
            }
        })

    let notification = (customer.notifications.find(({ id }) => id === notificationID))

    return [customer, notification]
}


/**
 * This function marks as read all unread notifications.
 * @param {userID, authorizedBy, location} User 
 * @returns user object
 */
const readAllNotifications = (User) => async (userID) => {
    console.log(`readAllNotifications() ID: ${userID}`)
    let customer = await User.findByIdAndUpdate(
        {
            "_id": userID
        },
        {
            $set: { 'notifications.$[outer].isRead': true }
        },
        {
            "arrayFilters": [{ "outer.isRead": false }]
        }, function (err, doc) {
            if (err) {
                console.error(err)
                console.error(err.message)
            } else {
                console.debug("Notification Changed.");
            }
        })

    return customer
}


/**
 * This function add new item to user cart.
 * @param {userID, item} User 
 * @returns user object
 */
const addItemToCart = (User) => async (id, item) => {
    console.log(`addItemToCart() ID: ${id}`)

    let customer = await User.findByIdAndUpdate({ _id: id },
        { $addToSet: { 'cart.items': item } },
        { new: true })
        .then(result => {
            if (result) {
                console.debug(`addItemToCart(): Successfully Added item to cart: ${result.email}.`);
                return result
            } else {
                console.debug("addItemToCart(): No document returned.");
            }
        })
        .catch(err => console.error(`Failed to add item to cart: ${err}`));

    let itemToRtrn = customer?.cart.items.find(obj => obj.plate == item.plate)

    return [customer, itemToRtrn]
}

/**
 * This function remove the item from user cart.
 * @param {id, item} User 
 * @returns User
 */
const removeItemFromCart = (User) => async (id, item) => {
    console.log(`removeItemFromCart() ID: ${id}`)

    return await User.findByIdAndUpdate({ _id: id },
        { $pull: { 'cart.items': item } },
        { new: true }, function (err, doc) {
            if (err) {
                console.error(err.message)
            } else {
                console.debug("Item from cart Removed of user: ", doc.email);
            }
        })
}

/**
 * This function empty the user cart.
 * @param {id, item} User 
 * @returns User
 */
const emptyCart = (User) => async (id) => {
    console.log(`emptyCart() ID: ${id}`)

    return await User.findByIdAndUpdate({ _id: id },
        { $set: { 'cart.items': [] } },
        { new: true }, function (err, doc) {
            if (err) {
                console.error(err.message)
            } else {
                console.debug("The cart is empty for user: ", doc.email);
            }
        })
}

module.exports = (User) => {
    return {
        addUser: addUser(User),
        updateUser: updateUser(User),
        addUserLocation: addUserLocation(User),
        removeUserLocation: removeUserLocation(User),
        deleteUser: deleteUser(User),
        getUsers: getUsers(User),
        getUsersPerRole: getUsersPerRole(User),
        getUsersPerRoles: getUsersPerRoles(User),
        getUsersExcludeRole: getUsersExcludeRole(User),
        getUserById: getUserById(User),
        getUserByEmail: getUserByEmail(User),
        getUserByBillingID: getUserByBillingID(User),
        updateBillingID: updateBillingID(User),
        getUsersByLocationID: getUsersByLocationID(User),
        getUsersByList: getUsersByList(User),
        addNotification: addNotification(User),
        changeNotificationState: changeNotificationState(User),
        readAllNotifications: readAllNotifications(User),
        addItemToCart: addItemToCart(User),
        removeItemFromCart: removeItemFromCart(User),
        emptyCart: emptyCart(User)
    }
}