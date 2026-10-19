const Joi = require('joi');

const mobile = Joi.string().pattern(/^[6-9]\d{9}$/).message('Enter a valid 10 digit mobile number');

module.exports = {
  adminLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  customerRegister: Joi.object({
    full_name: Joi.string()
      .trim()
      .min(3)
      .max(150)
      .pattern(/^[A-Za-z][A-Za-z .']*$/)
      .required()
      .messages({ 'string.pattern.base': 'Full name can contain only letters, spaces, dot and apostrophe' }),
    mobile: mobile.required(),
    password: Joi.string().min(6).max(128).required(),
    confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match',
    }),
  }),

  customerLogin: Joi.object({
    mobile: mobile.required(),
    password: Joi.string().max(128).required(),
  }),

  refresh: Joi.object({ refresh_token: Joi.string().required() }),
  logout: Joi.object({ refresh_token: Joi.string().required() }),
};
