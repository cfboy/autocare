const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const UserService = require('../collections/user')
const bcrypt = require('bcrypt');

passport.use(new LocalStrategy({ usernameField: 'email', passReqToCallback: true },
    async function (req, email, password, done) {
        const lingua = req.res.lingua.content

        if (!email && !password) {
            return done(null, false, { message: lingua.missingCredentials });
        }
        const currentUser = await UserService.getUserByEmail(email)

        if (!currentUser) {
            return done(null, false, { message: lingua.userNotExist(email) });
        }

        console.debug("PASSPORT: Currentuser: ", currentUser)

        try {
            if (!bcrypt.compareSync(password, currentUser.password)) {
                return done(null, false, { message: lingua.wrongPassword });
            }
        } catch (error) {
            return done(null, false, { message: error })
        }
        return done(null, currentUser);
    }
));