const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
  email: String,
  password: String,
  billingID: String, //Stripe ID
  plan: { type: String, enum: ['none', 'basic', 'pro'], default: 'none' },
  hasTrial: { type: Boolean, default: false },
  endDate: { type: Date, default: null },
  hasAllInformation: { type: Boolean, default: false },

  personalInformation: [{
    fistName: String,
    middleName: String,
    lastName: String,
    phoneNumber: String,
    dateOfBirth: { type: Date, default: null }
  }],

  carInformation: [{
    model: String,
    plate: String
  }],

  tagInformation: [{
    isttached: { type: Boolean, default: false },
    attachDate: { type: Date, default: null },
    tagID: String
  }]
})

const userModel = mongoose.model('user', userSchema, 'user')

module.exports = userModel
