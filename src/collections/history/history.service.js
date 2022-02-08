/**
 * This function add new history to DB.
 * @param {*} History 
 * @returns history object
 */
const addHistory = (History) => async (description, type, user, location) => {
    if (!description) {
        throw new Error(`Missing Data. Please provide the description of the history.`)
    }

    console.log(`historyService: addHistory()`)

    const history = new History({
        description,
        type,
        user,
        location
    })

    return await history.save()
}

/**
 * This function delete a history from DB.
 * @param {*} History 
 * @returns promise
 */
const deleteHistory = (History) => (id) => {
    console.log(`deleteHistory() by ID: ${id}`)

    return History.deleteOne({ _id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Deleted : ", docs);
        }
    })
}

/**
 * This function get all history.
 * @param {*} History 
 * @returns history object
 */
const getHistory = (History) => () => {
    return History.find({}).populate('user').populate('location')
}

// Get History by ID. 
/**
 * This function get a history by id.
 * @param {*} History 
 * @returns history object
 */
const getHistoryById = (History) => (id) => {
    console.log(`getHistoryById() by ID: ${id}`)

    return History.findOne({ _id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Founded History: ", docs);
        }
    }).populate('user').populate('location')
}

/**
 * This function get the history by userID.
 * @param {*} History 
 * @returns history object
 */
const getMyHistory = (History) => (userId) => {
    console.log(`getMyHistory() by ID: ${userId}`)

    return History.find({ user: userId }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Founded History: ", docs);
        }
    }).populate('user').populate('location')
}

module.exports = (History) => {
    return {
        addHistory: addHistory(History),
        getHistory: getHistory(History),
        getHistoryById: getHistoryById(History),
        getMyHistory: getMyHistory(History),
        deleteHistory: deleteHistory(History)
    }
}