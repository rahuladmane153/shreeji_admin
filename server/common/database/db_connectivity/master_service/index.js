const { createDb } = require('../connection');

// Models used by the master service
module.exports = createDb('master', ['admin_users', 'customers', 'kyc_applications', 'devices', 'geofence_alerts', 'audit_logs', 'refresh_tokens']);
