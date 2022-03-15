/**
 * This function add new Report to DB.
 * @param {*} Report 
 * @returns report
 */
const addReport = (Report) => async ({
    name,
    url
}) => {
    if (!name || !url) {
        throw new Error(`REPORT: Missing Data.`)
    }

    console.log(`Report: addReport(${name})`)

    const report = new Report({
        name, url
    })

    return await report.save()
}

/**
 * This function update the location properties by id.
 * @param {*} Location 
 * @returns location object
 */
const updateReport = (Report) => async (id, updates) => {
    console.log(`updateReport() ID: ${id}`)
    return await Report.findByIdAndUpdate({ _id: id }, updates, { new: true }, function (err, doc) {
        if (err) {
            console.error(err.message)
        } else {
            console.debug("Updated : ", doc.name);
        }
    })
}


/**
 * This function delete the report on DB.
 * @param {*} Report 
 * @returns promise
 */
const deleteReport = (Report) => (id) => {
    console.log(`deleteReport() by ID: ${id}`)

    return Report.deleteOne({ _id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Deleted : ", docs);
        }
    })
}

/**
 * This function get all reports from DB.
 * @param {*} Report 
 * @returns 
 */
const getReports = (Report) => () => {
    return Report.find({})
}

/**
 * This function get a report by id.
 * @param {*} Report 
 * @returns Report object
 */
const getReportById = (Report) => (id) => {
    console.log(`getReportById() by ID: ${id}`)

    return Report.findOne({ _id: id }, function (err, docs) {
        if (err) {
            console.error(err)
        } else {
            console.debug("Found Report: ", docs?.name);
        }
    })
}

/**
 * This function get a report by name.
 * @param {*} Report 
 * @returns Report object
 */
const getReportByName = (Report) => async (name) => {
    console.debug(`getReportByName(): ${name}`)

    return await Report.findOne({ name })
}

module.exports = (Report) => {
    return {
        addReport: addReport(Report),
        updateReport: updateReport(Report),
        deleteReport: deleteReport(Report),
        getReports: getReports(Report),
        getReportById: getReportById(Report),
        getReportByName: getReportByName(Report)
    }
}