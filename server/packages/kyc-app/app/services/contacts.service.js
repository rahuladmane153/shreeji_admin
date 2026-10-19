const { randomUUID } = require('crypto');
const db = require('../../../../common/database/db_connectivity/kyc_app_service');
const { AppError } = require('../../../../common/_helpers/response');

const MAX_DB_BATCH_BYTES = 512 * 1024;

function chunkRows(rows) {
  const batches = [];
  let batch = [];
  let batchBytes = 0;

  for (const row of rows) {
    const rowBytes =
      Buffer.byteLength(row.contact_id, 'utf8') +
      Buffer.byteLength(row.display_name, 'utf8') +
      Buffer.byteLength(JSON.stringify(row.phones), 'utf8') +
      (row.photo?.length ?? 0) +
      512;
    if (batch.length && batchBytes + rowBytes > MAX_DB_BATCH_BYTES) {
      batches.push(batch);
      batch = [];
      batchBytes = 0;
    }
    batch.push(row);
    batchBytes += rowBytes;
  }

  if (batch.length) batches.push(batch);
  return batches;
}

async function saveDeviceContacts(customerId, deviceId, contacts) {
  const device = await db.devices.findOne({ where: { id: deviceId, customer_id: customerId } });
  if (!device || device.status === 'revoked') throw new AppError(404, 'Registered device not found');

  const syncId = randomUUID();
  const syncedAt = new Date();
  const rows = contacts.map((contact) => ({
    customer_id: customerId,
    device_id: device.id,
    contact_id: contact.contact_id,
    display_name: contact.display_name,
    phones: contact.phones,
    photo: contact.photo_base64 ? Buffer.from(contact.photo_base64, 'base64') : null,
    sync_id: syncId,
    synced_at: syncedAt,
  }));

  for (const batch of chunkRows(rows)) {
    await db.device_contact_snapshots.bulkCreate(batch, {
      updateOnDuplicate: ['display_name', 'phones', 'photo', 'sync_id', 'synced_at', 'updated_at'],
    });
  }

  await db.device_contact_snapshots.destroy({
    where: {
      customer_id: customerId,
      device_id: device.id,
      sync_id: { [db.Op.ne]: syncId },
    },
  });

  return { device_id: device.id, customer_id: customerId, contact_count: rows.length, synced_at: syncedAt };
}

async function getDeviceContacts(customerId, deviceId, { offset = 0, limit = 50 } = {}) {
  const device = await db.devices.findOne({ where: { id: deviceId, customer_id: customerId } });
  if (!device || device.status === 'revoked') throw new AppError(404, 'Registered device not found');

  const where = { customer_id: customerId, device_id: device.id };
  const [total, rows] = await Promise.all([
    db.device_contact_snapshots.count({ where }),
    db.device_contact_snapshots.findAll({
      where,
      attributes: ['contact_id', 'display_name', 'phones', 'synced_at'],
      order: [['display_name', 'ASC'], ['contact_id', 'ASC']],
      offset,
      limit,
    }),
  ]);

  return { total, offset, limit, contacts: rows };
}

module.exports = { saveDeviceContacts, getDeviceContacts };