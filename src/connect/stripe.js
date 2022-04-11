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

const Stripe = stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2020-08-27'
})

const createCheckoutSession = async (customerID, subscriptions, subscriptionsEntries) => {
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


    const session = await Stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: customerID,
        line_items: items,
        subscription_data: {
            metadata: {
                cars: JSON.stringify(cars_price)
            },
            default_tax_rates: defaultTaxes,

        },
        success_url: `${process.env.DOMAIN}/completeCheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.DOMAIN}`
    })

    return session
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
        console.debug(`STRIPE: Customer Found: ${customer.email}`);
        return customer

    } catch (error) {
        console.debug(`ERROR-STRIPE: Customer Not Found`);
        console.debug(`ERROR-STRIPE: ${error.message}`);
    }

}

/**
 * This function get the customer on stripe by email.
 * @param {*} email 
 * @returns customer object
 */
const getCustomerByEmail = async (email) => {
    try {
        console.debug(`STRIPE: getCustomerByEmail(${email})`);

        const customer = await Stripe.customers.list({
            limit: 1,
            email: email
        })
        console.debug(`STRIPE: Customer Found`);
        // Return the first and only object in the customer list.
        return customer.data[0]

    } catch (error) {
        console.debug(`ERROR-STRIPE: Stripe Customer Not Found`);
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
    firstName,
    lastName,
    phoneNumber,
    city) => {
    try {
        console.debug(`STRIPE: addNewCustomer()`);

        const customer = await Stripe.customers.create({
            email,
            description: 'New Customer',
            name: firstName + ' ' + lastName,
            phone: phoneNumber,
            address: {
                city: city
            }
        })

        return customer
    } catch (error) {
        console.debug(`ERROR-STRIPE: Fail Add New Customer`);

        console.debug(`ERROR-STRIPE: ${error.message}`);
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
        expand: ['data.product']
    })

    // format currency
    for (const price of prices.data) {
        price.unit_amount = Dinero({ amount: price.unit_amount }).toFormat('$0,0.00')

        if (price?.product) {
            // Get price of all products.
            price.product.perks = price?.product?.metadata?.perks?.split(',')
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
        console.debug(`STRIPE: Product ${id} Found`);

        return product

    } catch (error) {
        console.debug(`ERROR-STRIPE: Product Not Found`);
        console.debug(`ERROR-STRIPE: ${error.message}`);

        return null
    }
}


// /**
//  * This function que the customer subscriptions.
//  * @param {*} customerID 
//  * @returns subscription list
//  */
// const getCustomerSubscription = async (customerID) => {
//     try {
//         console.debug(`STRIPE: getCustomerSubscription(${customerID})`);
//         const subscription = await Stripe.subscriptions.list({
//             customer: customerID,
//             limit: 3
//         });
//         console.debug(`STRIPE: Subscription Found`);

//         return subscription
//     } catch (error) {
//         console.debug(`ERROR-STRIPE: Stripe Subscription Not Found`);
//         console.debug(`ERROR-STRIPE: ${error.message}`);

//         return null
//     }
// }
/**
 * This function get the customer events on stripe.
 * @param {*} customerID 
 * @returns subscription list
 */
const getCustomerEvents = async (customerID) => {
    try {
        console.debug(`STRIPE: getCustomerEvents(${customerID})`);
        let eventsToReturn = []
        let events = await Stripe.events.list({ limit: 50 });

        eventsToReturn = events.data.filter((event) => event.data.object.id === customerID)
        console.debug(`STRIPE: Events Found ${eventsToReturn}`);

        return eventsToReturn
    } catch (error) {
        console.debug(`ERROR-STRIPE: Stripe Events Not Found`);
        console.debug(`ERROR-STRIPE: ${error.message}`);

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

        console.debug(`STRIPE: getCustomerCharges(${customerID})`);
        let chargesToReturn = []
        let charges = await Stripe.charges.list({
            // customer: customerID,
            // limit: 50
        });

        if ([ROLES.ADMIN, ROLES.MANAGER].includes(role))
            chargesToReturn = charges.data
        else
            chargesToReturn = charges.data.filter(charge => charge?.customer === customerID)


        console.debug(`STRIPE: Charges Found ${chargesToReturn.length}`);
        if (chargesToReturn.length > 0) {
            for (charge of chargesToReturn) {
                charge.amount = Dinero({ amount: charge.amount }).toFormat('$0,0.00')
            }
        }
        return chargesToReturn
    } catch (error) {
        console.debug(`ERROR-STRIPE: Stripe Charges Not Found`);
        console.debug(`ERROR-STRIPE: ${error.message}`);

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

        console.debug(`STRIPE: getCustomerInvoices(${customerID})`);
        let invoicesToReturn = []
        let invoices = await Stripe.invoices.list({
            // customer: customerID,
            // limit: 50
        });

        if ([ROLES.ADMIN, ROLES.MANAGER].includes(role))
            invoicesToReturn = invoices.data
        else
            invoicesToReturn = invoices.data.filter(invoice => invoice?.customer === customerID)


        console.debug(`STRIPE: Invoices Found ${invoicesToReturn.length}`);
        if (invoicesToReturn.length > 0) {
            for (invoice of invoicesToReturn) {
                invoice.total = Dinero({ amount: invoice.total }).toFormat('$0,0.00')
            }
        }
        return invoicesToReturn
    } catch (error) {
        console.debug(`ERROR-STRIPE: Stripe Charges Not Found`);
        console.debug(`ERROR-STRIPE: ${error.message}`);

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
 * This function get a subsctiption by id.
 * @returns subscriptions list
 */
async function getSubscriptionById(id) {
    const subscription = await Stripe.subscriptions.retrieve(id,
        {
            expand: ['items.data.price.product']
        })

    console.debug("Subscription: " + subscription.id)

    return subscription
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
    const balanceTransactions = await Stripe.customers.listBalanceTransactions(
        id
    );

    console.debug("Balance Transactions: " + balanceTransactions.data.length)

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


//TODO: make this function more generic.
async function updateSubscription(id, cancelAt) {
    console.log('ID: ' + id)
    console.log('cancelAt: ' + cancelAt)
    const subscription = await Stripe.subscriptions.update(id,
        {
            cancel_at: cancelAt
        }
    );

    return subscription
}

module.exports = {
    STATUS,
    getCustomerByID,
    getCustomerByEmail,
    addNewCustomer,
    getSessionByID,
    createCheckoutSession,
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
    updateSubscription
}