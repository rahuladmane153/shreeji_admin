const bcrypt = require('bcryptjs');
const db = require('../../../../common/database/db_connectivity/auth_service');
const { AppError } = require('../../../../common/_helpers/response');
const { issueTokens, rotateRefreshToken, revokeRefreshToken } = require('../../../../common/_helpers/tokenService');
const { writeAudit } = require('../../../../common/_helpers/audit');

const Customer = db.customers;
const RefreshToken = db.refresh_tokens;

const customerView = (c) => ({
  id: c.id,
  uuid: c.uuid,
  mobile: c.mobile,
  full_name: c.full_name,
  kyc_status: c.kyc_status,
});

/**
 * Creates a customer account. No session is started: the app sends the
 * customer to the login screen afterwards.
 */
async function registerCustomer({ full_name, mobile, password }, req) {
  const fullName = String(full_name).replace(/\s+/g, ' ').trim();
  const passwordHash = await bcrypt.hash(password, 10);

  // A mobile number can only be registered once. Existing rows (including
  // legacy OTP-only customers without a password) are never claimed here,
  // since registration has no ownership check on the mobile number.
  const [customer, created] = await Customer.findOrCreate({
    where: { mobile },
    defaults: { mobile, full_name: fullName, password_hash: passwordHash },
  });
  if (!created) throw new AppError(409, 'This mobile number is already registered. Please login.');

  await writeAudit(db.audit_logs, {
    actor: { type: 'customer', id: customer.id, name: fullName },
    action: 'customer.register',
    entity: { type: 'customer', id: customer.id },
    service: 'auth',
    req,
  });

  return { customer: customerView(customer) };
}

/** Logs a customer in with mobile number + password. */
async function login({ mobile, password }, req) {
  const customer = await Customer.scope('withPassword').findOne({ where: { mobile } });
  // Same message for unknown number and wrong password, so numbers can't be probed
  const ok = customer?.password_hash && (await bcrypt.compare(password, customer.password_hash));
  if (!ok) throw new AppError(401, 'Invalid mobile number or password');
  if (customer.status === 'blocked') throw new AppError(403, 'Your account is blocked. Please contact support.');

  await customer.update({ last_login_at: new Date() });
  const tokens = await issueTokens(RefreshToken, { userType: 'customer', user: customer, req });

  await writeAudit(db.audit_logs, {
    actor: { type: 'customer', id: customer.id, name: customer.full_name || mobile },
    action: 'customer.login',
    entity: { type: 'customer', id: customer.id },
    service: 'auth',
    req,
  });

  return { ...tokens, customer: customerView(customer) };
}

async function refresh({ refresh_token }, req) {
  const result = await rotateRefreshToken(RefreshToken, refresh_token, {
    req,
    signAccessFor: async (row) => {
      if (row.user_type !== 'customer') return {};
      const customer = await Customer.findByPk(row.user_id);
      if (!customer || customer.status === 'blocked') return {};
      return { user: customer };
    },
  });
  if (!result) throw new AppError(401, 'Invalid or expired refresh token');
  return result;
}

async function logout({ refresh_token }) {
  await revokeRefreshToken(RefreshToken, refresh_token);
  return { message: 'Logged out' };
}

module.exports = { registerCustomer, login, refresh, logout };
