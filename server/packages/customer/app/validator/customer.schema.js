const Joi = require('joi');

module.exports = {
  contactsQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    search: Joi.string().trim().max(100).allow('').default(''),
  }),
  // Password is optional — when omitted the server generates a temporary one.
  resetPassword: Joi.object({
    password: Joi.string().min(6).max(128).allow('', null),
  }),
};
