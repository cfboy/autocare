const mongoose = require('mongoose')
const Schema = mongoose.Schema
const historyTypes = { SERVICE: 'Service', USER_ACTION: 'User Action', CUSTOMER_ACTION: 'Customer Action' }

const historySchema = new Schema({
    description: String,
    type: { type: String, enum: Object.values(historyTypes), default: null },
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    location: { type: Schema.Types.ObjectId, ref: 'location', default: null },
    created_date: { type: Date, default: Date.now },
})

const History = mongoose.model('history', historySchema, 'history')

module.exports = {History, historyTypes}