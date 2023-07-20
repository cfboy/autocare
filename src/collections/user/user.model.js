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
    personalInfo: {
        firstName: String,
        middleName: String,
        lastName: String,
        phoneNumber: String,
        dateOfBirth: { type: Date, default: null },
        city: String
    },
    locations: [{ type: Schema.Types.ObjectId, ref: 'location', default: null }],
    hasAllInformation: { type: Boolean, default: false },
    created_date: { type: Date, default: Date.now },
    notifications: [{
        isRead: { type: Boolean, default: false },
        message: String,
        created_date: { type: Date, default: Date.now },
    }],
    cart: {
        items: [{
            id: String,
            brand: String, model: String, plate: String,
            product: String, price: String, priceID: String
        }]
    }
})

userSchema.methods.fullName = function () {
    var strings = [this.personalInfo.firstName, this.personalInfo.middleName, this.personalInfo.lastName];

    return strings.filter(Boolean).join(" ");
};

const User = mongoose.model('user', userSchema, 'user')

module.exports = { ROLES, User }