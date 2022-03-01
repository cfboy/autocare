const passport = require("passport");
const { User } = require("../collections/user/user.model");

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    User.findById(id, function (err, user) {
        done(err, user);
    }).populate({ path: 'subscriptions.items.cars', model: 'car' });
});