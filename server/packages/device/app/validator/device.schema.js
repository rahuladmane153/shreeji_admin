const Joi = require('joi');
const { DEVICE_ACTIONS } = require('../../../../common/config/constant.config');

module.exports = {
  issueCommand: Joi.object({
    command: Joi.string().valid(...DEVICE_ACTIONS).required(),
    reason: Joi.string().max(255).allow('', null),
    payload: Joi.object().allow(null),
  }),
};
