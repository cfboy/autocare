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
const getSubscriptionsByUser = (Subscription) => async (user) => {
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
            console.debug("Subscription-SERVICE: Found subscription: ", docs?.id);
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
                console.debug(`getSubscriptionItemByCar(): Successfully found ${result?.id}.`);
                let itemToReturn = result.items.find(item => item.cars.find(carObj => carObj.id == car.id))
                return itemToReturn
            } else {
                console.debug("getSubscriptionItemByCar(): No document matches the provided query.");
            }
        })
        .catch(err => console.error(`Failed to find document: ${err}`));
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
            console.debug(`STRIPE: The customer is already has the subscriptions set.`);
        }
        else {
            customer.subscriptions = await this.getSubscriptionsByUser(customer)
            customer.hasSubscription = false

            if (customer.subscriptions.length > 0) {
                customer.hasSubscription = true
                for (subscription of customer.subscriptions) {
                    for (item of subscription.items) {
                        item.isValid = await validateItemQty(item)
                    }
                }
            }

            console.debug(`STRIPE: Set Stripe Info to User done.`);
        }

        return customer


    } catch (error) {
        console.debug(`ERROR-STRIPE: setStripeInfoToUser()`);
        console.debug(`ERROR-STRIPE: ${error.message}`);

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
            console.debug('Cars Qty: ' + itemObj?.cars?.length)
            console.debug('Item Qty: ' + itemObj?.data?.quantity)

            if (itemObj?.cars?.length == itemObj?.data?.quantity) {
                console.debug('Item has the same quantity.')
                isValid = true
            }
            else if (itemObj?.cars?.length > itemObj?.data?.quantity) {
                // This case is when the item has more cars than it can have. 
                console.debug('Item has more cars than quantity. ')
                // Verify if any car dont have cancel_date set. 
                let notNeedSetCancelDate = itemObj.cars.filter(car => car.cancel_date == null)?.length === itemObj?.data?.quantity

                if (notNeedSetCancelDate)
                    isValid = true

            }
            else if (itemObj?.cars?.length < itemObj?.data?.quantity) {
                // Need add more cars.

                console.debug('Item has less cars than quantity. ')
            }

        }


        console.debug(`STRIPE: validateSubscriptionItems() done.`);
        return isValid

    } catch (error) {
        console.debug(`ERROR-STRIPE: validateSubscriptionItems()`);
        console.debug(`ERROR-STRIPE: ${error.message}`);
        console.debug(error);

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
        getSubscriptionById: getSubscriptionById(Subscription),
        getSubscriptionByCar: getSubscriptionByCar(Subscription),
        getSubscriptionItemByCar: getSubscriptionItemByCar(Subscription),
        getUserByCar: getUserByCar(Subscription),
        setStripeInfoToUser: setStripeInfoToUser,
        validateItemQty: validateItemQty
    }
}