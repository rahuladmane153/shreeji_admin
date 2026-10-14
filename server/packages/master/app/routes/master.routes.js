const { authenticate, requireType } = require('../../../../common/middleware/authJwt');
const { attachAdmin } = require('../../../../common/middleware/attachActor');
const { success, asyncHandler } = require('../../../../common/_helpers/response');
const svc = require('../services/dashboard.service');

module.exports = (router) => {
  router.use(authenticate, requireType('admin'), attachAdmin);

  router.get('/dashboard', asyncHandler(async (req, res) => success(res, await svc.dashboard())));
  router.get('/audit-logs', asyncHandler(async (req, res) => success(res, await svc.auditLogs(req.query))));
};
