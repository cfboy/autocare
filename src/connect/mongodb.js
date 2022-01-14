const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const db = process.env.MONGODB
    //const db = 'mongodb+srv://acutocare:autocarepass@autocarecluster.rwevq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'

mongoose.connect(db, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false
})

mongoose.connection.on('connected', function() {
    console.log('Mongoose default connection open to ' + process.env.MONGODB)
})

mongoose.connection.on('error', function(err) {
    console.log('Mongoose default connection error: ' + err)
})

mongoose.connection.on('disconnected', function() {
    console.log('Mongoose default connection disconnected')
})

process.on('SIGINT', function() {
    mongoose.connection.close(function() {
        console.log(
            'Mongoose default connection disconnected through app termination'
        )
        process.exit(0)
    })
})