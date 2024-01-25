const mongoose = require('mongoose')
const Schema = mongoose.Schema

const locationSchema = new Schema({
    name: String,
    created_date: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: false },
    services: [],
    // users: [],
    users: [{ type: Schema.Types.ObjectId, ref: 'user', default: null }],
    agentID: String
})

const locationModel = mongoose.model('location', locationSchema, 'location')

module.exports = locationModel