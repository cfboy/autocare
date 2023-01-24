const ReportsService = require('../collections/reports')
const ServiceService = require('../collections/services')
const alertTypes = require('../helpers/alertTypes')

exports.reports = async (req, res) => {

    let { message, alertType } = req.session
    // clear message y alertType
    if (message) {
        req.session.message = ''
        req.session.alertType = ''
    }
    // Passport store the user in req.user
    let user = req.user,
        reports = await ReportsService.getReports()


    res.render('reports/index.ejs', {
        reports,
        user,
        message,
        alertType
    })
}


/**
 * This function render the specific report details.
 * @param {*} req 
 * @param {*} res 
 */
exports.viewReport = async (req, res) => {
    try {
        let { message, alertType } = req.session

        if (message) {
            req.session.message = ''
            req.session.alertType = ''
        }
        const id = req.params.id;
        const report = await ReportsService.getReportById(id)

        if (report) {
            res.status(200).render('reports/view.ejs', { user: req.user, report, message, alertType })
        } else {
            console.log('REPORT-CONTROLLER: Report not found.')
            res.redirect('/reports')
        }
    } catch (error) {
        console.error(error.message)
        req.session.message = 'Error trying to view report details.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/reports')
    }
}


/**
 * This function render the form to create a new location.
 * @param {*} req 
 * @param {*} res 
 */
exports.createReport = async (req, res) => {
    let { message, alertType } = req.session

    // clear message y alertType
    req.session.message = ''
    req.session.alertType = ''
    try {
        res.render('reports/create.ejs', { user: req.user, message, alertType })
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(`ERROR: reportController -> Tyring to render create report form. ${error.message}`)
        req.session.message = 'Error tyring to render create report form.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/reports')
    }
}


/**
 * This function save/create the new report with their properties.
 * @param {*} req 
 * @param {*} res 
 */
exports.save = async (req, res) => {
    const fields = req.body
    try {
        console.log('Creating New Report: ', fields.name)

        let report = await ReportsService.getReportByName(fields.name)
        if (!report) {
            console.debug(`Report ${fields.name} does not exist. Making one...`)
            // Add Location to DB
            report = await ReportsService.addReport({ name: fields.name, url: fields.url })

            console.debug(
                `A new report to DB. The ID for ${report.name} is ${report.id}`
            )

            req.session.message = `Report Created ${report.name}.`
            req.session.alertType = alertTypes.CompletedActionAlert
            req.flash('info', 'Report created.')

            res.redirect('/reports')

        } else {
            let message = `That Report ${report.name} already exist.`
            console.error(message)

            // Set the message for alert. 
            req.session.message = message
            req.session.alertType = alertTypes.WarningAlert
            res.redirect('/reports')
        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error.message)
        req.session.message = 'Error trying to create new report.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/reports')
    }
}

/**
 * This function render the form to edit the report info.
 * @param {*} req 
 * @param {*} res 
 */
exports.editReport = async (req, res) => {
    try {
        const id = req.params.id;
        const url = req.query.url ? req.query.url : '/reports'
        let report = await ReportsService.getReportById(id)

        if (report) {
            res.status(200).render('reports/edit.ejs', { user: req.user, report, url: url == '/reports' ? url : `${url}/${id}` })
        } else {
            console.log('REPORT-CONTROLLER: Report not found.')
            res.redirect(`${url}`)
        }
    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error.message)
        req.session.message = 'Error trying to render edit report form.'
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect('/reports')
    }
}

/**
 * This function update the existing report properties.
 * @param {*} req 
 * @param {*} res 
 */
exports.update = async (req, res) => {

    const url = req.query.url
    try {

        let report = await ReportsService.updateReport(req.body.id, req.body)

        if (!report) {
            req.session.message = `Can't update Report  ${req.body.name}`
            req.session.alertType = alertTypes.WarningAlert

        } else {
            req.flash('info', 'Report Updated.')
            req.session.message = `Report updated ${report.name}`
            req.session.alertType = alertTypes.CompletedActionAlert
        }
        res.redirect(`${url}`)

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error(error.message)
        req.session.message = "Error trying to update the report information."
        req.session.alertType = alertTypes.ErrorAlert
        res.redirect(`${url}`)
    }
}

/**
 * This function deletes existing report.
 * @param {*} req 
 * @param {*} res 
 */
exports.delete = async (req, res) => {
    console.log('Deleting report...')
    const id = req.params.id

    try {
        ReportsService.deleteReport(id)

        // Set the message for alert. 
        req.session.message = `Report Deleted.`
        req.session.alertType = alertTypes.CompletedActionAlert

    } catch (error) {
        console.log(`ERROR-REPORT-CONTROLLER : ${error.message}`)
        req.session.message = "Can't delete report."
        req.session.alertType = alertTypes.ErrorAlert
    }

    res.redirect('/reports')

}

/**
 * This functions is the route to generate Gross Volume Distributed Report.
 * @param {*} req 
 * @param {*} res 
 */
exports.getGrossVolumeDistributedReport = async (req, res) => {
    try {
        const date = req.body.date;
        const result = await ServiceService.getLocationsWithGrossVolumeDistributed(date)

        let headers = [
            { title: 'Gross Amount', value: result?.grossVolumeString },
            { title: 'Factor', value: result?.factorString },
            { title: 'Service Qty.', value: result?.serviceQty }
        ]
        res.render('reports/partials/locationGrossVolumeReport.ejs', { headers, locations: result?.locations, startDate: result.startDate, endDate: result.endDate })

    } catch (error) {
        req.bugsnag.notify(new Error(error),
            function (event) {
                event.setUser(req.user.email)
            })
        console.error("ERROR: reportsController -> getGrossVolumeDistributedReport()")
        res.status(500).send(error)
    }
}