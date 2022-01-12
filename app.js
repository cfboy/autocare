require('dotenv').config() //Loads environment variables from .env file into the process
const bodyParser = require('body-parser')
const express = require('express')
const session = require('express-session')
var MemoryStore = require('memorystore')(session)
var path = require('path');
var router = require('./router');
var moment = require('moment');
const formats = require('./src/helpers/formats')
const alertTypes = require('./src/helpers/alertTypes')

const app = express()

app.use(session({
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    secret: 'keyboard cat'
}))

app.use('/webhook', bodyParser.raw({ type: 'application/json' }))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static('public'))
app.set('view engine', 'ejs')
    // app.engine('html', require('ejs').renderFile)

// Used to format dates
app.locals.moment = moment
app.locals.shortDateFormat = formats.shortDateFormat

// Pass all available alertTypes to the app variable.
app.locals.alertTypes = alertTypes //To use this on the client side is necessary to use JSON.stringify
    // app.locals.alertType = ''
    // app.locals.alertMessage = ''

app.use('/', router);

const port = process.env.PORT || 4242

app.listen(port, () => console.log(`Listening on port http://localhost:${port}/`))