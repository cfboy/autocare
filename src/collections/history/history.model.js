const mongoose = require('mongoose')
const Schema = mongoose.Schema

const historySchema = new Schema({
    description: String,
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    location: { type: Schema.Types.ObjectId, ref: 'location' },
    date: { type: Date, default: Date.now },
})

const historyModel = mongoose.model('history', historySchema, 'history')

module.exports = historyModel