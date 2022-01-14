const UserService = require('../collections/user')
const alertTypes = require('../helpers/alertTypes')

// TODO: Finish CRUDS
//  https://stackoverflow.com/questions/17250496/update-a-record-where-id-id-with-mongoose
exports.save = async(req, res) => {}

// Route for edit user form.
exports.editUser = async(req, res) => {
    const id = req.params.id;
    const user = await UserService.getUserById(id)

    if (user) {
        res.status(200).render('user/edit.ejs', { customer: user })
    } else {
        console.log('User not found.')
        res.redirect('/account')
    }
}

// Update CRUD
// TODO: Manage membership 
exports.update = async(req, res) => {
    const updates = Object.keys(req.body)
        // TODO: Implement allowedUpdates per ROLE.
        // const allowedUpdates = ['name', 'email']
        // const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
        // if (!isValidOperation) {

    // return res.status(400).send('Invalid updates!')
    // }

    try {
        const user = await UserService.updateUser(req.body.id, req.body)

        if (!user) {
            req.session.message = `Can't update User  ${req.body.email}`
            req.session.alertType = alertTypes.WarningAlert
                // return res.status(404).send()

        } else {
            req.session.message = `User updated ${user.email}`
            req.session.alertType = alertTypes.CompletedActionAlert
        }
        // res.status(201).send(user)
        res.redirect('/account')


    } catch (error) {
        req.session.message = `Error trying to update user.`
        req.session.alertType = alertTypes.ErrorAlert
            // res.status(400).send(error)
        res.redirect('/account')

    }
}

// Delete Users method
exports.delete = async(req, res) => {
    console.log('Deleting User...')
    const id = req.params.id

    try {
        UserService.deleteUser(id)
            // Set the message for alert. 
        req.session.message = `User Deleted.`
        req.session.alertType = alertTypes.CompletedActionAlert
        res.redirect('/account')
    } catch (error) {
        console.log(`ERROR on user.js delete: ${error.message}`)
        req.session.message = "Can't delete user."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/account')

    }
}