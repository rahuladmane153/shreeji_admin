const db = require('../../../../common/database/db_connectivity/kyc_app_service');
const { AppError } = require('../../../../common/_helpers/response');
const { REQUIRED_DOC_TYPES } = require('../../../../common/config/constant.config');
const { deviceStatus } = require('./device.service');
const { quoteOfTheDay } = require('../_helpers/quotes');

const Customer = db.customers;
const Application = db.kyc_applications;
const Document = db.kyc_documents;

/** Everything the mobile dashboard shows, in one call. */
async function getDashboard(customerId, androidId) {
  const customer = await Customer.findByPk(customerId, {
    attributes: ['id', 'full_name', 'mobile', 'kyc_status', 'createdAt'],
  });
  if (!customer) throw new AppError(404, 'Customer not found');

  const app = await Application.findOne({
    where: { customer_id: customerId },
    include: [{ model: Document, as: 'documents', attributes: ['doc_type'] }],
  });
  const uploaded = new Set((app?.documents || []).map((d) => d.doc_type));

  return {
    customer: { full_name: customer.full_name, mobile: customer.mobile, member_since: customer.createdAt },
    kyc: {
      status: app?.status || customer.kyc_status,
      submitted_at: app?.submitted_at || null,
      reviewed_at: app?.reviewed_at || null,
      review_remarks: app?.review_remarks || null,
      verification: app?.ocr_data?.overall || null,
      required_documents: REQUIRED_DOC_TYPES,
      uploaded_documents: REQUIRED_DOC_TYPES.filter((t) => uploaded.has(t)),
      // The customer can (re)start the KYC flow only in these states
      can_continue: !app || ['in_progress', 'rejected'].includes(app.status),
    },
    device: await deviceStatus(customerId, androidId),
    quote: quoteOfTheDay(),
  };
}

module.exports = { getDashboard };
