const stripe = require('stripe')
const Dinero = require('dinero.js')
const { ROLES } = require('../collections/user/user.model')

const STATUS = {
    NONE: "none",
    ACTIVE: "active",
    PAST_DUE: "past_due",
    UNPAID: "unpaid",
    CANCELED: "canceled",
    INCOMPLETE: "incomplete",
    INCOMPLETE_EXPIRED: "incomplete_expired",
    TRIALING: "trialing",
}

const MIN_CANCEL_DAYS = 25

const Stripe = stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2020-08-27'
})

const createCheckoutSession = async (customerID, subscriptions, subscriptionsEntries, backURL = null) => {
    try {
        let items = [];
        let cars_price = subscriptions;
        if (subscriptionsEntries) {
            // Prepare items to create a session.
            // The first position [0] has the priceID (divided by groups)
            // The second position [1] has the list of cars per priceID.
            for (sub of subscriptionsEntries) {
                items.push({
                    price: sub[0], quantity: sub[1].length
                })
            }
        }

        const taxes = await Stripe.taxRates.list({
            active: true
        });

        let defaultTaxes = []
        if (taxes.data.length > 0)
            defaultTaxes = taxes?.data?.map(({ id }) => (id));

        let cars = []
        for (obj of cars_price) {
            cars.push({ plate: obj.plate, priceID: obj.priceID })
        }
        const session = await Stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer: customerID,
            line_items: items,
            subscription_data: {
                metadata: {
                    cars_data: JSON.stringify(cars_price)
                },
                default_tax_rates: defaultTaxes,

            },
            allow_promotion_codes: true,
            success_url: `${process.env.DOMAIN}/completeCheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.DOMAIN}/${backURL}`
        })

        return session
    }
    catch (error) {
        console.error(`ERROR-STRIPE: createCheckoutSession. ${error.message}`);
        return null
    }
}

const createCheckoutSessionWithEmail = async (email, subscriptions, subscriptionsEntries, backURL = null) => {
    try {
        let items = [];
        let cars_price = subscriptions;
        if (subscriptionsEntries) {
            // Prepare items to create a session.
            // The first position [0] has the priceID (divided by groups)
            // The second position [1] has the list of cars per priceID.
            for (sub of subscriptionsEntries) {
                items.push({
                    price: sub[0], quantity: sub[1].length
                })
            }
        }

        const taxes = await Stripe.taxRates.list({
            active: true
        });

        let defaultTaxes = []
        if (taxes.data.length > 0)
            defaultTaxes = taxes?.data?.map(({ id }) => (id));

        let cars = []
        for (obj of cars_price) {
            cars.push({ plate: obj.plate, priceID: obj.priceID })
        }
        const session = await Stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: email,
            line_items: items,
            subscription_data: {
                metadata: {
                    cars_data: JSON.stringify(cars_price)
                },
                default_tax_rates: defaultTaxes,

            },
            allow_promotion_codes: true,
            success_url: `${process.env.DOMAIN}/completeCheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.DOMAIN}/${backURL}`
        })

        return session
    }
    catch (error) {
        console.error(`ERROR-STRIPE: createCheckoutSession. ${error.message}`);
        return null
    }
}

const createBillingSession = async (customer) => {
    const session = await Stripe.billingPortal.sessions.create({
        customer,
        return_url: `${process.env.DOMAIN}`
    })
    return session
}

/**
 * This function get the session by id.
 * @param {*} sessionID 
 * @returns 
 */
const getSessionByID = async (sessionID) => {

    const session = await Stripe.checkout.sessions.retrieve(sessionID);

    return session
}

/**
 * This function get the customer on stripe by ID.
 * Expand subscriptions property to get the subs information.
 * @param {*} id 
 * @returns customer object
 */
const getCustomerByID = async (id) => {
    try {
        // console.debug(`STRIPE: getCustomerByID(${id})`);
        const customer = await Stripe.customers.retrieve(id, {
            expand: ['subscriptions'] //Expand the Customer Obj to get subscriptions info.
        })
        // console.debug(`STRIPE: Customer Found: ${customer.email}`);
        return customer

    } catch (error) {
        console.error(`ERROR-STRIPE: Customer Not Found. ${error.message}`);
    }

}

/**
 * This function update the stripe customer.
 * @param {*} id 
 * @param {*} updates 
 * @returns 
 */
const updateCustomer = async (id, updates) => {
    try {

        const customer = await Stripe.customers.update(id, updates);

        return customer
    }
    catch (error) {
        console.error(`ERROR-STRIPE: updateCustomer(). ${error.message}`);
    }

}

/**
 * This function get the customer on stripe by email.
 * @param {*} email 
 * @returns customer object
 */
const getCustomerByEmail = async (email) => {
    try {
        // console.debug(`STRIPE: getCustomerByEmail(${email})`);

        const customer = await Stripe.customers.list({
            limit: 1,
            email: email
        })
        // console.debug(`STRIPE: Customer Found`);
        // Return the first and only object in the customer list.
        return customer.data[0]

    } catch (error) {
        console.error(`ERROR-STRIPE: Stripe Customer Not Found`);
    }
}

/**
 * This function add new customer to stripe.
 * @param {*} email 
 * @param {*} firstName 
 * @param {*} lastName 
 * @param {*} phoneNumber 
 * @param {*} city 
 * @returns customer object
 */
const addNewCustomer = async (email,
    firstName = null,
    lastName = null,
    phoneNumber = null) => {
    try {
        const customer = await Stripe.customers.create({
            email,
            description: 'Created by app.',
            name: firstName + ' ' + lastName,
            phone: phoneNumber
        })

        return customer
    } catch (error) {
        console.error(`ERROR-STRIPE: Fail Add New Customer. ${error.message}`);
        throw new Error(error)
    }
}

/**
 * This function create a webhook event with stripe.
 * @param {*} rawBody 
 * @param {*} sig 
 * @returns event
 */
const createWebhook = (rawBody, sig) => {
    const event = Stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
    )
    return event
}

/**
 * This function get all stripe products where the active field is true.
 * Aditionally get the price per product.
 * @returns product list
 */
async function getAllProducts() {
    const products = await Stripe.products.list({
        active: true
    })

    if (products.data) {
        // Get price of all products.
        for (const product of products.data) {
            product.priceInfo = await getProductPrice(product.id)
            product.perks = product?.metadata?.perks?.split(',')
        }
    }

    return products.data.sort(function (a, b) { return a.metadata?.order - b.metadata?.order })
}

/**
 * This function get all prices.
 * @returns price list
 */
async function getAllPrices() {
    const prices = await Stripe.prices.list({
        active: true,
        limit: 100,
        expand: ['data.product']
    })

    const inactivePrices = await Stripe.prices.list({
        active: false,
        limit: 100,
        expand: ['data.product']
    })
    let oldPrices = inactivePrices.data.filter(price => price.metadata.type != null && price.metadata.type.includes("OLD"))

    // format currency
    for (const price of prices.data) {
        price.unit_amount = Dinero({ amount: price.unit_amount }).toFormat('$0,0.00')

        if (price?.product) {
            // Get perks of all products.
            price.product.perks = price?.product?.metadata?.perks?.split(',')
            if (oldPrices.length > 0) {
                if (price.product.metadata.productKey == "basic") {
                    let oldBasic = oldPrices.find(price => price.metadata.type === 'OLD_BASIC')?.unit_amount

                    price.oldPrice = oldBasic ? Dinero({ amount: oldBasic }).toFormat('$0,0.00') : null
                }

                else if (price.product.metadata.productKey == "pro") {
                    let oldPremium = oldPrices.find(price => price.metadata.type === 'OLD_PREMIUM')?.unit_amount
                    price.oldPrice = oldPremium ? Dinero({ amount: oldPremium }).toFormat('$0,0.00') : null
                }
            }
        }

    }

    // Filter to return only the active products.
    prices.data = prices.data.filter(price => price.product.active == true)

    return prices.data.sort(function (a, b) { return a.product.metadata?.order - b.product.metadata?.order })
}

/**
 * This function que the price per productID
 * @param {*} productID 
 * @returns prices list
 */
const getProductPrice = async (productID) => {
    const productPrices = await Stripe.prices.list({
        product: productID
    })

    // format currency
    for (const productPrice of productPrices.data) {
        productPrice.unit_amount = Dinero({ amount: productPrice.unit_amount }).toFormat('$0,0.00')

    }

    return productPrices.data
}

/**
 * This function get the product information by id.
 * @param {*} id 
 * @returns product object
 */
const getProductInfoById = async (id) => {
    try {
        const product = await Stripe.products.retrieve(id)
        // console.debug(`STRIPE: Product ${id} Found`);

        return product

    } catch (error) {
        console.error(`ERROR-STRIPE: Product Not Found. ${error.message}`);
        return null
    }
}

/**
 * This function get the customer events on stripe.
 * @param {*} customerID 
 * @returns subscription list
 */
const getCustomerEvents = async (customerID) => {
    try {
        // console.debug(`STRIPE: getCustomerEvents(${customerID})`);
        let eventsToReturn = []
        let events = await Stripe.events.list({ limit: 50 });

        eventsToReturn = events.data.filter((event) => event.data.object.id === customerID)
        // console.debug(`STRIPE: Events Found ${eventsToReturn}`);

        return eventsToReturn
    } catch (error) {
        console.error(`ERROR-STRIPE: Stripe Events Not Found.  ${error.message}`);

        return null
    }
}

/**
 * This function get the customer charges on stripe.
 * @param {*} user 
 * @returns 
 */
const getCustomerCharges = async (user) => {
    try {
        let customerID = user.billingID,
            role = user.role

        // console.debug(`STRIPE: getCustomerCharges(${customerID})`);
        let chargesToReturn = []
        let charges = await Stripe.charges.list({
            // customer: customerID,
            // limit: 50
        });

        if ([ROLES.ADMIN, ROLES.MANAGER].includes(role))
            chargesToReturn = charges.data
        else
            chargesToReturn = charges.data.filter(charge => charge?.customer === customerID)


        // console.debug(`STRIPE: Charges Found ${chargesToReturn.length}`);
        if (chargesToReturn.length > 0) {
            for (charge of chargesToReturn) {
                charge.amount = Dinero({ amount: charge.amount }).toFormat('$0,0.00')
            }
        }
        return chargesToReturn
    } catch (error) {
        console.error(`ERROR-STRIPE: Stripe Charges Not Found. ${error.message}`);

        return null
    }
}

/**
 * This function get the customer charges on stripe.
 * @param {*} user 
 * @returns 
 */
const getCustomerInvoices = async (user) => {
    try {
        let customerID = user.billingID,
            role = user.role

        // console.debug(`STRIPE: getCustomerInvoices(${customerID})`);
        let invoicesToReturn = []
        let invoices = await Stripe.invoices.list({
            // customer: customerID,
            // limit: 50
        });

        if ([ROLES.ADMIN, ROLES.MANAGER].includes(role))
            invoicesToReturn = invoices.data
        else
            invoicesToReturn = invoices.data.filter(invoice => invoice?.customer === customerID)


        // console.debug(`STRIPE: Invoices Found ${invoicesToReturn.length}`);
        if (invoicesToReturn.length > 0) {
            for (invoice of invoicesToReturn) {
                invoice.total = Dinero({ amount: invoice.total }).toFormat('$0,0.00')
            }
        }
        return invoicesToReturn
    } catch (error) {
        console.error(`ERROR-STRIPE: Stripe Charges Not Found. ${error.message}`);
        return null
    }
}

/**
 * This function get all subsctiptions.
 * @returns subscriptions list
 */
async function getAllSubscriptions() {
    const subscriptions = await Stripe.subscriptions.list({
    })

    return subscriptions.data
}

/**
 * This function get all subsctiptions by customerID.
 * @returns subscriptions list
 */
async function getCustomerSubscriptions(customerID) {
    const subscriptions = await Stripe.subscriptions.list(
        {
            customer: customerID,
            status: 'all'
        })

    return subscriptions.data
}

/**
 * This function get a subsctiption by id.
 * @returns subscriptions list
 */
async function getSubscriptionById(id) {
    try {
        const subscription = await Stripe.subscriptions.retrieve(id,
            {
                expand: ['items.data.price.product']
            })

        // console.debug("Subscription: " + subscription.id)

        return subscription
    }
    catch (error) {
        console.error(`ERROR-STRIPE: getSubscriptionById(). ${error.message}`);

        return null
    }
}

/**
 * This function get a subsctiption item by id.
 * @returns subscription item
 */
async function getSubscriptionItemById(id) {
    const subscriptionItem = await Stripe.subscriptionItems.retrieve(id,
        {
            expand: ['price.product']
        })

    return subscriptionItem
}

/**
 * This function get all customer transactions balance.
 * @returns balance transactions list, amount, and string amount
 */
async function getCustomerBalanceTransactions(id) {
    try {
        const balanceTransactions = await Stripe.customers.listBalanceTransactions(
            id
        );

        // console.debug("Balance Transactions: " + balanceTransactions.data.length)

        let total = 0.00
        for (balance of balanceTransactions.data) {
            total += balance.amount
        }
        let totalString = null

        // If the total is zero then totalString is null/undefined.
        if (total * -1 > 0) {
            totalString = Dinero({ amount: total * -1 }).toFormat('$0,0.00')
            console.debug('Total Customer Balance: ' + totalString)
        }

        return { transactions: balanceTransactions.data, total: total, totalString: totalString }
    }
    catch (error) {
        console.error(`ERROR-STRIPE: getCustomerBalanceTransactions(). ${error.message}`);

        return { transactions: null, total: null, totalString: null }
    }
}

/**
 * This function update the stripe subscription.
 * @param {*} id 
 * @param {*} updates 
 * @returns subscription obj
 */
async function updateStripeSubscription(id, updates) {
    console.log('ID: ' + id)
    // console.log('cancelAt: ' + cancelAt)
    const subscription = await Stripe.subscriptions.update(id,
        updates
    );

    return subscription
}

/**
 * This function cancel the stripe subscription.
 * @param {*} id 
 * @returns subscription obj
 */
async function cancelSubscription(id) {
    console.log('ID: ' + id)
    // console.log('cancelAt: ' + cancelAt)
    const subscription = await Stripe.subscriptions.cancel(id);

    return subscription
}

/**
 * This function return the stripe balance transactions between dates.
 * Calculate the Gross Volume
 * @param {*} startDate 
 * @param {*} endDate 
 * @returns 
 */
async function getBalanceTransactions(startDate, endDate) {

    try {
        let totalVolume = 0.00, grossVolume = 0

        for await (const balance of Stripe.balanceTransactions.list(
            {
                limit: 10,
                created: { 'gte': startDate, 'lte': endDate }
            }
        )) {
            // Do something with customer
            if (balance.type == 'charge') {
                totalVolume += balance.amount
            } else
                grossVolume += balance.amount
        }

        let grossVolumeString = null, totalVolumeString = null
        //if the grossVolume == 0 || grossVolume is > 0 then keep the same value, if not then multiplu by -1.
        grossVolume = grossVolume >= 0 ? grossVolume : grossVolume * -1
        grossVolume = Dinero({ amount: grossVolume })
        grossVolumeString = grossVolume.toFormat('$0,0.00')
        console.debug('Gross Volume: ' + grossVolumeString)


        if (totalVolume > 0) {
            totalVolumeString = Dinero({ amount: totalVolume }).toFormat('$0,0.00')
            console.debug('Total Volume: ' + totalVolumeString)
        }
        return { grossVolume, grossVolumeString, totalVolumeString }
    } catch (error) {
        console.error(`ERROR-STRIPE: getBalanceTransactions(). ${error.message}`);

        return null
    }
}

module.exports = {
    STATUS,
    MIN_CANCEL_DAYS,
    getCustomerByID,
    getCustomerByEmail,
    addNewCustomer,
    updateCustomer,
    getSessionByID,
    createCheckoutSession,
    createCheckoutSessionWithEmail,
    createBillingSession,
    createWebhook,
    getAllProducts,
    getAllPrices,
    getProductPrice,
    getProductInfoById,
    getCustomerEvents,
    getCustomerCharges,
    getCustomerInvoices,
    getAllSubscriptions,
    getSubscriptionById,
    getSubscriptionItemById,
    getCustomerBalanceTransactions,
    updateStripeSubscription,
    cancelSubscription,
    getBalanceTransactions,
    getCustomerSubscriptions
}