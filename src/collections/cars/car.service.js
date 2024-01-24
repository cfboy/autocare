//Use node-fetch to call externals API. 
//Use v2.0 to use the module in code (for versions prior to version):
const fetch = require('node-fetch');
const SubscriptionService = require('../subscription')
const { STATUS } = require('../../connect/stripe');
const subscription = require('../subscription');

/**
 * This function get all cars from the db.
 * 
 * @param {} Car 
 * @returns Car list
 */
const getCars = (Car) => async () => {
    return Car.find({}, function (err, docs) {
        if (err) {
            console.error(err)
        }
        // else {
        //     console.debug("CAR-SERVICE: Found Cars: ", docs.length);
        // }
    })
}

/**
 * This function get all cars from the db.
 * 
 * @param {} Car 
 * @returns Car list
 */
const getOldCars = (Car) => async (id) => {
    return Car.find({ $and: [{ user_id: id }, { cancel_date: { $ne: null } }] }, function (err, docs) {
        if (err) {
            console.error(err)
        }
        // else {
        //     console.debug("CAR-SERVICE: getOldCars: ", docs.length);
        // }
    })
}

/**
 * This function get all cars with the user_id field null.
 * @param {*} Car 
 * @returns Car List
 */
const getCarsWithUserNull = (Car) => async () => {
    return Car.find({ user_id: { $eq: null } }, function (err, docs) {
        if (err) {
            console.error(err)
        }
        // else {
        //     console.debug("CAR-SERVICE: Found Cars with user null: ", docs.length);
        // }
    })
}

/**
 * This function assing the user id to the cars with user_id field null.
 * 
 * @param {} Car 
 * @returns Car list
 */
async function handleCarsWithUserNull(carsWithNull) {
    if (carsWithNull) {
        for (carObj of carsWithNull) {
            let subscription = await SubscriptionService.getLastSubscriptionByCar(carObj)
            // if (!carObj.user_id || carObj.user_id !== subscription.user.id) {
            if (subscription) {
                let updatedCar = await this.updateCar(carObj.id, { user_id: subscription.user.id })
                console.debug('Updated Car: ' + updatedCar.brand)
            }
            // else {
            //     console.debug('This Car not have subscription.')
            // }
            // }
        }
    }
}

/**
 * This function get all cars from db.
 * This function receive a list off cars (user cars) because the car schema don't have user reference.
 * @param {} Car 
 * @returns Car list
 */
const getCarsByList = (Car) => async (cars) => {
    return Car.find({ _id: { $in: cars } }, function (err, docs) {
        if (err) {
            console.error(err)
        }
        // else {
        //     console.debug("CAR-SERVICE: Found Cars: ", docs.length);
        // }
    })
}

/**
 * This function get a car by ID.
 * @param {carID} Car 
 * @returns Car
 */
const getCarByID = (Car) => async (carID) => {
    return Car.findOne({ _id: carID }, function (err, doc) {
        if (err) {
            console.error(err)
        }
        else if (!doc) {
            console.debug("CAR-SERVICE: Not found car");
        }
    })
}

/**
 * This function add new car to DB
 * @param {brand, model, plate} Car 
 * @returns car object
 */
const addCar = (Car) => async (brand, model, plate, user_id) => {

    if (!brand || !plate) {
        throw new Error(`Missing Data. Please provide all data for car.`)
    }

    console.log(`CAR-SERVICE: addCar(${brand})`)

    const query = {
        plate: plate.toUpperCase(),
        user_id
    }

    const update = {
        brand,
        model
    }

    const options = {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
    }
    try {
        const car = await Car.findOneAndUpdate(query, update, options)

        return car
    } catch (error) {
        if (error.code === 11000 || error.code === 11001) {
            console.error('Duplicate key error:', error);
            // Duplicate key error, update the existing document
            const existingCar = await Car.findOne({ $and: [{ plate: new RegExp(`^${query.plate}$`, 'i') }, { plate: { $ne: '' } }] });
            if (existingCar) {
                let id = existingCar.id;
                // Update the existing document with the new data
                await Car.update(query, update); // Using update method

                // Fetch and return the updated document
                const updatedCar = await Car.findOne({ id });

                return updatedCar;
            } else {
                // Handle the case where the existing document is not found
                console.error('Existing document not found for plate:', query.plate);
                throw new Error(error);
            }
        } else {
            console.error(error)
            throw new Error(error)
        }
    }
}

/**
 * This function update the Car properties by id.
 * @param {id, updates} Car 
 * @returns Car object
 */
const updateCar = (Car) => async (id, updates) => {
    // console.log(`updateCar() ID: ${id}`)
    return await Car.findByIdAndUpdate({ _id: id }, updates, { new: true }, function (err, doc) {
        if (err) {
            console.error(err.message)
        } else {
            console.debug(`CAR-SERVICE: Car Updated : ${doc.carName()}`);
        }
    })
}

/**
 * This function update cars properties by a list of id's.
 * The ids list ussualy is: cars.map(({ id }) => (id))
 * @param {ids, updates} Car 
 * @returns 
 */
const updateCars = (Car) => async (ids, updates) => {
    console.log(`updateCar() ID: ${ids}`)
    return await Car.updateMany({ _id: { $in: ids } }, updates, { new: true }, function (err, docs) {
        if (err) {
            console.error(err.message)
        }
        // else {
        //     console.debug("Updated : ", docs?.n);
        // }
    })
}

/**
 * This function delete a car from DB.
 * @param {*} Car 
 * @returns promise
 */
const deleteCar = (Car) => async (id) => {
    // TODO: implement not forever delete.

    console.log(`deleteCar() by ID: ${id}`)

    return Car.deleteOne({ _id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Deleted : ", docs);
        }
    })
}

/**
 * This function get car by plate number.
 * @param {plate} Car 
 * @returns Car
 */
const getCarByPlate = (Car) => async (plate) => {
    return Car.findOne({ $and: [{ plate: new RegExp(`^${plate}$`, 'i') }, { plate: { $ne: '' } }] }, function (err, doc) {
        if (err) {
            console.error(err)
        }
        //  else {
        //     if (doc)
        //         console.debug(`CAR-SERVICE: Found car: ${doc?.brand} - ${doc?.model} - ${doc?.plate}`);
        //     // else
        //     //     console.debug(`CAR-SERVICE: Not Found car with plate: ${plate}`);
        // }
    })
}

/**
 * This function return all cars by user object.
 * @param {*} user 
 * @returns car list
 */
const getAllCarsByUser = (Car) => async (user) => {
    // console.debug("getAllCarsByUser()...")
    return Car.find({ user_id: user.id }, function (err, docs) {
        if (err) {
            console.error(err)
        }
        // else {
        //     console.debug(`CAR-SERVICE: Found Cars ${docs.length} By user: ${user.email}`);
        // }
    })
}


/**
 * This function return all cars by user object without.
 * @param {*} user 
 * @returns car list
 */
const getAllCarsByUserWithoutSubs = (Car) => async (user) => {
    // console.debug("getAllCarsByUserWithoutSubs()...")
    let carsToReturn = []

    let cars = await Car.find({ user_id: user.id }, function (err, docs) {
        if (err) {
            console.error(err)
        }
    })

    if (cars) {
        for (carObj of cars) {
            if (await canUseThisCarForNewSubs(carObj))
                carsToReturn.push(carObj)

        }
    }

    console.debug('Existing cars available to use for other membership. - ' + carsToReturn?.length)
    return carsToReturn
}

/**
 * This function return a flag if the car can be used or not for a new subscription.
 * @param {*} car 
 * @returns flag boolean
 */
async function canUseThisCarForNewSubs(car) {
    // console.debug("canUseThisCarForNewSubs()...")
    let canUse = false
    if (car) {
        let subscription = await SubscriptionService.getLastSubscriptionByCar(car)
        if (!subscription || subscription.data.status == STATUS.CANCELED || car.cancel_date != null)
            canUse = true
    }

    return canUse
}

/**
 * This function get all subscriptions by car and then remove this car from all of these subscription.
 * @param {*} car 
 * @returns completed boolean flag
 */
async function removeCarFromAllSubscriptions(car) {
    let completed = true
    try {
        console.debug('Start removeCarFromAllSubscriptions()')
        // First get all car subscriptions to remove this car from subscriptions.
        let carSubscriptions = await SubscriptionService.getSubscriptionsByCar(car)

        for (carSubscription of carSubscriptions) {

            let item = carSubscription.items.find(item =>
                item.cars.find(itemCar =>
                    itemCar.id = car.id))

            let updatedSubscription = await SubscriptionService.removeSubscriptionCar(carSubscription.id, item.id, car)

            // Validate if the car is removed from subscription.
            let notDeletedCar = updatedSubscription.items.some(item =>
                item.cars.some(itemCar =>
                    itemCar.id == car.id))

            if (!updatedSubscription || notDeletedCar) {
                completed = false
                console.debug(`Can't delete the car (${car.id}) from subscription (${carSubscription.id}).`)
            }
            else {
                console.debug(`Car (${car.id}) removed from subscription (${carSubscription.id}).`)

                await this.updateCar(car.id, { cancel_date: null })
            }
        }
        return completed
    }
    catch (error) {
        completed = false
        console.error('ERROR: removeCarFromAllSubscriptions(): ' + car.id)
        console.error(error)
        return completed

    }

}

/**
 * This function get all makes from external API.
 * @returns 
 */
async function getAllMakes() {

    let allMakes = [], allModels = [], useCarAPI = process.env.USE_CAR_API ? process.env.USE_CAR_API : false

    if (JSON.parse(useCarAPI)) {
        // console.debug("getAllMakes from API")
        const apiRoute = 'GetAllMakes?format=json'
        const apiResponse = await fetch(
            'https://vpic.nhtsa.dot.gov/api/vehicles/' + apiRoute
        )
        let apiResponseJSON

        if (apiResponse.ok) {
            apiResponseJSON = await apiResponse.json()
            allMakes = apiResponseJSON?.Results
        } else {
            throw new Error('Cars API not working.')
        }
    } else {
        // console.debug("getAllMakes from local list")
        allMakes = require('../../helpers/carMakes').carMakes
    }

    allMakes = allMakes.sort((a, b) => a.Make_Name.localeCompare(b.Make_Name))

    return { allMakes, allModels }
}

module.exports = (Car) => {
    return {
        getCars: getCars(Car),
        getOldCars: getOldCars(Car),
        getCarsWithUserNull: getCarsWithUserNull(Car),
        getCarsByList: getCarsByList(Car),
        getCarByID: getCarByID(Car),
        addCar: addCar(Car),
        updateCar: updateCar(Car),
        updateCars: updateCars(Car),
        deleteCar: deleteCar(Car),
        getCarByPlate: getCarByPlate(Car),
        getAllMakes: getAllMakes,
        getAllCarsByUser: getAllCarsByUser(Car),
        getAllCarsByUserWithoutSubs: getAllCarsByUserWithoutSubs(Car),
        canUseThisCarForNewSubs: canUseThisCarForNewSubs,
        handleCarsWithUserNull: handleCarsWithUserNull,
        removeCarFromAllSubscriptions: removeCarFromAllSubscriptions
    }
}