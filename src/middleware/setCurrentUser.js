const UserService = require('../collections/user')

// This function is deprecated because we set the req.user in the authentication process.
module.exports = async function setCurrentUser(req, res, next) {
    // const email = req.session.user
    const email = req.user.email

    if (email) {
        user = await UserService.getUserByEmail(email)

        req.user = user
        next()
    } else {
        res.redirect('/login')
    }
}