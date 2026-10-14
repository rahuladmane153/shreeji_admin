const { success, asyncHandler } = require('../../../../common/_helpers/response');
const adminAuth = require('../services/admin.auth.service');
const customerAuth = require('../services/customer.auth.service');

// ---- Admin ----
exports.adminLogin = asyncHandler(async (req, res) =>
  success(res, await adminAuth.login(req.body, req), 'Login successful')
);
exports.adminRefresh = asyncHandler(async (req, res) =>
  success(res, await adminAuth.refresh(req.body, req), 'Token refreshed')
);
exports.adminLogout = asyncHandler(async (req, res) =>
  success(res, await adminAuth.logout(req.body), 'Logged out')
);

// ---- Customer ----
exports.customerRegister = asyncHandler(async (req, res) =>
  success(res, await customerAuth.registerCustomer(req.body, req), 'Customer registered', 201)
);
exports.sendOtp = asyncHandler(async (req, res) =>
  success(res, await customerAuth.sendOtp(req.body, req), 'OTP sent')
);
exports.verifyOtp = asyncHandler(async (req, res) =>
  success(res, await customerAuth.verifyOtp(req.body, req), 'OTP verified')
);
exports.customerRefresh = asyncHandler(async (req, res) =>
  success(res, await customerAuth.refresh(req.body, req), 'Token refreshed')
);
exports.customerLogout = asyncHandler(async (req, res) =>
  success(res, await customerAuth.logout(req.body), 'Logged out')
);
