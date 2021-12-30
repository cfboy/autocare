const addUser = (User) => ({ email, billingID, plan, endDate }) => {
  if (!email || !billingID || !plan) { throw new Error('Missing Data. Please provide values for email, billingID, plan') }

  const user = new User({ email, billingID, membershipInfo: { plan, endDate } })
  return user.save()
}

const getUsers = (User) => () => {
  return User.find({})
}

const getUserByEmail = (User) => async (email) => {
  return await User.findOne({ email })
}

const getUserByBillingID = (User) => async (billingID) => {
  return await User.findOne({ billingID })
}

const updateBillingID = (User) => async (email, billingID) => {
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
