const bcrypt = require('bcryptjs');
const db = require('../../../../common/database/db_connectivity/auth_service');
const { AppError } = require('../../../../common/_helpers/response');
const { issueTokens, rotateRefreshToken, revokeRefreshToken } = require('../../../../common/_helpers/tokenService');
const { writeAudit } = require('../../../../common/_helpers/audit');

const AdminUser = db.admin_users;
const RefreshToken = db.refresh_tokens;

async function login({ email, password }, req) {
  const admin = await AdminUser.scope('withPassword').findOne({ where: { email } });
  if (!admin) throw new AppError(401, 'Invalid email or password');
  if (admin.status !== 'active') throw new AppError(403, 'Your account is blocked');

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) throw new AppError(401, 'Invalid email or password');

  await admin.update({ last_login_at: new Date() });

  const tokens = await issueTokens(RefreshToken, { userType: 'admin', user: admin, role: admin.role, req });
  await writeAudit(db.audit_logs, {
    actor: { type: 'admin', id: admin.id, name: admin.name },
    action: 'admin.login',
    service: 'auth',
    req,
  });

  return {
    ...tokens,
    user: { id: admin.id, uuid: admin.uuid, name: admin.name, email: admin.email, role: admin.role },
  };
}

async function refresh({ refresh_token }, req) {
  const result = await rotateRefreshToken(RefreshToken, refresh_token, {
    req,
    signAccessFor: async (row) => {
      if (row.user_type !== 'admin') return {};
      const admin = await AdminUser.findByPk(row.user_id);
      if (!admin || admin.status !== 'active') return {};
      return { user: admin, role: admin.role };
    },
  });
  if (!result) throw new AppError(401, 'Invalid or expired refresh token');
  return result;
}

async function logout({ refresh_token }) {
  await revokeRefreshToken(RefreshToken, refresh_token);
  return { message: 'Logged out' };
}

module.exports = { login, refresh, logout };
