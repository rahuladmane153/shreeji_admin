const Joi = require('joi');
const { DOC_TYPES, CONSENT_TYPES } = require('../../../../common/config/constant.config');

const lat = Joi.number().min(-90).max(90);
const lng = Joi.number().min(-180).max(180);

module.exports = {
  androidIdQuery: Joi.object({
    android_id: Joi.string().max(100).allow(''),
  }),

  registerDevice: Joi.object({
    android_id: Joi.string().max(100).required(),
    device_model: Joi.string().max(100).allow('', null),
    manufacturer: Joi.string().max(100).allow('', null),
    os_version: Joi.string().max(50).allow('', null),
    sdk_int: Joi.number().integer().allow(null),
    app_version: Joi.string().max(50).allow('', null),
    fcm_token: Joi.string().max(500).allow('', null),
  }),

  deviceContacts: Joi.object({
    contacts: Joi.array().items(Joi.object({
      contact_id: Joi.string().max(100).required(),
      display_name: Joi.string().max(300).allow('').required(),
      phones: Joi.array().items(Joi.string().max(100)).max(20).required(),
      photo_base64: Joi.string().base64().max(300000).allow('').optional(),
    })).max(10000).required(),
  }),

  updateProfile: Joi.object({
    full_name: Joi.string().max(150),
    email: Joi.string().email().allow('', null),
    dob: Joi.date().iso().allow(null),
    gender: Joi.string().valid('male', 'female', 'other').allow(null),
    address: Joi.string().max(500).allow('', null),
    city: Joi.string().max(100).allow('', null),
    state: Joi.string().max(100).allow('', null),
    pincode: Joi.string().max(10).allow('', null),
  }).min(1),

  reviewKyc: Joi.object({
    name_on_document: Joi.string().max(150).allow('', null),
    dob_on_document: Joi.date().iso().allow(null),
    gender_on_document: Joi.string().max(10).allow('', null),
    address_on_document: Joi.string().max(500).allow('', null),
    aadhaar_number: Joi.string().pattern(/^\d{12}$/).allow('', null),
    pan_number: Joi.string().pattern(/^[A-Z]{5}\d{4}[A-Z]$/).allow('', null),
    declaration_accepted: Joi.boolean().valid(true).required(),
  }),

  uploadDocMeta: Joi.object({
    doc_type: Joi.string().valid(...DOC_TYPES).required(),
    device_id: Joi.number().integer().allow('', null),
    // Text recognised on the device (ML Kit) from the uploaded image
    ocr_text: Joi.string().max(20000).allow('', null),
  }),

  selfie: Joi.object({
    liveness: Joi.object({
      looked_at_camera: Joi.boolean(),
      blink_detected: Joi.boolean(),
      head_moved: Joi.boolean(),
      score: Joi.number().min(0).max(1),
    }).optional(),
  }),

  location: Joi.object({
    latitude: lat.required(),
    longitude: lng.required(),
    accuracy: Joi.number().allow(null),
    altitude: Joi.number().allow(null),
    speed: Joi.number().allow(null),
    heading: Joi.number().allow(null),
    battery_level: Joi.number().min(0).max(100).allow(null),
    recorded_at: Joi.date().iso().required(),
    is_offline_sync: Joi.boolean().default(false),
  }),

  locationBatch: Joi.object({
    locations: Joi.array()
      .items(
        Joi.object({
          latitude: lat.required(),
          longitude: lng.required(),
          accuracy: Joi.number().allow(null),
          altitude: Joi.number().allow(null),
          speed: Joi.number().allow(null),
          heading: Joi.number().allow(null),
          battery_level: Joi.number().min(0).max(100).allow(null),
          recorded_at: Joi.date().iso().required(),
        })
      )
      .min(1)
      .max(500)
      .required(),
  }),

  heartbeat: Joi.object({
    battery_level: Joi.number().min(0).max(100).allow(null),
    is_charging: Joi.boolean().allow(null),
    network_type: Joi.string().max(20).allow('', null),
    app_version: Joi.string().max(50).allow('', null),
    admin_active: Joi.boolean().allow(null),
    location_permission: Joi.string().max(20).allow('', null),
  }),

  consent: Joi.object({
    consents: Joi.array()
      .items(
        Joi.object({
          consent_type: Joi.string().valid(...CONSENT_TYPES).required(),
          accepted: Joi.boolean().required(),
          consent_version: Joi.string().max(20).allow('', null),
        })
      )
      .min(1)
      .required(),
    app_version: Joi.string().max(50).allow('', null),
  }),

  commandResult: Joi.object({
    status: Joi.string().valid('executed', 'failed').required(),
    result_message: Joi.string().max(500).allow('', null),
  }),
};
