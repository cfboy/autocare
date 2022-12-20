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
        if (!car || !startDate || !endDate || services == null || percentage == null) {
            console.debug("car -> " + car?.id)
            console.debug("startDate -> " + startDate)
            console.debug("endDate -> " + endDate)
            console.debug("services -> " + services)
            console.debug("percentage -> " + percentage)
            throw new Error(`Missing Data. Please provide all data for utilization.`)
        }

        let date = new Date()
        date.setSeconds(0, 0)

        const query = {
            car: car,
            created_date: date,
            start_date: startDate,
            end_date: endDate,
            services, percentage
        }

        const update = {

        }

        const options = {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }

        const utilization = await Utilization.findOneAndUpdate(query, update, options)
        console.debug(`Utilization-SERVICE: New utilization ID: ${utilization.id} to car ${car.plate}`)
        return utilization

    } catch (error) {
        console.debug(error)
        console.log(`ERROR: Utilization-SERVICE: addUtilization()`)
        return null
    }
}

async function calculateUtilizationPercent(car, isUseService) {

    try {
        let carUpdated = false;
        let subscription = await SubscriptionService.getLastSubscriptionByCar(car)
        let startDate = new Date(subscription.data.current_period_start * 1000),
            endDate = new Date(subscription.data.current_period_end * 1000),
            daysBetweenTwoDates = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)

        let services = await ServiceService.getServicesByCarBetweenDates(car, startDate, endDate),
            percentage = (services.length / daysBetweenTwoDates)

        if (isUseService || (car?.utilization?.start_date == null || car?.utilization?.end_date == null || car?.utilization?.services != services.length || car?.utilization?.percentage != percentage)) {
            await CarService.updateCar(car.id ? car.id : car._id, {
                'utilization.start_date': startDate,
                'utilization.end_date': endDate,
                'utilization.services': services.length,
                'utilization.percentage': percentage
            })

            carUpdated = true

        }

        return percentage, carUpdated

    }
    catch (error) {
        console.log(`ERROR: UTILIZATION-SERVICE: calculateUtilizationPercent()`)
        console.error(error)
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

            let percentage, carUpdated = await this.calculateUtilizationPercent(carObj, false)

            carUpdated ? updatedCars++ : updatedCars

        }

        return updatedCars
    }
    catch (error) {
        console.log(`ERROR: UTILIZATION-SERVICE: syncCarsUtilization()`)
        console.error(error)
    }
}

/**
 * This function add new Utilization History to a car, then update the car to prepare the new period utilization values.
 * @param {*} car 
 * @param {*} periodStart 
 * @param {*} periodEnd 
 */
async function handleUtilization(car, periodStart, periodEnd) {
    try {
        if (car && car.utilization.start_date &&
            car.utilization.end_date &&
            car.utilization.services &&
            car.utilization.percentage) {
            await this.addUtilization(car,
                car.utilization.start_date,
                car.utilization.end_date,
                car.utilization.services,
                car.utilization.percentage)
        }
        // Calculate the new dates.
        // Get the dates from new invoice. 
        let newStartDate = new Date(periodStart * 1000)
        let newEndDate = new Date(periodEnd * 1000)

        // Reset current utilization on car model.
        await CarService.updateCar(car.id, {
            'utilization.start_date': newStartDate,
            'utilization.end_date': newEndDate,
            'utilization.services': 0,
            'utilization.percentage': 0
        })
    }
    catch (error) {
        console.log(`ERROR: UTILIZATION-SERVICE: handleUtilization()`)
        console.error(error)
    }
}



module.exports = (Utilization) => {
    return {
        getUtilization: getUtilization(Utilization),
        getUtilizationByCar: getUtilizationByCar(Utilization),
        getUtilizationByCarsList: getUtilizationByCarsList(Utilization),
        addUtilization: addUtilization(Utilization),
        syncCarsUtilization: syncCarsUtilization,
        calculateUtilizationPercent: calculateUtilizationPercent,
        handleUtilization: handleUtilization
    }
}