const { AppError } = require('../_helpers/response');

/** Final error handler mounted after all routes on every service. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: false,
      code: err.statusCode,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // Malformed JSON body (thrown by express.json before any route runs)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ status: false, code: 400, message: 'Invalid JSON body' });
  }

  // Sequelize validation / unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ status: false, code: 409, message: 'Record already exists' });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      status: false,
      code: 422,
      message: 'Validation failed',
      errors: err.errors.map((e) => e.message),
    });
  }

  // Never log Sequelize's SQL text or bound parameters; they may contain PII.
  console.error('[unhandled error]', {
    name: err.name,
    code: err.code || err.parent?.code || err.original?.code,
    message: err.message,
    stack: err.stack,
  });
  return res.status(500).json({ status: false, code: 500, message: 'Internal server error' });
}

module.exports = { errorHandler };
