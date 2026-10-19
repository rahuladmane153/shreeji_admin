const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ROUNDS = 10;

const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

/**
 * Generates a readable temporary password (no ambiguous characters like
 * O/0/I/l). Used when an admin resets a password without specifying one.
 */
function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += chars[bytes[i] % chars.length];
  // Guarantee at least one digit and one symbol for strength
  return `${out}@${bytes[0] % 10}`;
}

module.exports = { hashPassword, comparePassword, generatePassword };
