const mongoose = require('mongoose')
const Schema = mongoose.Schema

const reportSchema = new Schema({
    name: String,
    url: String
})

const Report = mongoose.model('repor', reportSchema, 'report')

module.exports = Report