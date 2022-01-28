const addHistory = (History) => async(description, user, location) => {
    if (!description) {
        throw new Error(`Missing Data. Please provide the description of the history.`)
    }

    console.log(`historyService: addHistory()`)

    const history = new History({
        description,
        user,
        location
    })

    return await history.save()
}

const deleteHistory = (History) => (id) => {
    console.log(`deleteHistory() by ID: ${id}`)

    return History.deleteOne({ _id: id }, function(err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Deleted : ", docs);
        }
    })
}

const getHistory = (History) => () => {
    return History.find({}).populate('user').populate('location')
}

// Get History by ID. 
const getHistoryById = (History) => (id) => {
    console.log(`getHistoryById() by ID: ${id}`)

    return History.findOne({ _id: id }, function(err, docs) {
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
        deleteHistory: deleteHistory(History)
    }
}