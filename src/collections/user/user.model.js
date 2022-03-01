const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ROLES = {
    ADMIN: 'Admin',
    CUSTOMER: 'Customer',
    CASHIER: 'Cashier',
    MANAGER: 'Manager'
}

const userSchema = new Schema({
    email: String,
    password: String,
    billingID: String, //Stripe ID
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
    locations: [{ type: Schema.Types.ObjectId, ref: 'location', default: null }],
    hasAllInformation: { type: Boolean, default: false },
    created_date: { type: Date, default: Date.now },
    subscriptions: [{
        id: String, //Subscription ID
        items: [{
            id: String, //Subscription Item ID
            // priceID: String,
            cars: [{ type: Schema.Types.ObjectId, ref: 'car', default: null }]
        }]
    }],
    personalInfo: {
        firstName: String,
        middleName: String,
        lastName: String,
        phoneNumber: String,
        dateOfBirth: { type: Date, default: null },
        city: String
    },
    services: [{
        id: String,
        date: { type: Date, default: Date.now },
        location: { type: Schema.Types.ObjectId, ref: 'location', default: null },
        authorizedBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
    }],
})

const User = mongoose.model('user', userSchema, 'user')

module.exports = { ROLES, User }