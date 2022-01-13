const mongoose = require('mongoose')
const Schema = mongoose.Schema

const locationSchema = new Schema({
    name: String,
    isActive: { type: Boolean, default: false }
})

const locationModel = mongoose.model('location', locationSchema, 'location')

module.exports = locationModel