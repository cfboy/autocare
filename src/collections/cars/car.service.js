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
            console.debug("CAR-SERVICE: Found car: ", docs.name);
        }
    })
}

/**
 * This function add new car to DB
 * @param {name, brand, model, plate} Car 
 * @returns car object
 */
const addCar = (Car) => async (name, brand, model, plate) => {
    if (!name) {
        throw new Error(`Missing Data. Please provide the name of the car.`)
    }

    console.log(`CAR-SERVICE: addCar(${name})`)

    const car = new Car({
        name,
        brand,
        model,
        plate
    })

    return await car.save()
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
            console.debug("Updated : ", doc.name);
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
            console.debug(`CAR-SERVICE: Found car: ${doc.name} - ${doc.model} - ${doc.plate}`);
        }
    })
}

module.exports = (Car) => {
    return {
        getCars: getCars(Car),
        getCarByID: getCarByID(Car),
        addCar: addCar(Car),
        updateCar: updateCar(Car),
        deleteCar: deleteCar(Car),
        getCarByPlate: getCarByPlate(Car)
    }
}