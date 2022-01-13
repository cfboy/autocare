const UserService = require('../collections/user')
const alertTypes = require('../helpers/alertTypes')

// TODO: Finish CRUDS
//  https://stackoverflow.com/questions/17250496/update-a-record-where-id-id-with-mongoose
exports.save = async(req, res) => {}

// Update CRUD
exports.update = async(req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
    if (!isValidOperation) {

        return res.status(400).send('Invalid updates!')
    }
    try {

        const user = await UserService.updateUser(req.params.id, req.body)

        if (!user) {

            return res.status(404).send()

        }

        res.status(201).send(user)

    } catch (error) {

        res.status(400).send(error)

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