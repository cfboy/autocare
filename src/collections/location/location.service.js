const addLocation = (Location) => ({
    name
}) => {
    if (!name) {
        throw new Error(`Missing Data. Please provide the name of the location.`)
    }

    const location = new Location({
        name
    })
    return location.save()
}

const getLocations = (Location) => () => {
    return Location.find({})
}

const getLocationByName = (Location) => async(name) => {
    return await Location.findOne({ name })
}

const updateLocation = (Location) => (id, name) => {
    return Location.findByIdAndUpdate(id, { name: name },
        function(err, docs) {
            if (err) {
                console.log(err)
            } else {
                console.log("Updated Location : ", docs);
            }
        })
}

module.exports = (Location) => {
    return {
        addLocation: addLocation(Location),
        getLocations: getLocations(Location),
        getLocationByName: getLocationByName(Location),
        updateLocation: updateLocation(Location)
    }
}