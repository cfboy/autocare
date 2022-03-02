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
        email,
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

/**
 * This function add a new car to user cars.
 * @param {id, car} User 
 * @returns User
 */
// TODO: change this method
const addUserCar = (User) => async (id, car, sub, subItemID) => {
    console.log(`addUserCar() ID: ${id}`)
    // findByIdAndUpdate returns the user
    // updateOne is more quickly but not return the user.
    return await User.findByIdAndUpdate({ _id: id },
        { $addToSet: { "subscriptions.$[sub].items.$[item].cars": car } },
        { "arrayFilters": [{ "sub.id": sub }, { "item.id": subItemID }] },
        function (err, doc) {
            if (err) {
                console.error(err.message)
            } else {
                console.debug("Car Added to: ", doc.email);
            }
        }).populate({ path: 'subscriptions.items.cars', model: 'car' })
}

/**
 * This function remove the car from user cars.
 * @param {id, car} User 
 * @returns User
 */
const removeUserCar = (User) => async (id, sub, item, car) => {
    console.log(`removeUserCar() ID: ${id}`)
    return await User.findByIdAndUpdate({ _id: id },
        { $pull: { "subscriptions.$[sub].items.$[item].cars": car.id } },
        { "arrayFilters": [{ "sub.id": sub }, { "item.id": item }], new: true },
        function (err, doc) {
            if (err) {
                console.error(err.message)
            } else {
                console.debug(`Car ${car.model} Removed of User: ${doc.email}`);
            }
        })
}

/**
 * This function add a new subs to user.
 * @param {id, location} User 
 * @returns User
 */
const addSubscriptionToUser = (User) => async (billingID, subscription) => {
    console.log(`addSubscriptionToUser() billingID: ${billingID}`)
    // Set new: true to return the updated document.
    return await User.findOneAndUpdate({ billingID: billingID }, { $addToSet: { subscriptions: subscription } },
        { new: true }, function (err, doc) {
            if (err) {
                console.error(err.message)
            } else {
                console.debug("Subscription Added : ", doc.email);
            }
        }).populate({ path: 'subscriptions.items.cars', model: 'car' })
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
            console.debug("USER-SERVICE: Found user to edit: ", docs);
        }
    }).populate('locations').populate({ path: 'subscriptions.items.cars', model: 'car' })
}

/**
 * This function get user by email.
 * @param {*} User 
 * @returns user
 */
const getUserByEmail = (User) => async (email) => {
    console.log(`getUserByEmail(): ${email}`)

    return await User.findOne({ email }).populate({ path: 'subscriptions.items.cars', model: 'car' })
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
 * This function get user by plate number.
 * @param {*} User 
 * @returns user
 */
const getUserByCar = (User) => async (car) => {
    return User.findOne({
        "subscriptions.items.cars": { _id: car.id }
    },
        function (err, docs) {
            if (err) {
                console.error(err)
            } else {
                console.debug("USER-SERVICE: Found user: ", docs?.email);
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
 * This function add new service to user.
 * Find the user and add new service.
 * @param {userID, authorizedBy, location} User 
 * @returns user object, service object
 */
const addNewService = (User) => async (userID, authorizedBy, location, car) => {
    console.log(`addNewService() ID: ${userID}`)

    let service = {
        // id is a random ID genetated with letters and numbers. 
        id: 'AC-' + Math.random().toString(36).toUpperCase().substring(2, 6),
        date: Date.now(),
        location: location,
        authorizedBy: authorizedBy?._id,
        car: car

    }, customer = await User.findByIdAndUpdate({ _id: userID }, { $addToSet: { services: service } },
        { new: true }, function (err, doc) {
            if (err) {
                console.error(err)
                console.error(err.message)
            } else {
                console.debug("Service Added : ", service?.id);
            }
        }).populate({ path: 'services.location', model: 'location' }).populate({ path: 'services.authorizedBy', model: 'user' }).populate({ path: 'services.car', model: 'car' })

    service = (customer.services.find(({ id }) => id === service.id))

    return [customer, service]
}

module.exports = (User) => {
    return {
        addUser: addUser(User),
        updateUser: updateUser(User),
        addUserLocation: addUserLocation(User),
        removeUserLocation: removeUserLocation(User),
        addUserCar: addUserCar(User),
        removeUserCar: removeUserCar(User),
        addSubscriptionToUser: addSubscriptionToUser(User),
        deleteUser: deleteUser(User),
        getUsers: getUsers(User),
        getUsersPerRole: getUsersPerRole(User),
        getUsersPerRoles: getUsersPerRoles(User),
        getUserById: getUserById(User),
        getUserByEmail: getUserByEmail(User),
        getUserByBillingID: getUserByBillingID(User),
        updateBillingID: updateBillingID(User),
        getUserByCar: getUserByCar(User),
        getUsersByLocationID: getUsersByLocationID(User),
        getUsersByList: getUsersByList(User),
        addNewService: addNewService(User)
    }
}