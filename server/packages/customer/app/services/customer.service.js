const db = require('../../../../common/database/db_connectivity/customer_service');
const { AppError } = require('../../../../common/_helpers/response');
const { getPaging, buildMeta } = require('../../../../common/_helpers/pagination');
const { maskAadhaar } = require('../../../../common/_helpers/crypto');
const { hashPassword, generatePassword } = require('../../../../common/_helpers/password');
const { writeAudit } = require('../../../../common/_helpers/audit');
const { parseContactPhones } = require('../../../../common/_helpers/contactPhones');

const Customer = db.customers;
const Application = db.kyc_applications;
const Document = db.kyc_documents;
const Device = db.devices;
const RefreshToken = db.refresh_tokens;
const Op = db.Op;

/** Paginated list of onboarded customers for the admin table. */
async function listCustomers(query) {
  const { page, limit, offset } = getPaging(query);
  const where = {};

  if (query.kyc_status) where.kyc_status = query.kyc_status;
  if (query.status) where.status = query.status;
  if (query.search) {
    where[Op.or] = [
      { full_name: { [Op.like]: `%${query.search}%` } },
      { mobile: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Customer.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    items: rows.map((c) => ({
      id: c.id,
      uuid: c.uuid,
      full_name: c.full_name,
      mobile: c.mobile,
      email: c.email,
      city: c.city,
      state: c.state,
      kyc_status: c.kyc_status,
      status: c.status,
      onboarded_at: c.createdAt,
      last_login_at: c.last_login_at,
    })),
    meta: buildMeta(count, page, limit),
  };
}

/** Full profile of a single customer with KYC, documents and devices. */
async function getCustomer(id) {
  const customer = await Customer.findByPk(id, {
    include: [
      { model: Application, as: 'kyc_application', include: [{ model: Document, as: 'documents' }] },
      { model: Device, as: 'devices' },
    ],
  });
  if (!customer) throw new AppError(404, 'Customer not found');

  const devices = customer.devices || [];
  const contactRows = await db.device_contact_snapshots.findAll({
    where: { customer_id: customer.id },
    attributes: [
      'device_id',
      [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'contacts_count'],
      [db.Sequelize.fn('MAX', db.Sequelize.col('synced_at')), 'contacts_synced_at'],
    ],
    group: ['device_id'],
    raw: true,
  });
  const contactStats = new Map();
  for (const contactStat of contactRows) contactStats.set(String(contactStat.device_id), contactStat);

  const app = customer.kyc_application;
  return {
    id: customer.id,
    uuid: customer.uuid,
    full_name: customer.full_name,
    mobile: customer.mobile,
    email: customer.email,
    dob: customer.dob,
    gender: customer.gender,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    pincode: customer.pincode,
    kyc_status: customer.kyc_status,
    status: customer.status,
    onboarded_at: customer.createdAt,
    consent_accepted_at: customer.consent_accepted_at,
    kyc: app
      ? {
          uuid: app.uuid,
          status: app.status,
          name_on_document: app.name_on_document,
          dob_on_document: app.dob_on_document,
          gender_on_document: app.gender_on_document,
          address_on_document: app.address_on_document,
          aadhaar_masked: maskAadhaar(app.aadhaar_last4),
          pan_number: app.pan_number,
          selfie_captured_at: app.selfie_captured_at,
          submitted_at: app.submitted_at,
          reviewed_at: app.reviewed_at,
          review_remarks: app.review_remarks,
          documents: (app.documents || []).map((d) => ({
            doc_type: d.doc_type,
            file_url: `/uploads/${d.file_path}`,
            mime_type: d.mime_type,
            uploaded_at: d.createdAt,
          })),
        }
      : null,
    devices: devices.map((d) => ({
      id: d.id,
      device_code: d.device_code,
      device_model: d.device_model,
      status: d.status,
      battery_level: d.battery_level,
      last_seen: d.last_seen,
      contacts_count: Number(contactStats.get(String(d.id))?.contacts_count || 0),
      contacts_synced_at: contactStats.get(String(d.id))?.contacts_synced_at || null,
    })),
  };
}

async function listDeviceContacts(customerId, deviceId, query) {
  const device = await Device.findOne({ where: { id: deviceId, customer_id: customerId } });
  if (!device) throw new AppError(404, 'Registered device not found');

  const { page, limit, offset } = getPaging(query, { defaultLimit: 25, maxLimit: 100 });
  const where = { customer_id: customerId, device_id: device.id };
  const search = String(query.search || '').trim();
  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { display_name: { [Op.like]: pattern } },
      db.Sequelize.where(
        db.Sequelize.fn('JSON_SEARCH', db.Sequelize.col('phones'), 'one', pattern),
        { [Op.ne]: null }
      ),
    ];
  }

  const { rows, count } = await db.device_contact_snapshots.findAndCountAll({
    where,
    attributes: ['contact_id', 'display_name', 'phones', 'synced_at'],
    order: [['display_name', 'ASC'], ['contact_id', 'ASC']],
    limit,
    offset,
  });

  return {
    items: rows.map((contact) => ({
      contact_id: contact.contact_id,
      display_name: contact.display_name,
      phones: parseContactPhones(contact.phones),
      synced_at: contact.synced_at,
    })),
    meta: buildMeta(count, page, limit),
  };
}

/**
 * Resets a customer's login password. The admin may supply a new password, or
 * one is generated. All of the customer's active sessions are revoked so they
 * must sign in again with the new password.
 *
 * @returns the password that was set (so the admin can share it with the
 *          customer) and whether it was auto-generated.
 */
async function resetCustomerPassword(id, { password }, admin, req) {
  const customer = await Customer.findByPk(id);
  if (!customer) throw new AppError(404, 'Customer not found');

  const generated = !password;
  const newPassword = password || generatePassword();

  await customer.update({ password_hash: await hashPassword(newPassword) });

  // Force re-login everywhere: revoke all of this customer's active refresh tokens
  const revoked = await RefreshToken.update(
    { revoked_at: new Date() },
    { where: { user_type: 'customer', user_id: customer.id, revoked_at: null } }
  );

  await writeAudit(db.audit_logs, {
    actor: { type: 'admin', id: admin.id, name: admin.name },
    action: 'customer.password_reset',
    entity: { type: 'customer', id: customer.id },
    description: generated ? 'Reset with a generated password' : 'Reset with an admin-supplied password',
    meta: { sessions_revoked: Array.isArray(revoked) ? revoked[0] : revoked },
    service: 'customer',
    req,
  });

  return {
    customer_id: customer.id,
    mobile: customer.mobile,
    full_name: customer.full_name,
    password: newPassword,
    generated,
    sessions_revoked: Array.isArray(revoked) ? revoked[0] : revoked,
  };
}

module.exports = { listCustomers, getCustomer, listDeviceContacts, resetCustomerPassword };
