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
const resetPasswordRequest = async (lingua, email) => {

    const user = await User.findOne({ email });
    var requestSuccess = false
    if (!user) {
        // throw new Error("Email does not exist");
        return [requestSuccess, lingua.validation.emailNotExist]
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
        lingua.email.title,
        {
            name: user?.personalInfo?.firstName + ' ' + user?.personalInfo?.lastName,
            link: link,
        },
        "../template/resetPasswordRequest.handlebars"
    )

    if (resultEmail) {
        console.debug('Email Sent: ' + resultEmail?.accepted[0])
        requestSuccess = true
        return [requestSuccess, lingua.email.verifyEmail(resultEmail?.accepted[0])]
    } else {
        return [requestSuccess, lingua.validation.requestNotSend]

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
const resetPassword = async (lingua, userId, token, password) => {
    let resetPasswordToken = await Token.findOne({ userId });
    let requestSuccess = false

    let [isValid, message] = await validateToken(lingua, userId, token)

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
        lingua.email.resetSucessfully,
        {
            name: user?.personalInfo?.firstName + ' ' + user?.personalInfo?.lastName,
        },
        "../template/resetPassword.handlebars"
    );
    if (resultEmail) {
        console.debug('Result Email: ' + resultEmail?.accepted[0])
        requestSuccess = true
    } else {
        return [requestSuccess, lingua.email.notSend]

    }
    await resetPasswordToken.deleteOne();

    return [requestSuccess, lingua.validation.passwordUpdated(resultEmail.accepted[0])]
};

/**
 * This function validates the token.
 * @param {*} userId 
 * @param {*} token 
 * @returns 
 */
const validateToken = async (lingua, userId, token) => {
    let resetPasswordToken = await Token.findOne({ userId });
    let isValid = false
    let message = lingua.validLink

    if (!resetPasswordToken) {
        message = lingua.invalidLink
        return [isValid, message]
    }

    isValid = await bcrypt.compare(token, resetPasswordToken.token);

    if (!isValid)
        message = lingua.invalidLink

    return [isValid, message]
}

module.exports = {
    resetPasswordRequest,
    resetPassword,
    validateToken
};