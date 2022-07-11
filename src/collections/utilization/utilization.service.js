const SubscriptionService = require('../subscription')
const ServiceService = require('../services')
const CarService = require('../cars')

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

        console.debug('addUtilization to car: ' + car.plate)
        return await utilization.save()
    } catch (error) {
        console.debug(error)
        console.log(`ERROR: Utilization-SERVICE: addUtilization()`)
        return null
    }
}

/**
 * This function synchronize or update the utilization percentage per car if its necessary. 
 * @param {*} cars 
 * @returns updatedCars qty
 */
async function syncCarsUtilization(cars) {
    try {
        let updatedCars = 0;
        console.debug("Start syncCarsUtilization() for " + cars?.length + " cars...")
        // Execute this logic for Admins and Managers to calculate utilization on old cars.
        for (carObj of cars) {
            let subscription = await SubscriptionService.getSubscriptionByCar(carObj)
            let startDate = new Date(subscription.data.current_period_start * 1000),
                endDate = new Date(subscription.data.current_period_end * 1000),
                daysBetweenTwoDates = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)

            let services = await ServiceService.getServicesByCarBetweenDates(carObj, startDate, endDate),
                percentage = (services.length / daysBetweenTwoDates)

            if (carObj.utilization?.start_date == null || carObj.utilization?.end_date == null || carObj?.utilization?.services != services.length || carObj?.utilization?.percentage != percentage) {
                await CarService.updateCar(carObj.id, {
                    'utilization.start_date': startDate,
                    'utilization.end_date': endDate,
                    'utilization.services': services.length,
                    'utilization.percentage': percentage
                })
                updatedCars++
            }
        }

        return updatedCars
    }
    catch (error) {
        console.log(`ERROR: UTILIZATION-SERVICE: syncCarsUtilization()`)
        console.error(error)
    }
}



module.exports = (Utilization) => {
    return {
        getUtilization: getUtilization(Utilization),
        getUtilizationByCar: getUtilizationByCar(Utilization),
        getUtilizationByCarsList: getUtilizationByCarsList(Utilization),
        addUtilization: addUtilization(Utilization),
        syncCarsUtilization: syncCarsUtilization
    }
}