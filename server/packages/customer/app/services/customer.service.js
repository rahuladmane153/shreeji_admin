const db = require('../../../../common/database/db_connectivity/customer_service');
const { AppError } = require('../../../../common/_helpers/response');
const { getPaging, buildMeta } = require('../../../../common/_helpers/pagination');
const { maskAadhaar } = require('../../../../common/_helpers/crypto');

const Customer = db.customers;
const Application = db.kyc_applications;
const Document = db.kyc_documents;
const Device = db.devices;
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
      onboarded_at: c.created_at,
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
    onboarded_at: customer.created_at,
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
            uploaded_at: d.created_at,
          })),
        }
      : null,
    devices: (customer.devices || []).map((d) => ({
      id: d.id,
      device_code: d.device_code,
      device_model: d.device_model,
      status: d.status,
      battery_level: d.battery_level,
      last_seen: d.last_seen,
    })),
  };
}

module.exports = { listCustomers, getCustomer };
