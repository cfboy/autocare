const UserService = require('../collections/user')

module.exports = async function setCurrentUser(req, res, next) {
    const { email } = req.session

    if (email) {
        user = await UserService.getUserByEmail(email)

        req.user = user
        next()
    } else {
        res.redirect('/')
    }
}