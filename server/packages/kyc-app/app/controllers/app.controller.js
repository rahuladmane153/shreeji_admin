const { success, asyncHandler, AppError } = require('../../../../common/_helpers/response');
const deviceService = require('../services/device.service');
const kycService = require('../services/kyc.service');
const profileService = require('../services/profile.service');
const dashboardService = require('../services/dashboard.service');
const contactsService = require('../services/contacts.service');

const customerId = (req) => req.auth.sub;

// ---- Dashboard ----
exports.getDashboard = asyncHandler(async (req, res) =>
  success(res, await dashboardService.getDashboard(customerId(req), req.query.android_id))
);

// ---- Profile ----
exports.getProfile = asyncHandler(async (req, res) =>
  success(res, await profileService.getProfile(customerId(req)))
);
exports.updateProfile = asyncHandler(async (req, res) =>
  success(res, await profileService.updateProfile(customerId(req), req.body), 'Profile updated')
);

// ---- Device ----
exports.deviceStatus = asyncHandler(async (req, res) =>
  success(res, await deviceService.deviceStatus(customerId(req), req.query.android_id))
);
exports.registerDevice = asyncHandler(async (req, res) =>
  success(res, await deviceService.registerDevice(customerId(req), req.body), 'Device registered', 201)
);
exports.heartbeat = asyncHandler(async (req, res) =>
  success(res, await deviceService.heartbeat(customerId(req), Number(req.params.deviceId), req.body))
);
exports.pollCommands = asyncHandler(async (req, res) =>
  success(res, await deviceService.pollCommands(customerId(req), Number(req.params.deviceId)))
);
exports.reportCommandResult = asyncHandler(async (req, res) =>
  success(
    res,
    await deviceService.reportCommandResult(customerId(req), Number(req.params.deviceId), req.params.commandUuid, req.body)
  )
);
exports.recordConsents = asyncHandler(async (req, res) =>
  success(res, await deviceService.recordConsents(customerId(req), req.body.device_id || null, req.body, req), 'Consent recorded')
);

// ---- Location ----
exports.pushLocation = asyncHandler(async (req, res) => {
  const { is_offline_sync, ...point } = req.body;
  const out = await deviceService.ingestLocations(customerId(req), Number(req.params.deviceId), [point], {
    offlineSync: is_offline_sync,
  });
  return success(res, out, 'Location recorded');
});
exports.pushLocationBatch = asyncHandler(async (req, res) =>
  success(
    res,
    await deviceService.ingestLocations(customerId(req), Number(req.params.deviceId), req.body.locations, { offlineSync: true }),
    'Locations synced'
  )
);

exports.saveDeviceContacts = asyncHandler(async (req, res) =>
  success(res, await contactsService.saveDeviceContacts(customerId(req), Number(req.params.deviceId), req.body.contacts), 'Contacts synced')
);
exports.getDeviceContacts = asyncHandler(async (req, res) =>
  success(res, await contactsService.getDeviceContacts(customerId(req), Number(req.params.deviceId), {
    offset: Number(req.query.offset || 0),
    limit: Number(req.query.limit || 50),
  }))
);

// ---- KYC ----
exports.getKycStatus = asyncHandler(async (req, res) =>
  success(res, await kycService.getStatus(customerId(req)))
);
exports.uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'No file uploaded');
  const out = await kycService.saveDocument(
    customerId(req), req.body.device_id || null, req.body.doc_type, req.file, req.body.ocr_text
  );
  return success(res, out, 'Document uploaded', 201);
});
exports.uploadSelfie = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'No selfie uploaded');
  let liveness;
  try {
    liveness = req.body.liveness ? JSON.parse(req.body.liveness) : undefined;
  } catch (_) {
    liveness = undefined;
  }
  const out = await kycService.saveSelfie(customerId(req), req.body.device_id || null, req.file, liveness);
  return success(res, out, 'Selfie saved', 201);
});
exports.submitKyc = asyncHandler(async (req, res) =>
  success(res, await kycService.reviewAndSubmit(customerId(req), req.body, req), 'KYC submitted successfully')
);
