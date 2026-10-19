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
  success(res, await customerAuth.registerCustomer(req.body, req), 'Registration successful. Please login.', 201)
);
exports.customerLogin = asyncHandler(async (req, res) =>
  success(res, await customerAuth.login(req.body, req), 'Login successful')
);
exports.customerRefresh = asyncHandler(async (req, res) =>
  success(res, await customerAuth.refresh(req.body, req), 'Token refreshed')
);
exports.customerLogout = asyncHandler(async (req, res) =>
  success(res, await customerAuth.logout(req.body), 'Logged out')
);
