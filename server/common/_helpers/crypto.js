const crypto = require('crypto');
const keys = require('../keys/keys');

const ALGO = 'aes-256-gcm';

function getKey() {
  if (!keys.CRYPTO_SECURITY_KEY || keys.CRYPTO_SECURITY_KEY.length !== 64) {
    throw new Error('CRYPTO_SECURITY_KEY must be a 64 character hex string (32 bytes)');
  }
  return Buffer.from(keys.CRYPTO_SECURITY_KEY, 'hex');
}

/** Encrypts a string. Output format: iv.authTag.cipherText (base64) */
function encrypt(plainText) {
  if (plainText === null || plainText === undefined || plainText === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join('.');
}

function decrypt(payload) {
  if (!payload) return null;
  const [iv, tag, data] = payload.split('.');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString('hex');

const randomOtp = (length = 6) => String(crypto.randomInt(0, 10 ** length)).padStart(length, '0');

/** XXXX XXXX 1234 */
const maskAadhaar = (last4) => (last4 ? `XXXX XXXX ${last4}` : null);

module.exports = { encrypt, decrypt, sha256, randomToken, randomOtp, maskAadhaar };
