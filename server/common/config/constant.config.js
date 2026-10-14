// Shared enums used by models, validators and services.

module.exports = {
  ADMIN_ROLES: ['super_admin', 'admin', 'reviewer'],
  USER_STATUS: ['active', 'blocked'],

  KYC_STATUS: ['not_started', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected'],

  DOC_TYPES: ['aadhaar_front', 'aadhaar_back', 'pan', 'address_proof', 'other', 'selfie'],
  // Documents that must be present before a KYC application can be submitted
  REQUIRED_DOC_TYPES: ['aadhaar_front', 'aadhaar_back', 'pan', 'selfie'],

  DEVICE_STATUS: ['active', 'locked', 'disabled', 'released', 'revoked'],

  DEVICE_ACTIONS: ['lock', 'unlock', 'disable', 'enable', 'release', 'allow_uninstall', 'block_uninstall', 'revoke'],
  COMMAND_STATUS: ['pending', 'delivered', 'executed', 'failed', 'cancelled'],

  GEOFENCE_ALERT_ON: ['enter', 'exit', 'both'],
  GEOFENCE_EVENTS: ['enter', 'exit'],

  CONSENT_TYPES: ['terms', 'privacy', 'location_tracking', 'kyc_data', 'device_management'],

  ACTOR_TYPES: ['admin', 'customer', 'system'],
  TOKEN_TYPES: { ADMIN: 'admin', CUSTOMER: 'customer' },
};
