/**
 * This function add new service to DB
 * @param {car, authorizedBy, location, user} Service 
 * @returns Service object
 */
const addService = (Service) => async (car, authorizedBy, location, user) => {
    // TODO: change this to find first then create new car.
    try {
        if (!car || !authorizedBy || !location || !user) {
            throw new Error(`Missing Data. Please provide all data=>
             car: ${car}
             authorizedBy: ${authorizedBy}
             location: ${location},
             user: ${user}.`)
        }

        console.log(`SERVICE-SERVICE: addService()`)
        let serviceID = (car.id.substr(car?.id?.length - 4, car?.id?.length)).toUpperCase()
        // if (serviceID === '')
        // serviceID = Math.random().toString(36).toUpperCase().substring(2, 6)

        let properties = {
            // id is a random ID genetated with letters and numbers. 
            // TODO: change the id.
            id: serviceID,
            // date: Date.now(),
            location: location,
            authorizedBy: authorizedBy,
            user: user,
            car: car

        }

        const service = new Service(properties)
            .populate({ path: 'location', model: 'location' })
            .populate({ path: 'authorizedBy', model: 'user' })
            .populate({ path: 'user', model: 'user' })
            .populate({ path: 'car', model: 'car' })

        return await service.save()
    } catch (error) {
        console.log(`ERROR: SERVICE-SERVICE: addService()`)
        console.log(error)
        return null
    }
}

/**
 * This function update the Service properties by id.
 * @param {id, updates} Service 
 * @returns Service object
 */
const updateService = (Service) => async (id, updates) => {
    console.log(`updateService() ID: ${id}`)
    return await Service.findByIdAndUpdate({ _id: id }, updates, { new: true }, function (err, doc) {
        if (err) {
            console.error(err.message)
        } else {
            console.debug("Updated : ", doc.id);
        }
    }).populate({ path: 'location', model: 'location' })
        .populate({ path: 'authorizedBy', model: 'user' })
        .populate({ path: 'user', model: 'user' })
        .populate({ path: 'car', model: 'car' })
}

/**
 * This function delete a service from DB.
 * @param {*} Service 
 * @returns promise
 */
const deleteService = (Service) => async (id) => {
    console.log(`deleteService() by ID: ${id}`)

    return Service.deleteOne({ _id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Deleted : ", docs);
        }
    })
}

/**
 * This function get all services on db.
 * @param {} Car 
 * @returns Service list
 */
const getServices = (Service) => async () => {
    return Service.find({}, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("SERVICE-SERVICE: Found Services: ", docs.length);
        }
    }).populate({ path: 'location', model: 'location' })
        .populate({ path: 'authorizedBy', model: 'user' })
        .populate({ path: 'user', model: 'user' })
        .populate({ path: 'car', model: 'car' })
}

/**
 * This function get a service by ID.
 * @param {serviceID} Service 
 * @returns Service
 */
const getServiceByID = (Service) => async (serviceID) => {
    return Service.findOne({ _id: serviceID }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("SERVICE-SERVICE: Found Service: ", docs.brand);
        }
    }).populate({ path: 'location', model: 'location' })
        .populate({ path: 'authorizedBy', model: 'user' })
        .populate({ path: 'user', model: 'user' })
        .populate({ path: 'car', model: 'car' })
}

/**
 * This funtion returns a list of service by user,
 * @param {*} user 
 * @returns service list
 */
const getServicesByUser = (Service) => async (user) => {
    return Service.find({ user: user })
        .populate({ path: 'location', model: 'location' })
        .populate({ path: 'authorizedBy', model: 'user' })
        .populate({ path: 'user', model: 'user' })
        .populate({ path: 'car', model: 'car' })
        .then(result => {
            if (result) {
                console.debug(`getServicesByCars(): Successfully found ${result.length} services.`);
                return result
            } else {
                console.debug("getServicesByCars(): No document matches the provided query.");
            }
        })
        .catch(err => console.error(`Failed to find document: ${err}`));
}

/**
 * This funtion returns a list of service by car,
 * @param {*} car 
 * @returns Service list
 */
const getServicesByCar = (Service) => async (car) => {
    return Service.find({ car: car })
        .populate({ path: 'location', model: 'location' })
        .populate({ path: 'authorizedBy', model: 'user' })
        .populate({ path: 'user', model: 'user' })
        .populate({ path: 'car', model: 'car' })
        .then(result => {
            if (result) {
                console.debug(`getServicesByCar(): Successfully found ${result.length} services.`);
                return result
            } else {
                console.debug("getServicesByCar(): No document matches the provided query.");
            }
        })
        .catch(err => console.error(`Failed to find document: ${err}`));
}

/**
 * This function returns a list of services by cars.
 * @param {*} cars 
 * @returns Service list
 */
const getServicesByCars = (Service) => async (cars) => {
    return Service.find({ car: { $in: cars } })
        .sort({ created_date: 'descending' })
        .populate({ path: 'location', model: 'location' })
        .populate({ path: 'authorizedBy', model: 'user' })
        .populate({ path: 'user', model: 'user' })
        .populate({ path: 'car', model: 'car' })
        .then(result => {
            if (result.length > 0) {
                console.debug(`getServicesByCars(): Successfully found ${result.length} documents.`);
                return result
            } else {
                console.debug("getServicesByCars(): No document matches the provided query.");
            }
        })
        .catch(err => console.error(`Failed to find document: ${err}`));
}

/**
 * This function find all services by a list of cars.
 * Assign this services in the car.services properties.
 * @param {*} Service 
 * @returns 
 */
const setServicesToCars = (Service) => async (cars) => {
    let services = await Service.find({ car: { $in: cars } })
        .populate({ path: 'location', model: 'location' })
        .populate({ path: 'authorizedBy', model: 'user' })
        .populate({ path: 'user', model: 'user' })
        .populate({ path: 'car', model: 'car' })
        .then(result => {
            if (result.length > 0) {
                console.debug(`getServicesByCars(): Successfully found ${result.length} documents.`);
                return result
            } else {
                console.debug("getServicesByCars(): No document matches the provided query.");
            }
        })
        .catch(err => console.error(`Failed to find document: ${err}`));

    for (carObj of cars) {
        carObj.services = []
        if (services) {
            let carServices = services.find(service => service.car.id == carObj.id)
            if (carServices)
                carObj.services.push(carServices)
        }
    }
    return cars
}


module.exports = (Service) => {
    return {
        getServices: getServices(Service),
        getServiceByID: getServiceByID(Service),
        addService: addService(Service),
        updateService: updateService(Service),
        deleteService: deleteService(Service),
        getServicesByCar: getServicesByCar(Service),
        getServicesByUser: getServicesByUser(Service),
        getServicesByCars: getServicesByCars(Service),
        setServicesToCars: setServicesToCars(Service)
    }
}