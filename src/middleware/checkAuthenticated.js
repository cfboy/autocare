module.exports = async function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    // req.flash('error', 'You needed to be logged in to visit that page!');

    res.redirect('/login')
}