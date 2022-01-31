const mongoose = require('mongoose')
const Schema = mongoose.Schema
const historyTypes = require('../../config/historyTypes')

const historySchema = new Schema({
    description: String,
    type: { type: String, enum: Object.values(historyTypes), default: null },
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    location: { type: Schema.Types.ObjectId, ref: 'location', default: null },
    date: { type: Date, default: Date.now },
})

const historyModel = mongoose.model('history', historySchema, 'history')

module.exports = historyModel