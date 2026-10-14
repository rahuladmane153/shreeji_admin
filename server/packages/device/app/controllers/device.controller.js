const { success, asyncHandler } = require('../../../../common/_helpers/response');
const svc = require('../services/device.admin.service');

exports.list = asyncHandler(async (req, res) => success(res, await svc.listDevices(req.query)));
exports.stats = asyncHandler(async (req, res) => success(res, await svc.getStats()));
exports.get = asyncHandler(async (req, res) => success(res, await svc.getDevice(Number(req.params.id))));
exports.issueCommand = asyncHandler(async (req, res) =>
  success(res, await svc.issueCommand(Number(req.params.id), req.body, req.admin, req), 'Command queued')
);
exports.commandHistory = asyncHandler(async (req, res) =>
  success(res, await svc.commandHistory(Number(req.params.id)))
);
