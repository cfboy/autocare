const mongoose = require('mongoose')
const Schema = mongoose.Schema

const utilizationSchema = new Schema({
    car: { type: Schema.Types.ObjectId, ref: 'car', default: null },
    created_date: { type: Date, default: Date.now },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    services: Number,
    percentage: Number
})


const Utilization = mongoose.model('utilization', utilizationSchema, 'utilization')

module.exports = Utilization