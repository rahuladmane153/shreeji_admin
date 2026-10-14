const db = require('../../../../common/database/db_connectivity/kyc_app_service');
const { AppError } = require('../../../../common/_helpers/response');

const Customer = db.customers;

async function getProfile(customerId) {
  const c = await Customer.findByPk(customerId);
  if (!c) throw new AppError(404, 'Customer not found');
  return {
    id: c.id,
    uuid: c.uuid,
    mobile: c.mobile,
    full_name: c.full_name,
    email: c.email,
    dob: c.dob,
    gender: c.gender,
    address: c.address,
    city: c.city,
    state: c.state,
    pincode: c.pincode,
    kyc_status: c.kyc_status,
  };
}

async function updateProfile(customerId, body) {
  const c = await Customer.findByPk(customerId);
  if (!c) throw new AppError(404, 'Customer not found');
  await c.update(body);
  return getProfile(customerId);
}

module.exports = { getProfile, updateProfile };
