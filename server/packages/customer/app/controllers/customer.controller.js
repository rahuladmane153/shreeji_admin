const { success, asyncHandler } = require('../../../../common/_helpers/response');
const customerService = require('../services/customer.service');
const reviewService = require('../services/kyc.review.service');

exports.listCustomers = asyncHandler(async (req, res) =>
  success(res, await customerService.listCustomers(req.query))
);
exports.getCustomer = asyncHandler(async (req, res) =>
  success(res, await customerService.getCustomer(Number(req.params.id)))
);

exports.listApplications = asyncHandler(async (req, res) =>
  success(res, await reviewService.listApplications(req.query))
);
exports.getApplication = asyncHandler(async (req, res) =>
  success(res, await reviewService.getApplication(Number(req.params.id)))
);
exports.markUnderReview = asyncHandler(async (req, res) =>
  success(res, await reviewService.markUnderReview(Number(req.params.id), req.admin, req))
);
exports.approve = asyncHandler(async (req, res) =>
  success(res, await reviewService.review(Number(req.params.id), 'approve', req.body.remarks, req.admin, req), 'KYC approved')
);
exports.reject = asyncHandler(async (req, res) =>
  success(res, await reviewService.review(Number(req.params.id), 'reject', req.body.remarks, req.admin, req), 'KYC rejected')
);
