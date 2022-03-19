const nodemailer = require("nodemailer");
const { google } = require("googleapis")
const { OAuth2 } = google.auth
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
        const OAUTH_PLAYGROUND = 'https://developers.google.com/oauthplayground';
        const {
            MAILING_SERVICE_CLIENT_ID,
            MAILING_SERVICE_CLIENT_SECRET,
            MAILING_SERVICE_REFRESH_TOKEN,
            SENDER_EMAIL_ADDRESS,
        } = process.env;

        const oauth2Client = new OAuth2(
            MAILING_SERVICE_CLIENT_ID,
            MAILING_SERVICE_CLIENT_SECRET,
            OAUTH_PLAYGROUND
        );

        oauth2Client.setCredentials({
            refresh_token: MAILING_SERVICE_REFRESH_TOKEN,
        });

        const accessToken = await oauth2Client.getAccessToken();

        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                type: 'OAuth2',
                user: SENDER_EMAIL_ADDRESS,
                clientId: MAILING_SERVICE_CLIENT_ID,
                clientSecret: MAILING_SERVICE_CLIENT_SECRET,
                refreshToken: MAILING_SERVICE_REFRESH_TOKEN,
                accessToken,
            }
        });

        const source = fs.readFileSync(path.join(__dirname, template), "utf8");
        const compiledTemplate = handlebars.compile(source);
        const options = () => {
            return {
                from: SENDER_EMAIL_ADDRESS,
                to: email,
                subject: subject,
                html: compiledTemplate(payload)
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