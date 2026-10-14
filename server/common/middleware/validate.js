const { error } = require('../_helpers/response');

/**
 * Returns middleware that validates req[property] against a Joi schema and
 * replaces it with the sanitised value.
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error: err, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (err) {
      return error(res, 422, 'Validation failed', err.details.map((d) => d.message));
    }
    req[property] = value;
    return next();
  };
}

module.exports = { validate };
