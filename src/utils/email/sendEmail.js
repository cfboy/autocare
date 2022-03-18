const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

/**
 * This function send emails.
 * @param {*} email 
 * @param {*} subject 
 * @param {*} payload 
 * @param {*} template 
 * @returns 
 */
const sendEmail = async (email, subject, payload, template) => {
    try {
        // create reusable transporter object using the default SMTP transport
        const transporter = nodemailer.createTransport({
            // host: process.env.EMAIL_HOST,
            service: "Gmail",
            // port: 465,
            // secure: true,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD, // naturally, replace both with your real credentials or an application-specific password
            },
        });

        const source = fs.readFileSync(path.join(__dirname, template), "utf8");
        const compiledTemplate = handlebars.compile(source);
        const options = () => {
            return {
                from: process.env.FROM_EMAIL,
                to: email,
                subject: subject,
                html: compiledTemplate(payload),
            };
        };

        // Send email
        return await transporter.sendMail(options());

    } catch (error) {
        console.error(error)
        return false;
    }
};

module.exports = sendEmail;