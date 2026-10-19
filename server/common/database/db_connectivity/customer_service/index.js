const { createDb } = require('../connection');

// Models used by the customer service
module.exports = createDb('customer', ['customers', 'kyc_applications', 'kyc_documents', 'devices', 'device_contact_snapshots', 'device_locations', 'consent_logs', 'admin_users', 'refresh_tokens', 'audit_logs']);
