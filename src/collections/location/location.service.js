/**
 * This function add new location to DB
 * @param {*} Location 
 * @returns location object
 */
const addLocation = (Location) => async ({ name, services, users, agentID }) => {
    if (!name) {
        throw new Error(`Missing Data. Please provide the name of the location.`)
    }

    console.log(`locationController: addLocation(${name})`)

    const location = new Location({
        name,
        services: services,
        users: users,
        agentID: agentID
    })

    return await location.save()
}

/**
 * This function update the location properties by id.
 * @param {*} Location 
 * @returns location object
 */
const updateLocation = (Location) => async (id, updates) => {
    console.log(`updateLocation() ID: ${id}`)
    return await Location.findByIdAndUpdate({ _id: id }, updates, { new: true }, function (err, doc) {
        if (err) {
            console.error(err.message)
        } else {
            console.debug("Location Updated : ", doc.name);
        }
    })
}

/**
 * This function delete a location from DB.
 * @param {*} Location 
 * @returns promise
 */
const deleteLocation = (Location) => async (id) => {
    console.log(`deleteLocation() by ID: ${id}`)

    return Location.deleteOne({ _id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Deleted : ", docs);
        }
    })
}

/**
 * This function get all locations on DB.
 * @param {*} Location 
 * @returns location list
 */
const getLocations = (Location) => () => {
    return Location.find({})
}

/**
 * This function get a location by id.
 * @param {*} Location 
 * @returns location object
 */
const getLocationById = (Location) => (id) => {
    // console.log(`getLocationById() by ID: ${id}`)

    return Location.findOne({ _id: id }, function (err, docs) {
        if (err) {
            console.error(err)
            // } else {
            //     console.debug("Found location to edit: ", docs);
        }
    })
}

/**
 * This function get a location by name.
 * @param {*} Location 
 * @returns location object
 */
const getLocationByName = (Location) => async (name) => {
    console.debug(`getLocationByName(): ${name}`)

    return await Location.findOne({ name })
}

module.exports = (Location) => {
    return {
        addLocation: addLocation(Location),
        getLocations: getLocations(Location),
        getLocationById: getLocationById(Location),
        getLocationByName: getLocationByName(Location),
        updateLocation: updateLocation(Location),
        deleteLocation: deleteLocation(Location)
    }
}