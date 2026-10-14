const bcrypt = require('bcryptjs');
const db = require('../../../../common/database/db_connectivity/auth_service');
const keys = require('../../../../common/keys/keys');
const { AppError } = require('../../../../common/_helpers/response');
const { randomOtp } = require('../../../../common/_helpers/crypto');
const { issueTokens, rotateRefreshToken, revokeRefreshToken } = require('../../../../common/_helpers/tokenService');
const { writeAudit } = require('../../../../common/_helpers/audit');

const Customer = db.customers;
const Otp = db.customer_otps;
const Device = db.devices;
const RefreshToken = db.refresh_tokens;

async function registerCustomer({ first_name, last_name, mobile, password, confirm_password }, req) {
  const normalizedFirstName = String(first_name || '').trim();
  const normalizedLastName = String(last_name || '').trim();
  const normalizedMobile = String(mobile || '').trim();

  if (!normalizedFirstName || !normalizedLastName) {
    throw new AppError(400, 'First name and last name are required');
  }
  if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
    throw new AppError(400, 'Enter a valid 10 digit mobile number');
  }
  if (!password || password.length < 6) {
    throw new AppError(400, 'Password must be at least 6 characters long');
  }
  if (password !== confirm_password) {
    throw new AppError(400, 'Passwords do not match');
  }

  const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();
  const passwordHash = await bcrypt.hash(password, 10);

  // A mobile number can only be registered once. Existing rows (including
  // legacy OTP-only customers without a password) are never claimed here,
  // since registration has no ownership check on the mobile number.
  const [customer, created] = await Customer.findOrCreate({
    where: { mobile: normalizedMobile },
    defaults: {
      mobile: normalizedMobile,
      full_name: fullName,
      password_hash: passwordHash,
      last_login_at: new Date(),
    },
  });
  if (!created) throw new AppError(409, 'Mobile number already registered');

  const tokens = await issueTokens(RefreshToken, {
    userType: 'customer',
    user: customer,
    req,
  });

  await writeAudit(db.audit_logs, {
    actor: { type: 'customer', id: customer.id, name: customer.full_name || normalizedMobile },
    action: 'customer.register',
    entity: { type: 'customer', id: customer.id },
    service: 'auth',
    req,
  });

  return {
    ...tokens,
    is_new_user: true,
    customer: {
      id: customer.id,
      uuid: customer.uuid,
      mobile: customer.mobile,
      full_name: customer.full_name,
      kyc_status: customer.kyc_status,
    },
    next_step: 'register_device',
  };
}

async function sendOtp({ mobile }, req) {
  // Invalidate previous unverified OTPs for this mobile/login
  await Otp.destroy({ where: { mobile, purpose: 'login', verified_at: null } });

  const otp = keys.OTP_DEV_MODE ? '123456' : randomOtp(6);
  const otpHash = await bcrypt.hash(otp, 8);
  const expiresAt = new Date(Date.now() + keys.OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.create({ mobile, otp_hash: otpHash, purpose: 'login', expires_at: expiresAt, ip_address: req?.ip });

  if (keys.OTP_DEV_MODE) {
    console.log(`[auth] DEV OTP for ${mobile} = ${otp}`);
  } else {
    // TODO: integrate SMS gateway here
    console.log(`[auth] OTP generated for ${mobile}`);
  }

  return {
    message: 'OTP sent successfully',
    expires_in_seconds: keys.OTP_EXPIRY_MINUTES * 60,
    ...(keys.OTP_DEV_MODE ? { dev_otp: otp } : {}),
  };
}

async function verifyOtp({ mobile, otp, device }, req) {
  const record = await Otp.findOne({
    where: { mobile, purpose: 'login', verified_at: null },
    order: [['id', 'DESC']],
  });
  if (!record) throw new AppError(400, 'Please request an OTP first');
  if (new Date(record.expires_at) < new Date()) throw new AppError(400, 'OTP has expired');
  if (record.attempts >= keys.OTP_MAX_ATTEMPTS) throw new AppError(429, 'Too many attempts, request a new OTP');

  const ok = await bcrypt.compare(String(otp), record.otp_hash);
  if (!ok) {
    await record.increment('attempts');
    throw new AppError(401, 'Incorrect OTP');
  }

  await record.update({ verified_at: new Date() });

  // Find or create the customer
  const [customer, created] = await Customer.findOrCreate({
    where: { mobile },
    defaults: { mobile, last_login_at: new Date() },
  });
  if (!created) await customer.update({ last_login_at: new Date() });
  if (customer.status === 'blocked') throw new AppError(403, 'Your account is blocked');

  // Register / update the device if device info supplied
  let deviceRow = null;
  if (device?.android_id) {
    [deviceRow] = await Device.findOrCreate({
      where: { customer_id: customer.id, android_id: device.android_id },
      defaults: {
        customer_id: customer.id,
        android_id: device.android_id,
        device_model: device.device_model,
        manufacturer: device.manufacturer,
        os_version: device.os_version,
        app_version: device.app_version,
        fcm_token: device.fcm_token,
        last_seen: new Date(),
      },
    });
    await deviceRow.update({
      app_version: device.app_version || deviceRow.app_version,
      fcm_token: device.fcm_token || deviceRow.fcm_token,
      last_seen: new Date(),
    });
  }

  const tokens = await issueTokens(RefreshToken, {
    userType: 'customer',
    user: customer,
    deviceId: deviceRow?.id,
    req,
  });

  await writeAudit(db.audit_logs, {
    actor: { type: 'customer', id: customer.id, name: customer.full_name || mobile },
    action: created ? 'customer.register' : 'customer.login',
    entity: { type: 'customer', id: customer.id },
    service: 'auth',
    req,
  });

  return {
    ...tokens,
    is_new_user: created,
    customer: {
      id: customer.id,
      uuid: customer.uuid,
      mobile: customer.mobile,
      full_name: customer.full_name,
      kyc_status: customer.kyc_status,
    },
    device: deviceRow ? { id: deviceRow.id, device_id: deviceRow.device_id, status: deviceRow.status } : null,
  };
}

async function refresh({ refresh_token }, req) {
  const result = await rotateRefreshToken(RefreshToken, refresh_token, {
    req,
    signAccessFor: async (row) => {
      if (row.user_type !== 'customer') return {};
      const customer = await Customer.findByPk(row.user_id);
      if (!customer || customer.status === 'blocked') return {};
      return { user: customer };
    },
  });
  if (!result) throw new AppError(401, 'Invalid or expired refresh token');
  return result;
}

async function logout({ refresh_token }) {
  await revokeRefreshToken(RefreshToken, refresh_token);
  return { message: 'Logged out' };
}

module.exports = { registerCustomer, sendOtp, verifyOtp, refresh, logout };
