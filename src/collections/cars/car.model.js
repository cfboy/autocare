const mongoose = require('mongoose')
const Schema = mongoose.Schema

const carSchema = new Schema({
    brand: String,
    model: String,
    plate: String,
    created_date: { type: Date, default: Date.now },
})

carSchema.indexes({ brand: 1, model: 1, plate: 1 }, { unique: true })

const Car = mongoose.model('car', carSchema, 'car')

module.exports = Car