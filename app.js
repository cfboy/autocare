if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config() //Loads environment variables from .env file into the process
}
const bodyParser = require('body-parser')
const express = require('express')
const session = require('express-session')
var MemoryStore = require('memorystore')(session)
var path = require('path');
var router = require('./router');
var moment = require('moment');
const formats = require('./src/helpers/formats')
const alertTypes = require('./src/helpers/alertTypes')
const Roles = require('./src/config/roles')
const passport = require('passport')
const flash = require('express-flash')
const methodOverride = require('method-override')

const app = express()

app.use(session({
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    secret: process.env.SESSION_SECRET
}))

// Flash is an extension of connect-flash with the ability to define a flash message and render it without redirecting the request.
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
app.use('/webhook', bodyParser.raw({ type: 'application/json' }))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static('public'))
app.set('view engine', 'ejs')

// Used to format dates
app.locals.moment = moment
app.locals.shortDateFormat = formats.shortDateFormat

// Pass all available alertTypes to the app variable.
app.locals.alertTypes = alertTypes //To use this on the client side is necessary to use JSON.stringify
app.locals.roles = Roles
app.use('/', router);

const port = process.env.PORT || 4242

app.listen(port, () => console.log(`Listening on port http://localhost:${port}/`))