/**
 * Wrapper for Node.js crypto module
 *
 */
const ocrypto = require('crypto');

function hash(method, input, format) {
    return ocrypto.createHash(method).update(input).digest(format)
}

function hash_hmac(method, secret, input, format) {
    return ocrypto.createHmac(method, secret).update(input).digest(format)
}

export function md5(buf, format) {
    return hash('md5', buf, format);
}

export function sha1(buf, format) {
    return hash('sha1', buf, format);
}

export function hmac_sha1(secret, buf, format) {
    return hash_hmac('sha1', secret, buf, format);
}

/**
 * encrypt a plain text into ciphered text using a secret key.
 *
 * @example
 *
 *   let result = crypto.cipher('aes-128-cbc', '12345678', 'hello world');
 *
 * @param {string} method run `require('crypto').getCiphers()` to see supported ciphers
 * @param {string|buffer} secret secret key
 * @param {string|Buffer} input plain text to be ciphered
 * @param {boolean} [padding] whether auto padding is used, defaults to false
 * @returns {Buffer} ciphered text
 */
export function cipher(method, secret, input, padding) {
    return _cipher(new ocrypto.Cipher(method, secret), input, padding);
}

/**
 * encrypt a plain text into ciphered text using a key and a initialization vector.
 *
 * @example
 *
 *   let result = crypto.cipheriv('aes-128-cbc', '12345678', new Buffer(16), 'hello world');
 *
 * @param {string} method run `require('crypto').getCiphers()` to see supported ciphers
 * @param {string|Buffer} key secret key
 * @param {string|Buffer} iv initialization vector
 * @param {string|Buffer} input plain text to be ciphered
 * @param {boolean} [padding] whether auto padding is used, defaults to false
 * @returns {Buffer} ciphered text
 */
export function cipheriv(method, key, iv, input, padding) {
    return _cipher(new ocrypto.Cipheriv(method, key, iv), input, padding);
}
/**
 * decrypt a ciphered text into plain text, contrast to [cipher](#cipher)
 *
 * @param {string} method see `require('crypto').getCiphers()`
 * @param {string|buffer} secret secret key
 * @param {string|Buffer} input cipher text
 * @param {boolean} [padding] whether auto padding is used, defaults to false
 * @returns {Buffer}
 */
export function decipher(method, secret, input, padding) {
    return _cipher(new ocrypto.Decipher(method, secret), input, padding);
}
/**
 * decrypt a ciphered text into plain text, contrast to [cipheriv](#cipheriv)
 *
 * @param {string} method see `require('crypto').getCiphers()`
 * @param {string} key secret key
 * @param {string} iv initialization vector
 * @param {string|Buffer} input cipher text
 * @param {boolean} [padding] whether auto padding is used, defaults to false
 * @returns {Buffer}
 */
export function decipheriv(method, key, iv, input, padding) {
    return _cipher(new ocrypto.Decipheriv(method, key, iv), input, padding);
}
function _cipher(cipher, input, padding) {
    cipher.setAutoPadding(!!padding);
    let buf1 = cipher.update(input);
    let buf2 = cipher.final();
    return buf1.length ?
        buf2.length ? Buffer.concat([buf1, buf2]) : buf1
        : buf2;
}