//Use node-fetch to call externals API. 
//Use v2.0 to use the module in code (for versions prior to version):
const fetch = require('node-fetch');

/**
 * This function get all cars on db.
 * @param {} Car 
 * @returns Car list
 */
const getCars = (Car) => (cars) => {
    return Car.find({ _id: { $in: cars } }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("CAR-SERVICE: Found Cars: ", docs.length);
        }
    })
}

/**
 * This function get a car by ID.
 * @param {carID} Car 
 * @returns Car
 */
const getCarByID = (Car) => async (carID) => {
    return Car.findOne({ _id: carID }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("CAR-SERVICE: Found car: ", docs.brand);
        }
    })
}

/**
 * This function add new car to DB
 * @param {brand, model, plate} Car 
 * @returns car object
 */
const addCar = (Car) => async (brand, model, plate) => {
    try {
        if (!brand || !model || !plate) {
            throw new Error(`Missing Data. Please provide all data for car.`)
        }

        console.log(`CAR-SERVICE: addCar(${brand})`)

        const car = new Car({
            brand,
            model,
            plate
        })

        return await car.save()
    } catch (error) {
        console.log(`ERROR: CAR-SERVICE: addCar()`)
        return null
    }
}

/**
 * This function update the Car properties by id.
 * @param {id, updates} Car 
 * @returns Car object
 */
const updateCar = (Car) => async (id, updates) => {
    console.log(`updateCar() ID: ${id}`)
    return await Car.findByIdAndUpdate({ _id: id }, updates, function (err, doc) {
        if (err) {
            console.error(err.message)
        } else {
            console.debug("Updated : ", doc.brand);
        }
    })
}

/**
 * This function delete a car from DB.
 * @param {*} Car 
 * @returns promise
 */
const deleteCar = (Car) => async (id) => {
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
            else
                console.debug(`CAR-SERVICE: Not Found car with plate: ${plate}`);
        }
    })
}
/**
 * This function get all makes from external API.
 * @returns 
 */
async function getAllMakes() {
    const apiRoute = 'GetAllMakes?format=json'
    const apiResponse = await fetch(
        'https://vpic.nhtsa.dot.gov/api/vehicles/' + apiRoute
    )
    let apiResponseJSON
    let allMakes = [], allModels = []

    if (apiResponse.ok) {
        apiResponseJSON = await apiResponse.json()
        allMakes = apiResponseJSON?.Results
    }

    return { allMakes, allModels }
}

module.exports = (Car) => {
    return {
        getCars: getCars(Car),
        getCarByID: getCarByID(Car),
        addCar: addCar(Car),
        updateCar: updateCar(Car),
        deleteCar: deleteCar(Car),
        getCarByPlate: getCarByPlate(Car),
        getAllMakes: getAllMakes
    }
}