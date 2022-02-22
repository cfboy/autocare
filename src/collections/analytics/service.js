const { User, ROLES } = require('../user/user.model')
const { getAllSubscriptions } = require('../../connect/stripe')

module.exports = {
    async getAnalytics() {
        // let getTotalUsers = User.countDocuments({ role: ROLES.CUSTOMER }); //Select only customers
        let getTotalUsers = await User.countDocuments(); //Select only customers
        let getTotalSubscriptions = (await getAllSubscriptions()).length;

        let utilization = Number(getTotalSubscriptions / getTotalUsers).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 });


        return Promise.all([
            getTotalUsers,
            getTotalSubscriptions,
            utilization
        ]).then(results => {
            return {
                getTotalUsers: results[0],
                getTotalSubscriptions: results[1],
                utilization: results[2]
            };
        })
    }
}