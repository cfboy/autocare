const stripe = require('stripe')
const Dinero = require('dinero.js')

const Stripe = stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2020-08-27'
})

const createCheckoutSession = async(customerID, price) => {
    const session = await Stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: customerID,
        line_items: [{
            price,
            quantity: 1
        }],
        subscription_data: {
            trial_period_days: process.env.TRIAL_DAYS
        },

        success_url: `${process.env.DOMAIN}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.DOMAIN}`
    })

    return session
}

const createBillingSession = async(customer) => {
    const session = await Stripe.billingPortal.sessions.create({
        customer,
        return_url: 'http://localhost:4242/account'
    })
    return session
}

const getCustomerByID = async(id) => {
    try {
        console.debug(`STRIPE: getCustomerByID(${id})`);
        const customer = await Stripe.customers.retrieve(id)
        console.log(`STRIPE: Customer Found: ${customer.email}`);
        return customer

    } catch (error) {
        console.debug(`ERROR-STRIPE: Customer Not Found`);
        console.debug(`ERROR-STRIPE: ${error.message}`);
    }

}

const getCustomerByEmail = async(email) => {
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
const addNewCustomer = async(email,
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

const createWebhook = (rawBody, sig) => {
    const event = Stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
    )
    return event
}


async function getAllProducts() {
    // On Stripe All products need a productKey Metadata field.
    const products = await Stripe.products.list({
        active: true
    })

    return products.data
}

async function getAllPrices() {
    const prices = await Stripe.prices.list({
        active: true
    })

    return prices.data
}

const getProductPrice = async(productID) => {
    const productPrices = await Stripe.prices.list({
        product: productID
    })

    // format currency
    for (const productPrice of productPrices.data) {
        productPrice.unit_amount = Dinero({ amount: productPrice.unit_amount }).toFormat('$0,0.00')

    }

    return productPrices.data
}

module.exports = {
    getCustomerByID,
    getCustomerByEmail,
    addNewCustomer,
    createCheckoutSession,
    createBillingSession,
    createWebhook,
    getAllProducts,
    getAllPrices,
    getProductPrice
}