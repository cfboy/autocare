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

const getUsers = (User) => () => {
    return User.find({})
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
        getUsers: getUsers(User),
        getUserByEmail: getUserByEmail(User),
        updatePlan: updatePlan(User),
        getUserByBillingID: getUserByBillingID(User),
        updateBillingID: updateBillingID(User),
    }
}