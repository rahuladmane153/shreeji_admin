const db = require('../../../../common/database/db_connectivity/master_service');
const { getPaging, buildMeta } = require('../../../../common/_helpers/pagination');
const { mapBucket } = require('../../../../common/_helpers/deviceStatus');

async function dashboard() {
  const [customers, devices, applications] = await Promise.all([
    db.customers.findAll({ attributes: ['kyc_status', 'status'] }),
    db.devices.findAll({ attributes: ['status', 'last_seen'] }),
    db.kyc_applications.findAll({ attributes: ['status'] }),
  ]);

  const kyc = { not_started: 0, in_progress: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0 };
  customers.forEach((c) => {
    kyc[c.kyc_status] = (kyc[c.kyc_status] || 0) + 1;
  });

  const deviceBuckets = { active: 0, locked: 0, disabled: 0, offline: 0 };
  devices.forEach((d) => {
    deviceBuckets[mapBucket(d)] += 1;
  });

  return {
    customers: {
      total: customers.length,
      active: customers.filter((c) => c.status === 'active').length,
      blocked: customers.filter((c) => c.status === 'blocked').length,
    },
    kyc: {
      ...kyc,
      pending_review: kyc.submitted + kyc.under_review,
    },
    devices: {
      total: devices.length,
      ...deviceBuckets,
    },
  };
}

async function auditLogs(query) {
  const { page, limit, offset } = getPaging(query);
  const where = {};
  if (query.actor_type) where.actor_type = query.actor_type;
  if (query.action) where.action = query.action;

  const { rows, count } = await db.audit_logs.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    items: rows.map((l) => ({
      id: l.id,
      actor_type: l.actor_type,
      actor_name: l.actor_name,
      action: l.action,
      entity_type: l.entity_type,
      entity_id: l.entity_id,
      description: l.description,
      service: l.service,
      ip_address: l.ip_address,
      created_at: l.createdAt,
    })),
    meta: buildMeta(count, page, limit),
  };
}

module.exports = { dashboard, auditLogs };
