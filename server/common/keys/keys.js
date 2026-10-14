const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const env = process.env;

module.exports = {
  NODE_ENV: env.NODE_ENV || 'development',
  IS_PRODUCTION: env.NODE_ENV === 'production',

  // SERVICE PORTS
  GATEWAY_PORT: env.GATEWAY_PORT || 5000,
  AUTH_PORT: env.AUTH_PORT || 5001,
  KYC_APP_PORT: env.KYC_APP_PORT || 5002,
  CUSTOMER_PORT: env.CUSTOMER_PORT || 5003,
  DEVICE_PORT: env.DEVICE_PORT || 5004,
  TRACKING_PORT: env.TRACKING_PORT || 5005,
  MASTER_PORT: env.MASTER_PORT || 5006,

  // SERVICE URLS
  SERVICES: {
    auth: env.AUTH_SERVICE,
    'kyc-app': env.KYC_APP_SERVICE,
    customer: env.CUSTOMER_SERVICE,
    device: env.DEVICE_SERVICE,
    tracking: env.TRACKING_SERVICE,
    master: env.MASTER_SERVICE,
  },
  CLIENT_URLS: (env.CLIENT_URLS || '').split(',').map((s) => s.trim()).filter(Boolean),

  // MYSQL DB
  MYSQL_HOST: env.MYSQL_HOST || '127.0.0.1',
  MYSQL_PORT: Number(env.MYSQL_PORT || 3306),
  MYSQL_USER: env.MYSQL_USER,
  MYSQL_PASSWORD: env.MYSQL_PASSWORD,
  MYSQL_DB: env.MYSQL_DB,
  SEQUELIZE_LOGGING: env.SEQUELIZE_LOGGING == 1,

  // SECURITY
  JWT_SECURITY_KEY: env.JWT_SECURITY_KEY,
  JWT_REFRESH_KEY: env.JWT_REFRESH_KEY,
  CRYPTO_SECURITY_KEY: env.CRYPTO_SECURITY_KEY,
  ADMIN_ACCESS_TOKEN_EXPIRY: env.ADMIN_ACCESS_TOKEN_EXPIRY || '1h',
  CUSTOMER_ACCESS_TOKEN_EXPIRY: env.CUSTOMER_ACCESS_TOKEN_EXPIRY || '1d',
  REFRESH_TOKEN_EXPIRY_DAYS: Number(env.REFRESH_TOKEN_EXPIRY_DAYS || 30),

  // OTP
  OTP_EXPIRY_MINUTES: Number(env.OTP_EXPIRY_MINUTES || 5),
  OTP_MAX_ATTEMPTS: Number(env.OTP_MAX_ATTEMPTS || 5),
  OTP_DEV_MODE: env.OTP_DEV_MODE == 1,

  // FILE STORAGE
  UPLOAD_DIR: path.resolve(__dirname, '../..', env.UPLOAD_DIR || 'uploads'),
  MAX_UPLOAD_MB: Number(env.MAX_UPLOAD_MB || 10),

  // DEVICE
  DEVICE_OFFLINE_AFTER_MINUTES: Number(env.DEVICE_OFFLINE_AFTER_MINUTES || 15),

  // SEED
  SEED_ADMIN_NAME: env.SEED_ADMIN_NAME || 'Super Admin',
  SEED_ADMIN_EMAIL: env.SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD: env.SEED_ADMIN_PASSWORD,
};
