const { success, asyncHandler } = require('../../../../common/_helpers/response');
const svc = require('../services/tracking.service');

exports.liveMap = asyncHandler(async (req, res) => success(res, await svc.liveMap()));
exports.locationHistory = asyncHandler(async (req, res) =>
  success(res, await svc.locationHistory(Number(req.params.id), req.query))
);

exports.listGeofences = asyncHandler(async (req, res) => success(res, await svc.listGeofences()));
exports.createGeofence = asyncHandler(async (req, res) =>
  success(res, await svc.createGeofence(req.body, req.admin), 'Geofence created', 201)
);
exports.updateGeofence = asyncHandler(async (req, res) =>
  success(res, await svc.updateGeofence(Number(req.params.id), req.body), 'Geofence updated')
);
exports.deleteGeofence = asyncHandler(async (req, res) =>
  success(res, await svc.deleteGeofence(Number(req.params.id)), 'Geofence deleted')
);

exports.listAlerts = asyncHandler(async (req, res) => success(res, await svc.listAlerts(req.query)));
exports.acknowledgeAlert = asyncHandler(async (req, res) =>
  success(res, await svc.acknowledgeAlert(Number(req.params.id), req.admin), 'Alert acknowledged')
);
