const addUser = (User) => ({
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
    brand,
    model,
    plate
}) => {
    if (!email || !password || !firstName || !lastName || !phoneNumber || !billingID || !plan) {
        throw new Error(`Missing Data. Please provide values for email=${email}, password=${password}, billingID=${billingID}, firstName=${firstName}, lastName=${lastName}, plan=${plan}, dateOfBirth=${dateOfBirth}`)
    }

    const user = new User({
        email,
        password,
        billingID,
        role,
        membershipInfo: { plan, endDate },
        personalInfo: {
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth
        },
        carInfo: {
            brand,
            model,
            plate
        },
        membershipInfo: {
            plan,
            endDate
        }
    })
    return user.save()
}

// TODO: Finish this
const updateUser = (User) => async({ id, updates }) => {
    return await User.findOneAndUpdate(id, updates, { new: true, runValidators: true })
}

const deleteUser = (User) => (id) => {
    console.log(`deleteUser() by ID: ${id}`)

    return User.deleteOne({ _id: id }, function(err, docs) {
        if (err) {
            console.log(err)
        } else {
            console.debug("Deleted : ", docs);
        }
    })
}

const getUsers = (User) => () => {
    return User.find({})
}

// TODO: Test this method.
const getUserById = (User) => async(id) => {
    return await User.findOne({ id })
}

const getUserByEmail = (User) => async(email) => {
    return await User.findOne({ email })
}

const getUserByBillingID = (User) => async(billingID) => {
    return await User.findOne({ billingID })
}

const updateBillingID = (User) => async(email, billingID) => {
    return await User.findOneAndUpdate({ email, membershipInfo: { billingID } })
}

const updatePlan = (User) => (email, plan) => {
    return User.findOneAndUpdate({ email, membershipInfo: { plan } })
}

module.exports = (User) => {
    return {
        addUser: addUser(User),
        updateUser: updateUser(User),
        deleteUser: deleteUser(User),
        getUsers: getUsers(User),
        getUserById: getUserById(User),
        getUserByEmail: getUserByEmail(User),
        updatePlan: updatePlan(User),
        getUserByBillingID: getUserByBillingID(User),
        updateBillingID: updateBillingID(User),
    }
}