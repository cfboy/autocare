/**
 * This function add new Subscription to DB.
 * @param {*} Subscription 
 * @returns Subscription
 */
const addSubscription = (Subscription) => async ({
    id, items, data, user
}) => {
    if (!id || !items || !data || !user) {
        throw new Error(`Subscription: Missing Data.`)
    }

    console.log(`Subscription: addSubscription()`)

    const subscription = new Subscription({
        id,
        items,
        data,
        user
    })

    return await subscription.save()
}

/**
 * This function updates the Subscription properties.
 * @param {*} Subscription 
 * @returns Subscription
 */
const updateSubscription = (Subscription) => async (id, updates) => {
    console.log(`updateSubscription() ID: ${id}`)

    return await Subscription.findOneAndUpdate({ id: id }, updates, function (err, doc) {
        if (err) {
            console.error(err.message)
        } else {
            console.debug("Updated : ", doc.id);
        }
    })
}

/**
 * This function add a new car to Subscription cars.
 * @param {id, car} Subscription 
 * @returns Subscription
 */
const addSubscriptionCar = (Subscription) => async (id, car, subItemID) => {
    console.log(`addSubscriptionCar() ID: ${id}`)
    return await Subscription.findOneAndUpdate({ id: id },
        { $addToSet: { "items.$[item].cars": car } },
        { "arrayFilters": [{ "item.id": subItemID }] },
        function (err, doc) {
            if (err) {
                console.error(err.message)
            } else {
                console.debug("Car Added to: ", doc.id);
            }
        }).populate('user').populate({ path: 'items.cars', model: 'car' })
}

/**
 * This function remove the car from Subscription cars.
 * @param {id, car} Subscription 
 * @returns Subscription
 */
const removeSubscriptionCar = (Subscription) => async (id, item, car) => {
    console.log(`removeSubscriptionCar() ID: ${id}`)
    return await Subscription.findOneAndUpdate({ id: id },
        { $pull: { "items.$[item].cars": car.id } },
        { "arrayFilters": [{ "item.id": item }], new: true },
        function (err, doc) {
            if (err) {
                console.error(err.message)
            } else {
                console.debug(`Car ${car.model} Removed of subscription: ${doc.id}`);
            }
        }).populate('user').populate({ path: 'items.cars', model: 'car' })
}

/**
 * This function delete the Subscription on DB.
 * @param {*} Subscription 
 * @returns promise
 */
const deleteSubscription = (Subscription) => (id) => {
    console.log(`deleteSubscription() by ID: ${id}`)

    return Subscription.deleteOne({ id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Deleted : ", docs);
        }
    })
}

/**
 * This function get all Subscriptions from DB and populate the user information.
 * @param {*} Subscription 
 * @returns 
 */
const getSubscriptions = (Subscription) => () => {
    return Subscription.find({}).populate('user')
        .populate({ path: 'items.cars', model: 'car' })
}

/**
 * This function get Subscriptions by roles.
 * @param {*} Subscription 
 * @returns Subscription
 */
const getSubscriptionsByUser = (Subscription) => (user) => {
    return Subscription.find({ user: user }).populate('user')
        .populate({ path: 'items.cars', model: 'car' })
}

/**
 * This function get Subscription by id.
 * @param {*} Subscription 
 * @returns Subscription
 */
const getSubscriptionById = (Subscription) => (id) => {
    console.log(`getSubscriptionById() by ID: ${id}`)

    return Subscription.findOne({ id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Subscription-SERVICE: Found subscription: ", docs);
        }
    }).populate('user').populate({ path: 'items.cars', model: 'car' })
}

/**
 * This function get subscription by car.
 * @param {*} Subscription 
 * @returns Subscription
 */
const getSubscriptionByCar = (Subscription) => async (car) => {
    return Subscription.findOne({
        "items.cars": { _id: car.id }
    },
        function (err, docs) {
            if (err) {
                console.error(err)
            } else {
                console.debug("Subscription-SERVICE: Found subscription: ", docs?.id);
            }
        }).populate('user').populate({ path: 'items.cars', model: 'car' })
}

/**
 * This function get all cars on subcription by user.
 * @param {*} Subscription 
 * @returns Subscription
 */
const getAllCarsByUser = (Subscription) => async (user) => {
    console.log(`getAllCarsByUser() by ID: ${user.email}`)

    let subscriptions = await Subscription.find({
        user: user, function(err, docs) {
            if (err) {
                console.error(err)
            } else {
                console.debug("Subscription-SERVICE: Found subscriptions: ", docs);
            }
        }
    }).populate('user')
        .populate({ path: 'items.cars', model: 'car' })

    let cars = []

    for (subscription of subscriptions) {
        for (item of subscription.items) {
            for (car of item.cars) {
                cars.push(car)
            }
        }
    }

    console.debug(`Found ${cars.length} cars.`)

    return cars
}

const getUserByCar = (Subscription) => async (car) => {
    console.debug(`getUserByCar() by ID: ${car.id}`)

    let subscription = await Subscription.findOne({
        "items.cars": { _id: car.id }
    },
        function (err, docs) {
            if (err) {
                console.error(err)
            } else {
                console.debug("Subscription-SERVICE: Found subscription: ", docs?.id);
            }
        }).populate('user').populate({ path: 'items.cars', model: 'car' })


    let user = subscription?.user


    return user
}

module.exports = (Subscription) => {
    return {
        addSubscription: addSubscription(Subscription),
        addSubscriptionCar: addSubscriptionCar(Subscription),
        removeSubscriptionCar: removeSubscriptionCar(Subscription),
        updateSubscription: updateSubscription(Subscription),
        deleteSubscription: deleteSubscription(Subscription),
        getSubscriptions: getSubscriptions(Subscription),
        getSubscriptionsByUser: getSubscriptionsByUser(Subscription),
        getSubscriptionById: getSubscriptionById(Subscription),
        getSubscriptionByCar: getSubscriptionByCar(Subscription),
        getAllCarsByUser: getAllCarsByUser(Subscription),
        getUserByCar: getUserByCar(Subscription)
    }
}