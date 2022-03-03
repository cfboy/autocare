const mongoose = require('mongoose')
const Schema = mongoose.Schema

const carSchema = new Schema({
    brand: String,
    model: String,
    plate: { type: String, unique: true },
    created_date: { type: Date, default: Date.now },
    services: [{
        id: String,
        date: { type: Date, default: Date.now },
        location: { type: Schema.Types.ObjectId, ref: 'location', default: null },
        authorizedBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
    }]
})

carSchema.indexes({ brand: 1, model: 1, plate: 1 }, { unique: true })

const Car = mongoose.model('car', carSchema, 'car')

module.exports = Car