const addLocation = (Location) => async({ name, services }) => {
    if (!name) {
        throw new Error(`Missing Data. Please provide the name of the location.`)
    }

    console.log(`locationController: addLocation(${name})`)

    const location = new Location({
        name,
        services: services
    })

    return await location.save()
}

const updateLocation = (Location) => async(id, updates) => {
    console.log(`updateLocation() ID: ${id}`)
    return await Location.findByIdAndUpdate({ _id: id }, updates, function(err, doc) {
        if (err) {
            console.error(err.message)
        } else {
            console.debug("Updated : ", doc.email);
        }
    })
}

const deleteLocation = (Location) => async(id) => {
    console.log(`deleteLocation() by ID: ${id}`)

    return Location.deleteOne({ _id: id }, function(err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Deleted : ", docs);
        }
    })
}

const getLocations = (Location) => () => {
    return Location.find({})
}

// Get Location by ID. 
const getLocationById = (Location) => (id) => {
    console.log(`getLocationById() by ID: ${id}`)

    return Location.findOne({ _id: id }, function(err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Founded location to edit: ", docs);
        }
    })
}


const getLocationByName = (Location) => async(name) => {
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