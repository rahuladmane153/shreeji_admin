const Joi = require('joi');
const { GEOFENCE_ALERT_ON } = require('../../../../common/config/constant.config');

const geofenceBody = Joi.object({
  name: Joi.string().max(150).required(),
  description: Joi.string().max(500).allow('', null),
  center_latitude: Joi.number().min(-90).max(90).required(),
  center_longitude: Joi.number().min(-180).max(180).required(),
  radius_meters: Joi.number().integer().min(10).max(1000000).required(),
  alert_on: Joi.string().valid(...GEOFENCE_ALERT_ON).default('both'),
  device_id: Joi.number().integer().allow(null),
  is_active: Joi.boolean().default(true),
});

module.exports = {
  createGeofence: geofenceBody,
  updateGeofence: geofenceBody.fork(
    ['name', 'center_latitude', 'center_longitude', 'radius_meters'],
    (s) => s.optional()
  ).min(1),
};
