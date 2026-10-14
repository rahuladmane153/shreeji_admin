const jwt = require('jsonwebtoken');
const keys = require('../keys/keys');

/**
 * Signs a short-lived access token.
 * payload carries: sub (user id), type ('admin'|'customer'), role, uuid
 */
function signAccessToken(payload, expiresIn) {
  return jwt.sign(payload, keys.JWT_SECURITY_KEY, { expiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, keys.JWT_SECURITY_KEY);
}

module.exports = { signAccessToken, verifyAccessToken };
