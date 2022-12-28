const LocationService = require('../location')
const Stripe = require('../../connect/stripe')
const Dinero = require('dinero.js')

/**
 * This function add new service to DB
 * @param {car, authorizedBy, location, user} Service 
 * @returns Service object
 */
const addService = (Service) => async (car, authorizedBy, location, user, product, inputType) => {
    try {
        if (!car || !authorizedBy || !location || !user || !product) {
            throw new Error(`Missing Data. Please provide all data=>
             car: ${car}
             authorizedBy: ${authorizedBy}
             location: ${location},
             user: ${user},
             product: ${product}.`)
        }

        // console.log(`SERVICE-SERVICE: addService()`)
        let serviceID = (car.id.substr(car?.id?.length - 4, car?.id?.length)).toUpperCase()
        // if (serviceID === '')
        // serviceID = Math.random().toString(36).toUpperCase().substring(2, 6)

        let date = new Date()
        date.setSeconds(0, 0)

        const query = {
            id: serviceID,
            created_date: date,
            location: location,
            authorizedBy: authorizedBy,
            user: user,
            car: car,
            product: product,
            inputType: inputType
        }

        const update = {

        }

        const options = {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }

        const service = await Service.findOneAndUpdate(query, update, options)
            .populate({ path: 'location', model: 'location' })
            .populate({ path: 'authorizedBy', model: 'user' })
            .populate({ path: 'user', model: 'user' })
            .populate({ path: 'car', model: 'car' })

        console.log(`SERVICE-SERVICE: New Service ID: ${service.id}`)

        return service
    } catch (error) {
        console.log(`ERROR: SERVICE-SERVICE: addService()`)
        console.error(error)
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
        }
        // else {
        //     console.debug("SERVICE-SERVICE: Found Service: ", docs.id);
        // }
    }).populate({ path: 'location', model: 'location' })
        .populate({ path: 'authorizedBy', model: 'user' })
        .populate({ path: 'user', model: 'user' })
        .populate({ path: 'car', model: 'car' })
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
        // .populate({ path: 'user', model: 'user' })
        // .populate({ path: 'car', model: 'car' })
        .then(result => {
            if (result) {
                // console.debug(`getServicesByCar(): Successfully found ${result.length} services.`);
                return result
            }
            //  else {
            // console.debug("getServicesByCar(): No document matches the provided query.");
            // }
        })
        .catch(err => console.error(`getServicesByCar(): ${err}`));
}

/**
 * This function returns a list of service by user.
 * @param {*} Service 
 * @returns 
 */
const getServicesByUser = (Service) => async (user) => {
    return Service.find({ user: user })
        .populate({ path: 'location', model: 'location' })
        .populate({ path: 'authorizedBy', model: 'user' })
        .populate({ path: 'user', model: 'user' })
        .populate({ path: 'car', model: 'car' })
        .then(result => {
            if (result) {
                // console.debug(`getServicesByCar(): Successfully found ${result.length} services.`);
                return result
            }
            //  else {
            // console.debug("getServicesByCar(): No document matches the provided query.");
            // }
        })
        .catch(err => console.error(`getServicesByUser(): ${err}`));
}

/**
 * This function returns a list of service by location.
 * @param {*} Service 
 * @returns 
 */
const getServicesByLocation = (Service) => async (location) => {
    return Service.find({ location: location })
        .sort({ created_date: 'descending' })
        .populate({ path: 'location', model: 'location' })
        .populate({ path: 'authorizedBy', model: 'user' })
        .populate({ path: 'user', model: 'user' })
        .populate({ path: 'car', model: 'car' })
        .then(result => {
            if (result) {
                return result
            }
        })
        .catch(err => console.error(`getServicesByLocation(): ${err}`));
}
/**
 * This funtion returns a list of service by car between dates,
 * @param {*} car 
 * @returns Service list
 */
const getServicesByCarBetweenDates = (Service) => async (car, startDate, endDate) => {
    return Service.find({
        car: car, created_date: {
            $gte: startDate,
            $lte: endDate
        }
    })
        // .populate({ path: 'location', model: 'location' })
        // .populate({ path: 'authorizedBy', model: 'user' })
        // .populate({ path: 'user', model: 'user' })
        // .populate({ path: 'car', model: 'car' })
        .then(result => {
            if (result) {
                // console.debug(`getServicesByCarBetweenDates(): Successfully found ${result.length} services.`);
                return result
            }
            // else {
            //     console.debug("getServicesByCarBetweenDates(): No document matches the provided query.");
            // }
        })
        .catch(err => console.error(`getServicesByCarBetweenDates(): ${err}`));
}

/**
 * This funtion returns a list of service between dates,
 * @param {*} car 
 * @returns Service list
 */
const getServicesBetweenDates = (Service) => async (startDate, endDate) => {
    return Service.find({
        created_date: {
            $gte: startDate,
            $lte: endDate
        }
    }).populate({ path: 'location', model: 'location' })
        .then(result => {
            if (result) {
                return result
            }

        })
        .catch(err => console.error(`getServicesBetweenDates(): ${err}`));
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
                // console.debug(`getServicesByCars(): Successfully found ${result.length} documents.`);
                return result
            }
            // else {
            //     console.debug("getServicesByCars(): No document matches the provided query.");
            // }
        })
        .catch(err => console.error(`getServicesByCars(): ${err}`));
}


/**
 * This funtion calculate the Gross Volume factor between dates.
 * @param {*} startDate 
 * @param {*} endDate 
 * @param {*} allServices 
 * @returns 
 */
async function getGrossVolumeFactor(startDate, endDate, allServices) {
    try {

        let factor = 0;

        const stripeBalance = await Stripe.getBalanceTransactions(startDate, endDate)


        factor = allServices?.length > 0 ? stripeBalance?.grossVolume.divide(allServices?.length).getAmount() : 0

        return { factor, grossVolume: stripeBalance?.grossVolume?.getAmount() }

    } catch (error) {
        console.debug(`ERROR-ServiceService: getGrossVolumeFactor()`);
        console.debug(`ERROR-ServiceService: ${error.message}`);

        return null
    }
}

async function getLocationsWithGrossVolumeDistributed(date) {
    try {
        date = date ? date.split('-')[2] ? new Date(date) : new Date(date + '-1') : new Date();
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        console.log(startDate);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        console.log(endDate);

        const allServices = await this.getServicesBetweenDates(startDate, endDate)

        const { factor, grossVolume } = await getGrossVolumeFactor(startDate, endDate, allServices),
            factorString = Dinero({ amount: factor }).toFormat('$0,0.00')
        grossVolumeString = Dinero({ amount: grossVolume }).toFormat('$0,0.00')


        const locations = await LocationService.getLocations()

        for (location of locations) {
            location.serviceQty = (allServices.filter(service => service.location.id == location.id)).length
            location.grossVolume = factor * (location.serviceQty ? location.serviceQty : 0)
            location.grossVolumeString = location.grossVolume ? Dinero({ amount: location.grossVolume }).toFormat('$0,0.00') : '$0'
        }

        return { startDate, endDate, serviceQty: allServices?.length, grossVolume, grossVolumeString, factor, factorString, locations }

    } catch (error) {
        console.debug(`ERROR-ServiceService: getLocationsWithGrossVolumeDistributed()`);
        console.debug(`ERROR-ServiceService: ${error.message}`);

        return null
    }
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
        getServicesByLocation: getServicesByLocation(Service),
        getServicesByCars: getServicesByCars(Service),
        getServicesByCarBetweenDates: getServicesByCarBetweenDates(Service),
        getServicesBetweenDates: getServicesBetweenDates(Service),
        getLocationsWithGrossVolumeDistributed
    }
}