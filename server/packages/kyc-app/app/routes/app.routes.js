const { authenticate, requireType } = require('../../../../common/middleware/authJwt');
const { validate } = require('../../../../common/middleware/validate');
const { upload } = require('../../../../common/_helpers/upload');
const schema = require('../validator/app.schema');
const ctrl = require('../controllers/app.controller');

// Store KYC uploads under uploads/kyc/<customerId>/
const setKycDir = (req, res, next) => {
  req.uploadSubdir = `kyc/${req.auth.sub}`;
  next();
};

module.exports = (router) => {
  // Every mobile route requires a customer token
  router.use(authenticate, requireType('customer'));

  // Profile
  router.get('/profile', ctrl.getProfile);
  router.put('/profile', validate(schema.updateProfile), ctrl.updateProfile);

  // Consent
  router.post('/consents', validate(schema.consent), ctrl.recordConsents);

  // Device
  router.post('/devices/register', validate(schema.registerDevice), ctrl.registerDevice);
  router.post('/devices/:deviceId/heartbeat', validate(schema.heartbeat), ctrl.heartbeat);
  router.get('/devices/:deviceId/commands', ctrl.pollCommands);
  router.post('/devices/:deviceId/commands/:commandUuid/result', validate(schema.commandResult), ctrl.reportCommandResult);

  // Location tracking
  router.post('/devices/:deviceId/location', validate(schema.location), ctrl.pushLocation);
  router.post('/devices/:deviceId/location/batch', validate(schema.locationBatch), ctrl.pushLocationBatch);

  // KYC
  router.get('/kyc/status', ctrl.getKycStatus);
  router.post('/kyc/documents', setKycDir, upload.single('file'), validate(schema.uploadDocMeta), ctrl.uploadDocument);
  router.post('/kyc/selfie', setKycDir, upload.single('file'), ctrl.uploadSelfie);
  router.post('/kyc/submit', validate(schema.reviewKyc), ctrl.submitKyc);
};
