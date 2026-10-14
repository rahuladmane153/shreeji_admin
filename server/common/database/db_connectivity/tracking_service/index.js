const { createDb } = require('../connection');

// Models used by the tracking service
module.exports = createDb('tracking', ['devices', 'customers', 'device_locations', 'geofences', 'geofence_alerts', 'audit_logs']);
