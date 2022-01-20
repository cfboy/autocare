const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const UserService = require('../collections/user')
const bcrypt = require('bcrypt');

passport.use(new LocalStrategy({ usernameField: 'email' },
    async function(email, password, done) {
        if (!email && !password) {
            return done(null, false, { message: `Missing email or password` });
        }
        const currentUser = await UserService.getUserByEmail(email)

        if (!currentUser) {
            return done(null, false, { message: `User with email ${email} does not exist. Please Register.` });
        }

        console.log("currentuser: ", currentUser)

        try {
            if (!bcrypt.compareSync(password, currentUser.password)) {
                return done(null, false, { message: `Incorrect password provided` });
            }
        } catch (error) {
            return done(null, false, { message: error })
        }
        return done(null, currentUser);
    }
));