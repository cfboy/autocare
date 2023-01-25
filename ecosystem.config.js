module.exports = {
    apps: [{
        name: "app",
        script: "./app.js",
        env: {
            NODE_ENV: "development"
        },
        env_test: {
            NODE_ENV: "test",
            STRIPE_SECRET_KEY: "sk_test_51JbqswL5YqSpFl3KmcGHdnRQ3tE8ZxBlTr0CPJqRhjhZSD74iiBsMz7nSgw08Q7XXew31EHAC1BOuT8nc0t99mhh00Xs0UqeEt",
            MONGODB: "mongodb+srv://autocare:autocarepass@autocareclustertest.rwevq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
            STRIPE_WEBHOOK_SECRET: "whsec_e54e2daf93508819bb1f50c091b737a356058c7cddb2b5c7dd700314775bff50",
            DOMAIN: "http://localhost:3000",
            SESSION_SECRET: "keyboard cat",
            PUBLISHABLE_KEY: "pk_test_51JbqswL5YqSpFl3KswbblP5qXQFWDBV6sNxKnsqfP1Sckl8KaXzpKfAL6aErdRj7M2kp6E3igZVFjrY79ywN9ewT00Rcp2wiCp",
            USE_CAR_API: "false",
            BCRYPT_SALT: "10",
            EMAIL_SERVICE: "Godaddy",
            SENDER_EMAIL_ADDRESS: "memberships@autocarepr.com",
            SENDER_EMAIL_PASSWORD: "Hip9127!A",
            MAILING_SERVICE_CLIENT_ID: "527772243377-r476uhuq85eam89tq2uibmv63iuv26tf.apps.googleusercontent.com",
            MAILING_SERVICE_CLIENT_SECRET: "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",
            MAILING_SERVICE_REFRESH_TOKEN: "1//04nsfob68XwjnCgYIARAAGAQSNwF-L9IrRH5KMFNO4hM2WHVt8puzNXW0dtUmcAPFIjPzI4-TGuomyRKVRCDZC9nEUIxo2b-g79c",
            FINANCIAL_REPORTS_LINK: "https://dashboard.stripe.com/test/reports/hub",
            PK_STRIPE: "pk_test_51JbqswL5YqSpFl3KswbblP5qXQFWDBV6sNxKnsqfP1Sckl8KaXzpKfAL6aErdRj7M2kp6E3igZVFjrY79ywN9ewT00Rcp2wiCp",
            BUGSNAG_KEY: "a1fb8feff32affc338d7a83033776649"
        },
        env_production: {
            NODE_ENV: "production",
        }
    }]
}