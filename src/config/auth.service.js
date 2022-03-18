const { User } = require("../collections/user/user.model");
const Token = require("../collections/token/token.model");
const sendEmail = require("../utils/email/sendEmail");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const bcryptSalt = process.env.BCRYPT_SALT;
const clientURL = process.env.DOMAIN;

/**
 * This function create a new request/token to change password and send an email.
 * @param {*} email 
 * @returns 
 */
const resetPasswordRequest = async (email) => {
    const user = await User.findOne({ email });
    var requestSuccess = false
    if (!user) {
        // throw new Error("Email does not exist");
        return [requestSuccess, "Email does not exist"]
    }

    let token = await Token.findOne({ userId: user._id });
    if (token) await token.deleteOne();

    let resetToken = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(resetToken, Number(bcryptSalt));

    await new Token({
        userId: user._id,
        token: hash,
        createdAt: Date.now(),
    }).save();

    const link = `${clientURL}/resetPassword?token=${resetToken}&id=${user._id}`;

    var resultEmail = await sendEmail(
        user.email,
        "Auto Care Password Reset Request",
        {
            name: user?.personalInfo?.firstName + ' ' + user?.personalInfo?.lastName,
            link: link,
        },
        "../template/resetPasswordRequest.handlebars"
    )

    if (resultEmail) {
        console.debug('Result Email: ' + resultEmail?.accepted[0])
        requestSuccess = true
        return [requestSuccess, `Verify your email ${resultEmail?.accepted[0]} to complete reset password process.`]
    } else {
        return [requestSuccess, "Password Reset Request Not Send."]

    }
};

/**
 * This function resets the password of the user and send an email.
 * Deletes the old token.
 * @param {*} userId 
 * @param {*} token 
 * @param {*} password 
 * @returns 
 */
const resetPassword = async (userId, token, password) => {
    let resetPasswordToken = await Token.findOne({ userId });
    let requestSuccess = false

    let [isValid, message] = await validateToken(userId, token)

    if (!isValid) {
        message = message;
        return [requestSuccess, message]
    }

    const hash = await bcrypt.hash(password, Number(bcryptSalt));

    await User.updateOne(
        { _id: userId },
        { $set: { password: hash } },
        { new: true }
    );

    const user = await User.findById({ _id: userId });

    var resultEmail = await sendEmail(
        user.email,
        "Auto Care Password Reset Successfully",
        {
            name: user?.personalInfo?.firstName + ' ' + user?.personalInfo?.lastName,
        },
        "../template/resetPassword.handlebars"
    );
    if (resultEmail) {
        console.debug('Result Email: ' + resultEmail?.accepted[0])
        requestSuccess = true
    } else {
        return [requestSuccess, "Email Not Send of Password Reset."]

    }
    await resetPasswordToken.deleteOne();

    return [requestSuccess, `Password Updated ${resultEmail?.accepted[0]}.`]
};

/**
 * This function validates the token.
 * @param {*} userId 
 * @param {*} token 
 * @returns 
 */
const validateToken = async (userId, token) => {
    let resetPasswordToken = await Token.findOne({ userId });
    let isValid = false
    let message = 'Valid Token'
    if (!resetPasswordToken) {
        message = "Invalid or expired password reset token"
        return [isValid, message]
    }

    isValid = await bcrypt.compare(token, resetPasswordToken.token);

    if (!isValid)
        message = "Invalid or expired password reset token"

    return [isValid, message]
}

module.exports = {
    resetPasswordRequest,
    resetPassword,
    validateToken
};