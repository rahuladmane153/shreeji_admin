const path = require('path');
const db = require('../../../../common/database/db_connectivity/kyc_app_service');
const keys = require('../../../../common/keys/keys');
const { AppError } = require('../../../../common/_helpers/response');
const { encrypt, decrypt, sha256, maskAadhaar } = require('../../../../common/_helpers/crypto');
const { toRelativePath, sha256File } = require('../../../../common/_helpers/upload');
const { extractFromDocument } = require('../_helpers/ocr');
const { verifyDocuments, compareNames } = require('../_helpers/verify');
const { writeAudit } = require('../../../../common/_helpers/audit');
const { REQUIRED_DOC_TYPES } = require('../../../../common/config/constant.config');

const Customer = db.customers;
const Application = db.kyc_applications;
const Document = db.kyc_documents;

/** Returns the customer's in-progress application, creating one if needed. */
async function getOrCreateApplication(customerId, deviceId) {
  let app = await Application.findOne({ where: { customer_id: customerId } });
  if (!app) {
    app = await Application.create({ customer_id: customerId, device_id: deviceId || null, status: 'in_progress' });
    await Customer.update({ kyc_status: 'in_progress' }, { where: { id: customerId, kyc_status: 'not_started' } });
  }
  // A rejected application can be edited again
  if (app.status === 'rejected') {
    await app.update({ status: 'in_progress' });
  }
  return app;
}

function assertEditable(app) {
  if (!['in_progress', 'rejected'].includes(app.status)) {
    throw new AppError(409, `KYC cannot be edited while it is "${app.status}"`);
  }
}

/**
 * The full Aadhaar number is never stored in plain text: it is kept encrypted,
 * with the last 4 digits for display and a hash to compare front and back.
 */
function protectFields(fields) {
  const { aadhaar_number: number, ...rest } = fields;
  if (!number) return rest;
  return { ...rest, aadhaar_number_enc: encrypt(number), aadhaar_hash: sha256(number) };
}

/** Extracted fields per document type for an application. */
async function extractedByType(applicationId) {
  const docs = await Document.findAll({
    where: { kyc_application_id: applicationId },
    attributes: ['doc_type', 'ocr_data'],
  });
  return Object.fromEntries(docs.map((d) => [d.doc_type, d.ocr_data?.fields || {}]));
}

/** Best value for each review-form field, preferring Aadhaar over other documents. */
function buildPrefill(byType) {
  const front = byType.aadhaar_front || {};
  const back = byType.aadhaar_back || {};
  const pan = byType.pan || {};
  const proof = byType.address_proof || {};
  return {
    name: front.name || pan.name || null,
    dob: front.dob || pan.dob || null,
    gender: front.gender || null,
    address: back.address || proof.address || null,
    aadhaar_number: decrypt(front.aadhaar_number_enc || back.aadhaar_number_enc || null),
    pan_number: pan.pan_number || null,
    father_name: pan.father_name || null,
  };
}

/** Re-runs the cross-document checks and stores the result on the application. */
async function refreshVerification(app, customerId, extra = {}) {
  const customer = await Customer.findByPk(customerId, { attributes: ['full_name'] });
  const byType = await extractedByType(app.id);
  const verification = { ...verifyDocuments({ full_name: customer?.full_name }, byType), ...extra };
  await app.update({ ocr_data: verification });
  return { verification, prefill: buildPrefill(byType) };
}

async function saveDocument(customerId, deviceId, docType, file, ocrText) {
  const app = await getOrCreateApplication(customerId, deviceId);
  assertEditable(app);

  const relPath = toRelativePath(file.path);
  const fileHash = await sha256File(file.path);
  const ocr = extractFromDocument(docType, ocrText);

  // Replace an existing document of the same type
  await Document.destroy({ where: { kyc_application_id: app.id, doc_type: docType } });

  const doc = await Document.create({
    kyc_application_id: app.id,
    customer_id: customerId,
    doc_type: docType,
    file_path: relPath,
    original_name: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size,
    sha256: fileHash,
    // Raw text can contain the full Aadhaar number, so it is stored encrypted
    ocr_text: ocrText ? encrypt(ocrText) : null,
    ocr_data: { ...ocr, fields: protectFields(ocr.fields) },
  });

  const { verification, prefill } = await refreshVerification(app, customerId);

  return {
    id: doc.id,
    uuid: doc.uuid,
    doc_type: doc.doc_type,
    file_url: `/uploads/${relPath}`,
    extracted: ocr.fields,
    found: ocr.found,
    total: ocr.total,
    note: ocr.note || null,
    verification,
    prefill,
  };
}

async function saveSelfie(customerId, deviceId, file, liveness) {
  const app = await getOrCreateApplication(customerId, deviceId);
  assertEditable(app);

  const relPath = toRelativePath(file.path);
  await Document.destroy({ where: { kyc_application_id: app.id, doc_type: 'selfie' } });
  await Document.create({
    kyc_application_id: app.id,
    customer_id: customerId,
    doc_type: 'selfie',
    file_path: relPath,
    original_name: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size,
  });
  await app.update({ selfie_liveness: liveness || null, selfie_captured_at: new Date() });

  return { file_url: `/uploads/${relPath}`, selfie_captured_at: app.selfie_captured_at };
}

/** Saves the reviewed details and submits the application. */
async function reviewAndSubmit(customerId, body, req) {
  const app = await Application.findOne({ where: { customer_id: customerId } });
  if (!app) throw new AppError(400, 'Start your KYC by uploading documents first');
  assertEditable(app);

  // Ensure all required documents are present
  const docs = await Document.findAll({ where: { kyc_application_id: app.id }, attributes: ['doc_type'] });
  const present = new Set(docs.map((d) => d.doc_type));
  const missing = REQUIRED_DOC_TYPES.filter((t) => !present.has(t));
  if (missing.length) throw new AppError(400, `Missing required documents: ${missing.join(', ')}`);

  const aadhaar = body.aadhaar_number;
  await app.update({
    name_on_document: body.name_on_document || app.name_on_document,
    dob_on_document: body.dob_on_document || app.dob_on_document,
    gender_on_document: body.gender_on_document || app.gender_on_document,
    address_on_document: body.address_on_document || app.address_on_document,
    aadhaar_number_enc: aadhaar ? encrypt(aadhaar) : app.aadhaar_number_enc,
    aadhaar_last4: aadhaar ? aadhaar.slice(-4) : app.aadhaar_last4,
    pan_number: body.pan_number || app.pan_number,
    declaration_accepted: true,
    status: 'submitted',
    submitted_at: new Date(),
  });

  // Note which details the customer changed from what was read off the
  // documents, so the reviewer knows what to compare against the images.
  const prefill = buildPrefill(await extractedByType(app.id));
  const submitted = {
    name: [body.name_on_document, prefill.name],
    dob: [body.dob_on_document, prefill.dob],
    address: [body.address_on_document, prefill.address],
    aadhaar_number: [body.aadhaar_number, prefill.aadhaar_number],
    pan_number: [body.pan_number, prefill.pan_number],
  };
  const editedFields = Object.entries(submitted)
    .filter(([key, [given, read]]) => {
      if (!given || !read) return false;
      if (key === 'name') return compareNames(given, read) !== 'pass';
      const norm = (v) => String(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
      return norm(given) !== norm(read);
    })
    .map(([key]) => key);
  const { verification } = await refreshVerification(app, customerId, { edited_fields: editedFields });

  // Lands in the admin audit trail; the application itself now shows as
  // "submitted" in the admin KYC queue for verification.
  await writeAudit(db.audit_logs, {
    actor: { type: 'customer', id: customerId, name: body.name_on_document || null },
    action: 'kyc.submitted',
    entity: { type: 'kyc_application', id: app.id },
    description: `Document checks: ${verification.overall}${editedFields.length ? `; edited: ${editedFields.join(', ')}` : ''}`,
    service: 'kyc-app',
    req,
  });

  await Customer.update(
    {
      kyc_status: 'submitted',
      full_name: body.name_on_document || undefined,
      dob: body.dob_on_document || undefined,
      address: body.address_on_document || undefined,
    },
    { where: { id: customerId } }
  );

  return getStatus(customerId);
}

async function getStatus(customerId) {
  const app = await Application.findOne({
    where: { customer_id: customerId },
    include: [{ model: Document, as: 'documents', attributes: ['doc_type', 'file_path', 'ocr_data', 'createdAt'] }],
  });

  if (!app) {
    return {
      kyc_status: 'not_started',
      application: null,
      documents: [],
      required_documents: REQUIRED_DOC_TYPES,
      verification: null,
      prefill: null,
    };
  }

  const editable = ['in_progress', 'rejected'].includes(app.status);
  const byType = Object.fromEntries((app.documents || []).map((d) => [d.doc_type, d.ocr_data?.fields || {}]));

  return {
    kyc_status: app.status,
    application: {
      uuid: app.uuid,
      status: app.status,
      name_on_document: app.name_on_document,
      dob_on_document: app.dob_on_document,
      address_on_document: app.address_on_document,
      aadhaar_masked: maskAadhaar(app.aadhaar_last4),
      pan_number: app.pan_number,
      submitted_at: app.submitted_at,
      reviewed_at: app.reviewed_at,
      review_remarks: app.review_remarks,
    },
    verification: app.ocr_data || null,
    required_documents: REQUIRED_DOC_TYPES,
    documents: (app.documents || []).map((d) => ({
      doc_type: d.doc_type,
      file_url: `/uploads/${d.file_path}`,
      uploaded_at: d.createdAt,
      found: d.ocr_data?.found ?? 0,
      total: d.ocr_data?.total ?? 0,
    })),
    // Values to resume the review form with; only while the customer can still edit
    prefill: editable ? buildPrefill(byType) : null,
  };
}

module.exports = { getOrCreateApplication, saveDocument, saveSelfie, reviewAndSubmit, getStatus };
