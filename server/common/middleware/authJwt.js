const { verifyAccessToken } = require('../_helpers/jwt');
const { error } = require('../_helpers/response');

/**
 * Reads the bearer token, verifies it, and attaches req.auth.
 * The API gateway forwards the Authorization header untouched, so each
 * service verifies independently (stateless auth).
 */
function authenticate(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-access-token'];

  if (!token) return error(res, 401, 'Authentication required');

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return error(res, 401, expired ? 'Session expired, please login again' : 'Invalid token');
  }
}

/** Restricts a route to a given actor type ('admin' | 'customer'). */
function requireType(type) {
  return (req, res, next) => {
    if (req.auth?.type !== type) return error(res, 403, 'Forbidden');
    return next();
  };
}

/** Restricts a route to one of the given admin roles. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (req.auth?.type !== 'admin' || !roles.includes(req.auth?.role)) {
      return error(res, 403, 'Insufficient permissions');
    }
    return next();
  };
}

module.exports = { authenticate, requireType, requireRole };
