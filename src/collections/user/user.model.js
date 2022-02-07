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
    location: { type: Schema.Types.ObjectId, ref: 'location', default: null },
    hasAllInformation: { type: Boolean, default: false },

    personalInfo: {
        firstName: String,
        middleName: String,
        lastName: String,
        phoneNumber: String,
        dateOfBirth: { type: Date, default: null },
        city: String
    },

    carInfo: {
        brand: String,
        model: String,
        plate: String
    },
    membershipInfo: {
        plan: { type: String, enum: ['none', 'basic', 'pro'], default: 'none' },
        hasTrial: { type: Boolean, default: false },
        endDate: { type: Date, default: null }
    },
    tagInfo: {
        isttached: { type: Boolean, default: false },
        attachDate: { type: Date, default: null },
        tagID: String
    }
})

const User = mongoose.model('user', userSchema, 'user')

module.exports = {ROLES, User}