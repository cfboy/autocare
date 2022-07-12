//Use node-fetch to call externals API. 
//Use v2.0 to use the module in code (for versions prior to version):
const fetch = require('node-fetch');
const SubscriptionService = require('../subscription')
const { STATUS } = require('../../connect/stripe')

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
    // TODO: change this to find first then create new car.
    try {
        if (!brand || !model || !plate) {
            throw new Error(`Missing Data. Please provide all data for car.`)
        }

        console.log(`CAR-SERVICE: addCar(${brand})`)

        const car = new Car({
            brand,
            model,
            plate: plate.toUpperCase(),
            user_id
        })

        return await car.save()
    } catch (error) {
        console.log(`ERROR: CAR-SERVICE: addCar()`)
        console.error(error)
        return null
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
            console.debug(`CAR-SERVICE: Car Updated : ${doc.brand} - ${doc.model} - ${doc.plate}`);
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
        } else {
            if (doc)
                console.debug(`CAR-SERVICE: Found car: ${doc?.brand} - ${doc?.model} - ${doc?.plate}`);
            // else
            //     console.debug(`CAR-SERVICE: Not Found car with plate: ${plate}`);
        }
    })
}

/**
 * This function return all cars by user object.
 * @param {*} user 
 * @returns car list
 */
const getAllCarsByUser = (Car) => async (user) => {
    console.debug("getAllCarsByUser()...")
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
    console.debug("getAllCarsByUserWithoutSubs()...")
    let carsToReturn = []

    let cars = await Car.find({ user_id: user.id }, function (err, docs) {
        if (err) {
            console.error(err)
        }
    })

    if (cars) {
        for (carObj of cars) {
            let subscription = await SubscriptionService.getLastSubscriptionByCar(carObj)

            if (!subscription || subscription.data.status == STATUS.CANCELED)
                carsToReturn.push(carObj)

        }
    }

    console.debug('Existing cars available to use for other membership. - ' + carsToReturn?.length)
    return carsToReturn
}

/**
 * This function return a flag if the car can be used or not for a new subscription.
 * @param {*} user 
 * @returns car list
 */
async function canUseThisCarForNewSubs(car) {
    console.debug("canUseThisCarForNewSubs()...")
    let canUse = false
    if (car) {
        let subscription = await SubscriptionService.getLastSubscriptionByCar(car)
        if (!subscription || subscription.data.status == STATUS.CANCELED)
            canUse = true
    }

    return canUse
}


/**
 * This function get all makes from external API.
 * @returns 
 */
async function getAllMakes() {

    let allMakes = [], allModels = []

    if (JSON.parse(process.env.USE_CAR_API)) {
        // console.debug("getAllMakes from API")
        const apiRoute = 'GetAllMakes?format=json'
        const apiResponse = await fetch(
            'https://vpic.nhtsa.dot.gov/api/vehicles/' + apiRoute
        )
        let apiResponseJSON

        if (apiResponse.ok) {
            apiResponseJSON = await apiResponse.json()
            allMakes = apiResponseJSON?.Results
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
        handleCarsWithUserNull: handleCarsWithUserNull
    }
}