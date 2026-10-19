const db = require('../../../../common/database/db_connectivity/customer_service');
const { AppError } = require('../../../../common/_helpers/response');
const { getPaging, buildMeta } = require('../../../../common/_helpers/pagination');
const { maskAadhaar } = require('../../../../common/_helpers/crypto');
const { writeAudit } = require('../../../../common/_helpers/audit');

const Customer = db.customers;
const Application = db.kyc_applications;
const Document = db.kyc_documents;
const Op = db.Op;

async function listApplications(query) {
  const { page, limit, offset } = getPaging(query);
  const where = {};
  if (query.status) where.status = query.status;

  const include = [
    {
      model: Customer,
      as: 'customer',
      attributes: ['id', 'full_name', 'mobile', 'email', 'city'],
      ...(query.search
        ? {
            where: {
              [Op.or]: [
                { full_name: { [Op.like]: `%${query.search}%` } },
                { mobile: { [Op.like]: `%${query.search}%` } },
              ],
            },
          }
        : {}),
    },
  ];

  const { rows, count } = await Application.findAndCountAll({
    where,
    include,
    order: [['updated_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    items: rows.map((a) => ({
      id: a.id,
      uuid: a.uuid,
      status: a.status,
      customer: a.customer
        ? { id: a.customer.id, full_name: a.customer.full_name, mobile: a.customer.mobile, city: a.customer.city }
        : null,
      aadhaar_masked: maskAadhaar(a.aadhaar_last4),
      pan_number: a.pan_number,
      verification: a.ocr_data?.overall || null,
      submitted_at: a.submitted_at,
      reviewed_at: a.reviewed_at,
    })),
    meta: buildMeta(count, page, limit),
  };
}

async function getApplication(id) {
  const a = await Application.findByPk(id, {
    include: [
      { model: Customer, as: 'customer' },
      { model: Document, as: 'documents' },
    ],
  });
  if (!a) throw new AppError(404, 'KYC application not found');

  return {
    id: a.id,
    uuid: a.uuid,
    status: a.status,
    name_on_document: a.name_on_document,
    dob_on_document: a.dob_on_document,
    gender_on_document: a.gender_on_document,
    address_on_document: a.address_on_document,
    aadhaar_masked: maskAadhaar(a.aadhaar_last4),
    pan_number: a.pan_number,
    declaration_accepted: a.declaration_accepted,
    selfie_liveness: a.selfie_liveness,
    // Automatic document checks { overall, checks[], edited_fields[] }
    verification: a.ocr_data || null,
    submitted_at: a.submitted_at,
    reviewed_at: a.reviewed_at,
    review_remarks: a.review_remarks,
    customer: a.customer
      ? {
          id: a.customer.id,
          full_name: a.customer.full_name,
          mobile: a.customer.mobile,
          email: a.customer.email,
          dob: a.customer.dob,
          address: a.customer.address,
          city: a.customer.city,
          state: a.customer.state,
        }
      : null,
    documents: (a.documents || []).map((d) => ({
      doc_type: d.doc_type,
      file_url: `/uploads/${d.file_path}`,
      mime_type: d.mime_type,
      uploaded_at: d.createdAt,
    })),
  };
}

async function review(id, decision, remarks, admin, req) {
  const a = await Application.findByPk(id);
  if (!a) throw new AppError(404, 'KYC application not found');
  if (a.status !== 'submitted' && a.status !== 'under_review') {
    throw new AppError(409, `Cannot review an application in "${a.status}" state`);
  }

  const newStatus = decision === 'approve' ? 'approved' : 'rejected';
  await a.update({
    status: newStatus,
    reviewed_by: admin.id,
    reviewed_at: new Date(),
    review_remarks: remarks || null,
  });
  await Customer.update({ kyc_status: newStatus }, { where: { id: a.customer_id } });

  await writeAudit(db.audit_logs, {
    actor: { type: 'admin', id: admin.id, name: admin.name },
    action: `kyc.${newStatus}`,
    entity: { type: 'kyc_application', id: a.id },
    description: remarks,
    service: 'customer',
    req,
  });

  return { id: a.id, status: newStatus };
}

async function markUnderReview(id, admin, req) {
  const a = await Application.findByPk(id);
  if (!a) throw new AppError(404, 'KYC application not found');
  if (a.status === 'submitted') {
    await a.update({ status: 'under_review', reviewed_by: admin.id });
    await Customer.update({ kyc_status: 'under_review' }, { where: { id: a.customer_id } });
    await writeAudit(db.audit_logs, {
      actor: { type: 'admin', id: admin.id, name: admin.name },
      action: 'kyc.under_review',
      entity: { type: 'kyc_application', id: a.id },
      service: 'customer',
      req,
    });
  }
  return { id: a.id, status: a.status };
}

module.exports = { listApplications, getApplication, review, markUnderReview };
