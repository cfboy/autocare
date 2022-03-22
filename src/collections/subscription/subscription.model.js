const mongoose = require('mongoose')
const Schema = mongoose.Schema

const subscriptionSchema = new Schema({
    id: String, //Subscription ID
    data: {},
    items: [{
        id: String, //Subscription Item ID,
        data: {},
        // priceID: String,
        cars: [{ type: Schema.Types.ObjectId, ref: 'car', default: null }]
    }],
    user: { type: Schema.Types.ObjectId, ref: 'user', default: null },
    created_date: { type: Date, default: Date.now }
})

const Subscription = mongoose.model('subscription', subscriptionSchema, 'subscription')

module.exports = { Subscription }