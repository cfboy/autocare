/**
 * This function get all utilization from the db.
 * 
 * @param {} Car 
 * @returns Utilization list
 */
const getUtilization = (Utilization) => async () => {
    return Utilization.find({}, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Utilization-SERVICE: Found Utilization: ", docs.length);
        }
    })
}

/**
 * This function get all utilization of car from db.
 * This function receive a car obj
 * @param {} car
 * @returns Utilization list
 */
const getUtilizationByCar = (Utilization) => async (car) => {
    return Utilization.find({ car: car }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Utilization-SERVICE: Found utilization by car: ", docs.length);
        }
    })
}

/**
 * This function get all utilization of cars from db.
 * This function receive a list of cars
 * @param {} cars 
 * @returns Utilization list
 */
const getUtilizationByCarsList = (Utilization) => async (cars) => {
    return Utilization.find({ car: { $in: cars } }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Utilization-SERVICE: Found Cars: ", docs.length);
        }
    })
}
/**
 * 
 * @param {car, startDate, endDate, services, percentage} Utilization 
 * @returns 
 */
const addUtilization = (Utilization) => async (car, startDate, endDate, services, percentage) => {
    try {
        if (!car || !startDate || !endDate || !services || !percentage) {
            throw new Error(`Missing Data. Please provide all data for utilization.`)
        }

        const utilization = new Utilization({
            car, start_date: startDate, end_date: endDate, services, percentage
        })

        return await utilization.save()
    } catch (error) {
        console.debug(error)
        console.log(`ERROR: Utilization-SERVICE: addUtilization()`)
        return null
    }
}

module.exports = (Utilization) => {
    return {
        getUtilization: getUtilization(Utilization),
        getUtilizationByCar: getUtilizationByCar(Utilization),
        getUtilizationByCarsList: getUtilizationByCarsList(Utilization),
        addUtilization: addUtilization(Utilization)
    }
}