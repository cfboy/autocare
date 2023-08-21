const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const UserService = require('../collections/user')
const bcrypt = require('bcrypt');

passport.use(new LocalStrategy({ usernameField: 'email', passReqToCallback: true },
    async function (req, email, password, done) {
        const lingua = req.res.lingua.content

        if (!email && !password) {
            return done(null, false, { message: lingua.validation.missingCredentials });
        }
        const currentUser = await UserService.getUserByEmail(email?.toLowerCase())

        if (!currentUser) {
            return done(null, false, { message: lingua.validation.userNotExist(email) });
        }

        console.debug("PASSPORT -> Logged User: ", currentUser.email)

        try {
            if (currentUser?.isIncomplete()) {
                return done(null, false, { message: "VALIDATION" });

            } else if (!bcrypt.compareSync(password, currentUser.password)) {
                return done(null, false, { message: lingua.validation.wrongPassword });
            }
        } catch (error) {
            return done(null, false, { message: error.message })
        }
        return done(null, currentUser);
    }
));