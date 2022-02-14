if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config() //Loads environment variables from .env file into the process
}
const bodyParser = require('body-parser'),
    express = require('express'),
    session = require('express-session'),
    flash = require('express-flash'),
    methodOverride = require('method-override'),
    lingua = require('lingua'),
    formats = require('./src/helpers/formats'),
    alertTypes = require('./src/helpers/alertTypes'),
    { ROLES } = require('./src/collections/user/user.model'),
    passport = require('passport'),
    { STATUS } = require('./src/connect/stripe');

var MemoryStore = require('memorystore')(session),
    router = require('./router'),
    moment = require('moment');

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

// Passport handle authentication.
app.use(passport.initialize())
app.use(passport.session())

// methodOverride is to use DELETE method on router.
app.use(methodOverride('_method'))

app.use('/webhook', bodyParser.raw({ type: 'application/json' }))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static('public'))
app.set('view engine', 'ejs')

// Used to format dates
app.locals.moment = moment
app.locals.shortDateFormat = formats.shortDateFormat
app.locals.completeDateFormat = formats.completeDateFormat

// Pass all available alertTypes to the app variable.
app.locals.alertTypes = alertTypes //To use this on the client side is necessary to use JSON.stringify
app.locals.roles = ROLES
app.locals.stripeStatus = STATUS

// Lingua configuration
app.use(lingua(app, {
    defaultLocale: 'es',
    path: __dirname + '/languages',
    storageKey: 'lang', // http://domain.tld/?lang=de
    cookieOptions: {
        // domain: '.domain.tld', // to allow subdomains access to the same cookie, for instance
        // path: '/blog', // to restrict the language cookie to a path
        httpOnly: false, // if you need access to this cookie from javascript on the client
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // expire in 1 day instead of 1 year
        // secure: true // for serving over https
    }
}));

app.use('/', router);

const port = process.env.PORT || 4242

app.listen(port, () => console.log(`Listening on port http://localhost:${port}/`))