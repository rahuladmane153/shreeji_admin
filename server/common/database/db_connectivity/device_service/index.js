const { createDb } = require('../connection');

// Models used by the device service
module.exports = createDb('device', ['devices', 'customers', 'device_commands', 'device_heartbeats', 'device_contact_snapshots', 'admin_users', 'refresh_tokens', 'audit_logs']);
