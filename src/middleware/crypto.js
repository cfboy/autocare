// crypto module
var Crypto = require('crypto');

// TODO: move to another location
var secret_key = 'fd85b494-aaa'
var secret_iv = 'smslt';
var encryptionMethod = "aes-256-cbc";

var key = Crypto.createHash('sha512').update(secret_key, 'utf-8').digest('hex').substring(0, 32);
var iv = Crypto.createHash('sha512').update(secret_iv, 'utf-8').digest('hex').substring(0, 16);


// These functions cannot be async to be able to return the value. 
function encryptData(data) {
    console.log('Encrypting data...')
    var encryptedMessage = encryptString(data, encryptionMethod, key, iv);
    console.debug(`Encrypted data: ${encryptedMessage}`)
    return encryptedMessage
}

function decryptData(data) {
    console.log('Decrypting data...')
    var decryptedMessage = decryptString(data, encryptionMethod, key, iv);
    console.debug(`Decrypted data: ${decryptedMessage}`)
    return decryptedMessage
}

// Encrypt function
function encryptString(plainText, encryptionMethod, key, iv) {
    var encryptor = Crypto.createCipheriv(encryptionMethod, key, iv);
    var aes_encrypted = encryptor.update(plainText, 'utf8', 'base64') + encryptor.final('base64')
    return Buffer.from(aes_encrypted).toString('base64')
}

// Decript function
function decryptString(encryptedMessage, encryptionMethod, key, iv) {
    const buff = Buffer.from(encryptedMessage, 'base64')
    encryptedMessage = buff.toString('utf-8')
    var decryptor = Crypto.createDecipheriv(encryptionMethod, key, iv)
    return decryptor.update(encryptedMessage, 'base64', 'utf8') + decryptor.final('utf8')
}

module.exports = {
    encryptData,
    decryptData
}