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
    }).populate({ path: 'services.location', model: 'location' })
        .populate({ path: 'services.authorizedBy', model: 'user' })
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
    }).populate({ path: 'services.location', model: 'location' })
        .populate({ path: 'services.authorizedBy', model: 'user' })
}

/**
 * This function add new car to DB
 * @param {brand, model, plate} Car 
 * @returns car object
 */
const addCar = (Car) => async (brand, model, plate) => {
    // TODO: change this to find first then create new car.
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
    return await Car.findByIdAndUpdate({ _id: id }, updates, { new: true }, function (err, doc) {
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
            else
                console.debug(`CAR-SERVICE: Not Found car with plate: ${plate}`);
        }
    }).populate({ path: 'services.location', model: 'location' })
        .populate({ path: 'services.authorizedBy', model: 'user' })
}

/**
 * This function add new service to a Car.
 * Find the Car and add new service.
 * @param {carID, authorizedBy, location} 
 * @returns car object, service object
 */
const addService = (Car) => async (carID, authorizedBy, location) => {
    console.log(`addService() ID: ${carID}`)

    let service = {
        // id is a random ID genetated with letters and numbers. 
        // TODO: change the id.
        id: 'AC-' + Math.random().toString(36).toUpperCase().substring(2, 6),
        date: Date.now(),
        location: location,
        authorizedBy: authorizedBy

    }, car = await Car.findByIdAndUpdate({ _id: carID }, { $addToSet: { services: service } },
        { new: true }, function (err, doc) {
            if (err) {
                console.error(err)
                console.error(err.message)
            } else {
                console.debug(`Service Added (${service?.id}) to a car ${doc.id}`);
            }
        }).populate({ path: 'services.location', model: 'location' })
        .populate({ path: 'services.authorizedBy', model: 'user' })

    service = (car.services.find(({ id }) => id === service.id))

    return [car, service]
}

/**
 * This function get service by id.
 * @param {*} Car 
 * @returns service
 */
const getServiceById = (Car) => async (serviceID) => {
    return Car.findOne({ 'services.id': serviceID })
        .populate({ path: 'services.location', model: 'location' })
        .populate({ path: 'services.authorizedBy', model: 'user' })
        .then(result => {
            if (result) {
                console.debug(`Successfully found document: ${result.id}.`);
            } else {
                console.debug("No document matches the provided query.");
            }
            let service = result?.services?.find(service => service.id == serviceID)
            service.car = result
            return service;
        })
        .catch(err => console.error(`Failed to find document: ${err}`));
}

/**
 * This function return all cars by user object.
 * @param {*} user 
 * @returns car list
 */
async function getAllCarsByUser(user) {
    console.debug("getAllCarsByUser()...")

    let userCars = []
    // TODO: move this to service.
    for (customerSub of user?.subscriptions) {
        // Iterates the items on DB subscription.
        for (customerItem of customerSub?.items) {
            // then iterates cars in DB item.
            for (car of customerItem?.cars) {
                userCars.push(car)
            }
        }
    }

    // Get cars to populate all infromation.
    userCars = await this.getCars(userCars)

    return userCars
}

/**
 * This funtion returns all services by servideID and carID, if not have carID the call another function.
 * @param {*} serviceID 
 * @param {*} carID 
 * @returns service
 */
async function getServicesByIdAndCarId(serviceID, carID) {
    console.debug("getServicesByIdAndCarId()...")
    let service

    if (carID) {
        let car = await this.getCarByID(carID)

        for (carService of car.services) {
            if (carService.id == serviceID) {
                service = carService
                service.car = car
            }
        }
    } else {
        service = await this.getServiceById(serviceID)
    }

    return service
}

/**
 * This function returns all services by car list.
 * @param {*} userCars 
 * @returns service list
 */
async function getAllServicesByCarList(userCars) {
    console.debug("getAllServicesByCarList()...")

    let allServices = [] //On this array store all the services.

    if (userCars) {
        allServices = [] //On this array store all the services.
        for (car of userCars) {
            for (service of car.services) {
                service.car = car
                allServices.push(service)
            }
        }

        return allServices
    }
}

/**
 * This function get all makes from external API.
 * @returns 
 */
async function getAllMakes() {

    let allMakes = [], allModels = []

    if (JSON.parse(process.env.USE_CAR_API)) {
        console.debug("getAllMakes from API")
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
        console.debug("getAllMakes from local list")
        allMakes = require('../../helpers/carMakes').carMakes
    }

    allMakes = allMakes.sort((a, b) => a.Make_Name.localeCompare(b.Make_Name))

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
        addService: addService(Car),
        getServiceById: getServiceById(Car),
        getServicesByIdAndCarId: getServicesByIdAndCarId,
        getAllMakes: getAllMakes,
        getAllCarsByUser: getAllCarsByUser,
        getAllServicesByCarList: getAllServicesByCarList
    }
}