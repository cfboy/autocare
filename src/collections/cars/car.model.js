const mongoose = require('mongoose')
const Schema = mongoose.Schema

const carSchema = new Schema({
    brand: String,
    model: String,
    plate: String
})

carSchema.indexes({ brand: 1, model: 1, plate: 1 }, { unique: true })

const Car = mongoose.model('car', carSchema, 'car')

module.exports = Car