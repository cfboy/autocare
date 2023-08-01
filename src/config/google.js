const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const UserService = require('../collections/user')

authUser = async (request, accessToken, refreshToken, profile, done) => {
    let user = await UserService.googleAuth(profile);

    if (user)
        return done(null, user);
    else
        return done(null, false, { message: 'Not found user.' });
}
//Use "GoogleStrategy" as the Authentication Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.DOMAIN}/auth/google/callback`,
    passReqToCallback: true
}, authUser));