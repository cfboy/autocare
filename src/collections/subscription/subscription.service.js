const { STATUS, MIN_CANCEL_DAYS } = require('../../connect/stripe');
/**
 * IMPORTANT: All the subscription obj has the ID of Stripe Subscription Obj on id property.
 * So when need to find a subscription by id should use findOne instead findByID.
 * This is because the findById methods assumes that the parameter is an ObjectID. 
 * 
 *  */

/**
 * This function add new Subscription to DB.
 * @param {*} Subscription 
 * @returns Subscription
 */
const addSubscription = (Subscription) => async ({ id, items, data, user }) => {
    if (!id || !items || !data || !user) {
        throw new Error(`Subscription: Missing Data.`)
    }

    // console.log(`Subscription: addSubscription()`)

    const query = {
        id
    }

    const update = {
        items,
        data,
        user
    }

    const options = {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
    }

    try {
        const subscription = await Subscription.findOneAndUpdate(query, update, options).populate({ path: 'user', model: 'user' });
        return subscription;
    } catch (error) {
        if (error.code === 11000 || error.code === 11001) {
            console.error('Duplicate key error:', error);
            // Duplicate key error, update the existing document
            const existingSubscription = await Subscription.findOne({ id });
            if (existingSubscription) {
                // Update the existing document with the new data
                await Subscription.update(query, update); // Using update method

                // Fetch and return the updated document
                const updatedSubscription = await Subscription.findOne({ id }).populate({ path: 'user', model: 'user' });

                return updatedSubscription;
            } else {
                // Handle the case where the existing document is not found
                console.error('Existing document not found for id:', id);
                throw new Error(error);
            }
        } else {
            console.error(error)
            throw new Error(error)
        }
    }

    return subscription
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
            console.debug("Subscription-SERVICE Updated: ", doc.id);
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
                console.debug(`Car ${car.carName()} Removed of subscription: ${doc.id}`);
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
const getSubscriptionsByUser = (Subscription) => async (user) => {
    return Subscription.find({ user: user }).populate('user')
        .populate({ path: 'items.cars', model: 'car' }).sort({ _id: -1 })
}

/**
 * This function get the subscriptions by price id.
 * @param {*} Subscription 
 * @returns 
 */
const getSubscriptionsByPrice = (Subscription) => async (price) => {
    return Subscription.find(
        {
            $and: [
                { "items.data.price.id": price },
                { "data.status": STATUS.ACTIVE }
            ]
        }).sort({ _id: -1 })
}

/**
 * This function get Subscription by id.
 * @param {*} Subscription 
 * @returns Subscription
 */
const getSubscriptionById = (Subscription) => (id) => {
    // console.log(`getSubscriptionById() by ID: ${id}`)

    return Subscription.findOne({ id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        }
        // else {
        // console.debug("Subscription-SERVICE: Found subscription: ", docs?.id);
        // }
    }).populate('user').populate({ path: 'items.cars', model: 'car' })
}

/**
 * This function get subscription by car.
 * @param {*} Subscription 
 * @returns Subscription
 */
const getSubscriptionByCar = (Subscription) => async (car) => {
    return Subscription.findOne({
        "items.cars": { _id: (car.id ? car.id : car._id) } //Added the conditional statemet if the car.id is undefined.
    },
        function (err, docs) {
            if (err) {
                console.error(err)
            }
            // else {
            // console.debug("Subscription-SERVICE: Found subscription: ", docs?.id);
            // }
        }).populate('user').populate({ path: 'items.cars', model: 'car' })
}

/**
 * This function get all Subscriptions by car.
 * @param {*} Subscription 
 * @returns Subscription list
 */
const getSubscriptionsByCar = (Subscription) => async (car) => {
    return Subscription.find({
        "items.cars": { _id: (car.id ? car.id : car._id) }
    }, function (err, docs) {
        if (err) {
            console.error(err)
        }
    }).populate('user').populate({ path: 'items.cars', model: 'car' }).sort({ _id: -1 })
}

/**
 * This function get the last subscription by car.
 * @param {*} Subscription 
 * @returns Subscription
 */
const getLastSubscriptionByCar = (Subscription) => async (car) => {
    // TODO: Get last subscription ACTIVE by car.
    return await Subscription.findOne(
        { "items.cars": { _id: (car.id ? car.id : car._id) } },
        function (err, doc) {
            if (err) {
                console.error(err)
            }
            // else if (doc) {
            // console.debug("Found the last subscription by car: " + doc.id)
            // }
        }).sort({ _id: -1 }).populate('user').populate({ path: 'items.cars', model: 'car' })
}


/**
 *  This function get the last active subscription by car.
 * @param {*} Subscription 
 * @returns Subscription
 */
const getLastActiveSubscriptionByCar = (Subscription) => async (car) => {

    return await Subscription.findOne({
        $and: [
            { "items.cars": { _id: (car.id ? car.id : car._id) } },
            { "data.status": STATUS.ACTIVE }
        ]
    },
        function (err, doc) {
            if (err) {
                console.error(err)
            } else if (doc) {
                console.debug("Found the last active subscription by car: " + doc.id)
            }
        }).sort({ _id: -1 }).populate('user').populate({ path: 'items.cars', model: 'car' })
}

/**
 * This function get subscription by car.
 * @param {*} Subscription 
 * @returns Subscription
 */
const getSubscriptionItemByCar = (Subscription) => async (car) => {
    return await Subscription.findOne({
        "items.cars": { _id: car.id }
    }).populate('user').populate({ path: 'items.cars', model: 'car' })
        .then(result => {
            if (result) {
                // console.debug(`getSubscriptionItemByCar(): Successfully found ${result?.id}.`);
                let item = result.items.find(item => item.cars.find(carObj => carObj.id == car.id))
                return { item, subscription: result }
            }
            // else {
            //     console.debug("getSubscriptionItemByCar(): No document matches the provided query.");
            // }
        })
        .catch(err => console.error(`ERROR: getSubscriptionItemByCar Failed to find document: ${err}`));
}

const getSubscriptionCarsById = (Subscription) => async (id) => {
    return await Subscription.findOne({ id: id }).populate('user').populate({ path: 'items.cars', model: 'car' })
        .then(result => {
            if (result) {
                console.debug(`getSubscriptionCarsById(): Successfully found ${result?.id}.`);
                let itemsToReturn = []
                for (item of result.items) {
                    itemsToReturn = itemsToReturn.concat(item.cars)
                }
                return itemsToReturn
            }
            // else {
            //     console.debug("getSubscriptionCarsById(): No document matches the provided query.");
            // }
        })
        .catch(err => console.error(`Failed to find document: ${err}`));
}

/**
 * This function set the subscription information temporary on .subscriptons property in the user object.
 * @param {*} customerObj 
 * @param {*} prices 
 * @returns customer object
 */

async function setStripeInfoToUser(customerObj) {
    try {

        let customer = customerObj

        if (customer?.subscriptions) {
            console.debug(`STRIPE: The customer ${customer.email} is already has the subscriptions set.`);
        }
        else {
            customer.subscriptions = await this.getSubscriptionsByUser(customer)
            customer.hasSubscription = false

            if (customer.subscriptions.length > 0) {
                customer.hasSubscription = true
                for (sub of customer.subscriptions) {
                    for (item of sub.items) {
                        // If the status of subscriptions is CANCELED, then is not necessary to validateItemQty.
                        item.isValid = (sub.data.status == STATUS.CANCELED || sub.data.status == STATUS.INCOMPLETE_EXPIRED) ? true : await validateItemQty(item)
                    }
                }
            }

            // console.debug(`STRIPE: Set Stripe Info to User done.`);
        }

        return customer


    } catch (error) {
        console.debug(`ERROR-STRIPE: setStripeInfoToUser()`);
        console.debug(`ERROR-STRIPE: ${error}`);

        return null
    }
}

/**
 * This function set the stripe information temporary on .stripe property in the user object.
 * @param {*} customerObj 
 * @param {*} prices 
 * @returns customer object
 */

async function validateItemQty(item) {
    try {

        let itemObj = item
        let isValid = false

        if (itemObj) {
            // console.debug('Cars Qty: ' + itemObj?.cars?.length)
            // console.debug('Item Qty: ' + itemObj?.data?.quantity)

            if (itemObj?.cars?.length == itemObj?.data?.quantity) {
                // console.debug('Item has the same quantity.')
                isValid = true
            }
            else if (itemObj?.cars?.length > itemObj?.data?.quantity) {
                // This case is when the item has more cars than it can have. 
                // console.debug('Item has more cars than quantity. ')
                // Verify if any car dont have cancel_date set. 
                let notNeedSetCancelDate = itemObj.cars.filter(car => car.cancel_date == null)?.length === itemObj?.data?.quantity

                if (notNeedSetCancelDate)
                    isValid = true

            }
            else if (itemObj?.cars?.length < itemObj?.data?.quantity) {
                // Need add more cars.

                // console.debug('Item has less cars than quantity. ')
            }

        }


        // console.debug(`STRIPE: validateSubscriptionItems() done.`);
        return isValid

    } catch (error) {
        console.debug(`ERROR-STRIPE: validateSubscriptionItems()`);
        console.debug(`ERROR-STRIPE: ${error.message}`);
        console.debug(error);

        return null
    }
}

/**
 * This function find the subscription by id and get the current day of the period.
 * @param {*} id 
 * @returns 
 */
async function getSubscriptionDayOfPeriod(id) {

    try {
        let subscription = await this.getSubscriptionById(id)
        let startDate = new Date(subscription.data.current_period_start * 1000),
            currentDate = new Date(),
            endDate = new Date(subscription.data.current_period_end * 1000),
            daysBetweenTwoDates = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)

        daysSinceStart = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        console.log(`La suscripción se encuentra en el día ${daysSinceStart} de su periodo.`);

        // TODO: use lingua for this messages.
        let message = `Si cancela no prodrá revertir esta acción.`

        let cancelInNextPeriod = false,
            cancelDate = endDate
        if (daysSinceStart > MIN_CANCEL_DAYS) {
            cancelInNextPeriod = true
            // Cancel in the next period
            cancelDate = new Date(cancelDate.setDate(endDate.getDate() + daysBetweenTwoDates))
            message = `La suscripción se encuentra en el día ${daysSinceStart} de su periodo.
             Si cancela se le cobrará el próximo periodo.`
        }


        return { message, daysSinceStart, cancelInNextPeriod, cancelDate }

    }
    catch (error) {
        console.log(`ERROR: subscription.service: getSubscriptionDayOfPeriod()`)
        console.error(error)
        return null
    }
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
        getSubscriptionsByPrice: getSubscriptionsByPrice(Subscription),
        getSubscriptionById: getSubscriptionById(Subscription),
        getSubscriptionDayOfPeriod: getSubscriptionDayOfPeriod,
        getSubscriptionByCar: getSubscriptionByCar(Subscription),
        getSubscriptionsByCar: getSubscriptionsByCar(Subscription),
        getSubscriptionItemByCar: getSubscriptionItemByCar(Subscription),
        getSubscriptionCarsById: getSubscriptionCarsById(Subscription),
        getLastSubscriptionByCar: getLastSubscriptionByCar(Subscription),
        getLastActiveSubscriptionByCar: getLastActiveSubscriptionByCar(Subscription),
        setStripeInfoToUser: setStripeInfoToUser,
        validateItemQty: validateItemQty
    }
}