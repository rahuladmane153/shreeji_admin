const { createDb } = require('../connection');

// Models used by the kyc_app service
module.exports = createDb('kyc_app', ['customers', 'kyc_applications', 'kyc_documents', 'devices', 'device_heartbeats', 'device_commands', 'device_locations', 'geofences', 'geofence_alerts', 'consent_logs', 'refresh_tokens', 'audit_logs']);
