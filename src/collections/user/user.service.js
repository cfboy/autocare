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
    plan,
    endDate,
    firstName,
    lastName,
    phoneNumber,
    dateOfBirth,
    city,
    brand,
    model,
    plate
}) => {
    if (!email || !password || !firstName || !lastName || !phoneNumber || !billingID || !plan) {
        throw new Error(`USER: Missing Data. Please provide values for email=${email}, password=${password}, billingID=${billingID}, firstName=${firstName}, lastName=${lastName}, plan=${plan}, dateOfBirth=${dateOfBirth}`)
    }

    console.log(`USER: addUser(${email})`)

    const user = new User({
        email,
        password,
        billingID,
        role,
        // membershipInfo: { plan, endDate },
        personalInfo: {
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            city
        },
        carInfo: {
            brand,
            model,
            plate
        }
    })

    // TODO: handle errors and return the doc.
    return await user.save()
}

// TODO: Finish this
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
const getUsers = (User) => (req) => {
    return User.find({ _id: { $ne: req.user.id } }).populate('location')
}

// Get All users from User Collection.
/**
 * This function get users by roles.
 * @param {*} User 
 * @returns user
 */
const getUsersPerRole = (User) => (req, role) => {
    return User.find({ role: role }).populate('location')
}

/**
 * This function get users by list of roles.
 * @param {*} User 
 * @returns user
 */
const getUsersPerRoles = (User) => (roles) => {
    return User.find({ role: { $in: roles } }).populate('location')
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
    }).populate('location')
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

// Get User By Car Plate
/**
 * This function get user by plate number.
 * @param {*} User 
 * @returns user
 */
const getUserByPlate = (User) => async (plate) => {
    return User.findOne({ $and: [{ 'carInfo.plate': new RegExp(`^${plate}$`, 'i') }, { 'carInfo.plate': { $ne: '' } }] }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("USER-SERVICE: Found user: ", docs);
        }
    })
}

// TODO: TEST METHOD
const updatePlan = (User) => (email, plan) => {
    return User.findOneAndUpdate({ email, membershipInfo: { plan } })
}

/**
 * This function get all users by location.
 * @param {*} User 
 * @returns user list
 */
const getUsersByLocationID = (User) => async (location) => {
    return await User.find({ location })
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
        getUserById: getUserById(User),
        getUserByEmail: getUserByEmail(User),
        updatePlan: updatePlan(User),
        getUserByBillingID: getUserByBillingID(User),
        updateBillingID: updateBillingID(User),
        getUserByPlate: getUserByPlate(User),
        getUsersByLocationID: getUsersByLocationID(User),
        getUsersByList: getUsersByList(User)
    }
}