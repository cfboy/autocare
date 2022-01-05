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
        return_url: 'https://localhost:4242'
    })
    return session
}

const getCustomerByID = async(id) => {
    const customer = await Stripe.customers.retrieve(id)
    return customer
}

const getCustomerByEmail = async(email) => {
    const customer = await Stripe.customers.list({
            limit: 1,
            email: email
        })
        // Return the first and only object in the customer list.
    return customer.data[0]
}
const addNewCustomer = async(email,
    firstName,
    lastName,
    phoneNumber,
    city) => {

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