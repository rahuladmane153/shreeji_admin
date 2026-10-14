const Joi = require('joi');

const mobile = Joi.string().pattern(/^[6-9]\d{9}$/).message('Enter a valid 10 digit mobile number');

module.exports = {
  adminLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  customerRegister: Joi.object({
    first_name: Joi.string().trim().min(1).max(80).required(),
    last_name: Joi.string().trim().min(1).max(80).required(),
    mobile: mobile.required(),
    password: Joi.string().min(6).max(128).required(),
    confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match',
    }),
  }),

  sendOtp: Joi.object({
    mobile: mobile.required(),
  }),

  verifyOtp: Joi.object({
    mobile: mobile.required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
    // Optional device info to register the device at login time
    device: Joi.object({
      android_id: Joi.string().max(100),
      device_model: Joi.string().max(100),
      manufacturer: Joi.string().max(100),
      os_version: Joi.string().max(50),
      app_version: Joi.string().max(50),
      fcm_token: Joi.string().max(500),
    }).optional(),
  }),

  refresh: Joi.object({ refresh_token: Joi.string().required() }),
  logout: Joi.object({ refresh_token: Joi.string().required() }),
};
