const mongoose = require('mongoose')
const Schema = mongoose.Schema

const locationSchema = new Schema({
    name: String,
    created_date: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: false },
    services: [],
    users: [],
    camera_id: String
})

const locationModel = mongoose.model('location', locationSchema, 'location')

module.exports = locationModel