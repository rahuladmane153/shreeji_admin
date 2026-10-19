/**
 * Central registry of all model definitions and their associations.
 *
 * Each microservice loads only the models it needs through
 * common/database/db_connectivity/<service>/index.js. Associations are
 * registered only when both sides of the relation are loaded.
 */
const MODEL_DEFINITIONS = {
  admin_users: require('./admin/admin_users.model'),
  refresh_tokens: require('./auth/refresh_tokens.model'),
  customer_otps: require('./auth/customer_otps.model'),
  customers: require('./customer/customers.model'),
  kyc_applications: require('./kyc/kyc_applications.model'),
  kyc_documents: require('./kyc/kyc_documents.model'),
  devices: require('./device/devices.model'),
  device_heartbeats: require('./device/device_heartbeats.model'),
  device_commands: require('./device/device_commands.model'),
  device_contact_snapshots: require('./device/device_contact_snapshots.model'),
  device_locations: require('./tracking/device_locations.model'),
  geofences: require('./tracking/geofences.model'),
  geofence_alerts: require('./tracking/geofence_alerts.model'),
  audit_logs: require('./logs/audit_logs.model'),
  consent_logs: require('./logs/consent_logs.model'),
};

// Integrity is enforced in the services; DB level FK constraints are disabled so
// each table can be created/altered independently.
const NO_FK = { constraints: false };

const ASSOCIATIONS = [
  ['customers', 'devices', (db) => {
    db.customers.hasMany(db.devices, { as: 'devices', foreignKey: 'customer_id', ...NO_FK });
    db.devices.belongsTo(db.customers, { as: 'customer', foreignKey: 'customer_id', ...NO_FK });
  }],
  ['customers', 'kyc_applications', (db) => {
    db.customers.hasOne(db.kyc_applications, { as: 'kyc_application', foreignKey: 'customer_id', ...NO_FK });
    db.kyc_applications.belongsTo(db.customers, { as: 'customer', foreignKey: 'customer_id', ...NO_FK });
  }],
  ['kyc_applications', 'kyc_documents', (db) => {
    db.kyc_applications.hasMany(db.kyc_documents, { as: 'documents', foreignKey: 'kyc_application_id', ...NO_FK });
    db.kyc_documents.belongsTo(db.kyc_applications, { as: 'application', foreignKey: 'kyc_application_id', ...NO_FK });
  }],
  ['kyc_applications', 'admin_users', (db) => {
    db.kyc_applications.belongsTo(db.admin_users, { as: 'reviewer', foreignKey: 'reviewed_by', ...NO_FK });
  }],
  ['devices', 'device_commands', (db) => {
    db.devices.hasMany(db.device_commands, { as: 'commands', foreignKey: 'device_id', ...NO_FK });
    db.device_commands.belongsTo(db.devices, { as: 'device', foreignKey: 'device_id', ...NO_FK });
  }],
  ['device_commands', 'admin_users', (db) => {
    db.device_commands.belongsTo(db.admin_users, { as: 'issuer', foreignKey: 'issued_by', ...NO_FK });
  }],
  ['devices', 'device_heartbeats', (db) => {
    db.devices.hasMany(db.device_heartbeats, { as: 'heartbeats', foreignKey: 'device_id', ...NO_FK });
  }],
  ['devices', 'device_locations', (db) => {
    db.devices.hasMany(db.device_locations, { as: 'locations', foreignKey: 'device_id', ...NO_FK });
    db.device_locations.belongsTo(db.devices, { as: 'device', foreignKey: 'device_id', ...NO_FK });
  }],
  ['geofences', 'devices', (db) => {
    db.geofences.belongsTo(db.devices, { as: 'device', foreignKey: 'device_id', ...NO_FK });
  }],
  ['geofence_alerts', 'geofences', (db) => {
    db.geofence_alerts.belongsTo(db.geofences, { as: 'geofence', foreignKey: 'geofence_id', ...NO_FK });
  }],
  ['geofence_alerts', 'devices', (db) => {
    db.geofence_alerts.belongsTo(db.devices, { as: 'device', foreignKey: 'device_id', ...NO_FK });
  }],
  ['geofence_alerts', 'customers', (db) => {
    db.geofence_alerts.belongsTo(db.customers, { as: 'customer', foreignKey: 'customer_id', ...NO_FK });
  }],
  ['customers', 'consent_logs', (db) => {
    db.customers.hasMany(db.consent_logs, { as: 'consents', foreignKey: 'customer_id', ...NO_FK });
  }],
];

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {string[]} names model names to load, or undefined for all
 */
function loadModels(sequelize, names = Object.keys(MODEL_DEFINITIONS)) {
  const Sequelize = require('sequelize');
  const db = {};

  names.forEach((name) => {
    const define = MODEL_DEFINITIONS[name];
    if (!define) throw new Error(`Unknown model "${name}"`);
    db[name] = define(sequelize, Sequelize);
  });

  ASSOCIATIONS.forEach(([a, b, associate]) => {
    if (db[a] && db[b]) associate(db);
  });

  return db;
}

module.exports = { loadModels, MODEL_NAMES: Object.keys(MODEL_DEFINITIONS) };
