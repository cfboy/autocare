const mongoose = require('mongoose')
const Schema = mongoose.Schema

const serviceSchema = new Schema({
    id: String,
    created_date: { type: Date, default: Date.now },
    location: { type: Schema.Types.ObjectId, ref: 'location', default: null },
    authorizedBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
    car: { type: Schema.Types.ObjectId, ref: 'car', default: null },
    user: { type: Schema.Types.ObjectId, ref: 'user', default: null },
    product: String,
    inputType: { type: String, enum: ['System', 'Manual'], default: 'Manual' }
})


const Service = mongoose.model('service', serviceSchema, 'service')

module.exports = Service