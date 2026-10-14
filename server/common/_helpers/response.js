class AppError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

module.exports = {
  AppError,

  success: (res, data, message = 'Success', code = 200) =>
    res.status(code).json({ status: true, code, message, data }),

  error: (res, code, message, errors) =>
    res.status(code).json({ status: false, code, message, ...(errors ? { errors } : {}) }),

  // Wraps an async controller so rejected promises reach the error handler
  asyncHandler: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
};
