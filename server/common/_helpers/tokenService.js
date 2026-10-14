const { signAccessToken } = require('./jwt');
const { sha256, randomToken } = require('./crypto');
const keys = require('../keys/keys');

/**
 * Issues an access token + a persisted refresh token for a user.
 * @param {object} RefreshToken  db.refresh_tokens model
 */
async function issueTokens(RefreshToken, { userType, user, role, deviceId, req }) {
  const accessExpiry = userType === 'admin' ? keys.ADMIN_ACCESS_TOKEN_EXPIRY : keys.CUSTOMER_ACCESS_TOKEN_EXPIRY;

  const accessToken = signAccessToken(
    { sub: user.id, uuid: user.uuid, type: userType, role: role || null },
    accessExpiry
  );

  const refreshToken = randomToken(48);
  const expiresAt = new Date(Date.now() + keys.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user_type: userType,
    user_id: user.id,
    token_hash: sha256(refreshToken),
    device_id: deviceId || null,
    expires_at: expiresAt,
    ip_address: req?.ip || null,
    user_agent: req?.headers?.['user-agent']?.slice(0, 255) || null,
  });

  return { accessToken, refreshToken, accessTokenExpiresIn: accessExpiry };
}

/** Validates a refresh token, rotates it, and returns a new token pair. */
async function rotateRefreshToken(RefreshToken, rawToken, { signAccessFor, req }) {
  const row = await RefreshToken.findOne({ where: { token_hash: sha256(rawToken) } });
  if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) {
    return null;
  }

  await row.update({ revoked_at: new Date() });

  const { user, role } = await signAccessFor(row);
  if (!user) return null;

  return issueTokens(RefreshToken, {
    userType: row.user_type,
    user,
    role,
    deviceId: row.device_id,
    req,
  });
}

async function revokeRefreshToken(RefreshToken, rawToken) {
  const row = await RefreshToken.findOne({ where: { token_hash: sha256(rawToken) } });
  if (row && !row.revoked_at) await row.update({ revoked_at: new Date() });
}

module.exports = { issueTokens, rotateRefreshToken, revokeRefreshToken };
