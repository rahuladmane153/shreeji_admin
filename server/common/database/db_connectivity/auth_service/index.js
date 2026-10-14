const { createDb } = require('../connection');

// Models used by the auth service
module.exports = createDb('auth', ['admin_users', 'customers', 'customer_otps', 'refresh_tokens', 'devices', 'audit_logs']);
