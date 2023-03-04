const { MailtrapClient } = require("mailtrap");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
/**
 * This function send emails.
 * @param {*} email 
 * @param {*} emailType 
 * @param {*} payload 
 * @returns 
 */
const sendEmail = async (email, emailType, payload) => {
    try {
        var emailResult
        const {
            SENDER_EMAIL_ADDRESS,
            NODE_ENV
        } = process.env;

        var template_variables = {
            "subject": payload.subject,
            "user_email": email,
            "user_name": payload.name,
            "reset_link": payload.link,
            "link": `${process.env.DOMAIN}/account`,
            "message": payload.message,
            "subscription_id": payload.subscription_id
        }

        if (NODE_ENV == "production") {
            const {
                MAILTRAP_TOKEN,
                MAILTRAP_ENDPOINT
            } = process.env;

            var MAILTRAP_TEMPLATE = null;

            switch (emailType) {
                case 'welcome':
                    MAILTRAP_TEMPLATE = process.env.WELCOME_ID
                    break;
                case 'reset_password_request':
                    MAILTRAP_TEMPLATE = process.env.RESET_PASSWORD_REQUEST_ID
                    break;
                case 'password_changed':
                    MAILTRAP_TEMPLATE = process.env.PASSWORD_CHANGED_ID
                    break;
                case 'subscription_created':
                    MAILTRAP_TEMPLATE = process.env.SUBSCRIPTION_TEMPLATE_ID
                    break;
                case 'subscription_updated':
                    MAILTRAP_TEMPLATE = process.env.SUBSCRIPTION_TEMPLATE_ID
                    break;
                case 'subscription_cancelled':
                    MAILTRAP_TEMPLATE = process.env.SUBSCRIPTION_TEMPLATE_ID
                    break;
                default:
                    MAILTRAP_TEMPLATE = null

            }

            const client = new MailtrapClient({ endpoint: MAILTRAP_ENDPOINT, token: MAILTRAP_TOKEN });
            const sender = { name: "Memberships System", email: SENDER_EMAIL_ADDRESS };

            emailResult = await client.send({
                from: sender,
                to: [{ email: email }],
                template_uuid: MAILTRAP_TEMPLATE,
                template_variables: template_variables
            }).then(result => {
                if (result.success) {
                    return { sent: true, data: null }
                } else {
                    return { sent: false, data: null }
                }
            }).catch(err => {
                console.error(`Failed to sent email: ${err}`)
                return { sent: false, data: err }
            });
        } else if (NODE_ENV == 'development') {

            var template, subject

            switch (emailType) {
                case 'welcome':
                    subject = `Welcome to AutoCare Memberships, ${template_variables.user_name}!`
                    template = '../template/welcome.handlebars'
                    break;
                case 'reset_password_request':
                    subject = 'Password reset request'
                    template = '../template/resetPasswordRequest.handlebars'
                    break;
                case 'password_changed':
                    subject = 'Memberships System - Password Changed '

                    template = '../template/resetPassword.handlebars'
                    break;
                case 'subscription_created':
                    subject = template_variables.subject
                    template = '../template/subscriptions.handlebars'
                    break;
                case 'subscription_updated':
                    subject = template_variables.subject
                    template = '../template/subscriptions.handlebars'
                    break;
                case 'subscription_cancelled':
                    subject = template_variables.subject
                    template = '../template/subscriptions.handlebars'
                    break;
                default:
                    template = null

            }

            var transport = nodemailer.createTransport({
                host: "sandbox.smtp.mailtrap.io",
                port: 2525,
                auth: {
                    user: "500f11dddd07ab",
                    pass: "edf19eb82a63f1"
                }
            });

            const source = fs.readFileSync(path.join(__dirname, template), "utf8");
            const compiledTemplate = handlebars.compile(source);
            const options = () => {
                return {
                    from: SENDER_EMAIL_ADDRESS,
                    to: email,
                    subject: subject,
                    html: compiledTemplate(template_variables)
                };
            };

            // Send email
            emailResult = await transport.sendMail(options());

            if (emailResult.accepted.length) {
                emailResult = { sent: true, data: null }
            } else {
                emailResult = { sent: false, data: null }
            }

        } else {
            //Not send email in test. 
            emailResult = { sent: true, data: null };
        }

        return emailResult;

    } catch (error) {
        console.error(error)
        return { sent: false, data: error };
    }
};

module.exports = sendEmail;