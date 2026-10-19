const db = require('../../../../common/database/db_connectivity/device_service');
const { AppError } = require('../../../../common/_helpers/response');
const { getPaging, buildMeta } = require('../../../../common/_helpers/pagination');
const { connectivity, mapBucket } = require('../../../../common/_helpers/deviceStatus');
const { writeAudit } = require('../../../../common/_helpers/audit');
const { parseContactPhones } = require('../../../../common/_helpers/contactPhones');

const Device = db.devices;
const Customer = db.customers;
const Command = db.device_commands;
const Op = db.Op;

function serialize(d) {
  return {
    id: d.id,
    device_id: d.device_id,
    device_code: d.device_code,
    customer: d.customer ? { id: d.customer.id, full_name: d.customer.full_name, mobile: d.customer.mobile } : null,
    device_model: d.device_model,
    manufacturer: d.manufacturer,
    os_version: d.os_version,
    app_version: d.app_version,
    status: d.status,
    connectivity: connectivity(d),
    map_bucket: mapBucket(d),
    uninstall_protection: d.uninstall_protection,
    battery_level: d.battery_level,
    is_charging: d.is_charging,
    network_type: d.network_type,
    last_latitude: d.last_latitude != null ? Number(d.last_latitude) : null,
    last_longitude: d.last_longitude != null ? Number(d.last_longitude) : null,
    last_seen: d.last_seen,
    registered_at: d.registered_at,
  };
}

async function listDevices(query) {
  const { page, limit, offset } = getPaging(query);
  const where = {};
  if (query.status) where.status = query.status;

  const customerInclude = {
    model: Customer,
    as: 'customer',
    attributes: ['id', 'full_name', 'mobile'],
  };
  if (query.search) {
    where[Op.or] = [
      { device_code: { [Op.like]: `%${query.search}%` } },
      { device_model: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Device.findAndCountAll({
    where,
    include: [customerInclude],
    order: [['last_seen', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { items: rows.map(serialize), meta: buildMeta(count, page, limit) };
}

async function getDevice(id) {
  const d = await Device.findByPk(id, { include: [{ model: Customer, as: 'customer' }] });
  if (!d) throw new AppError(404, 'Device not found');
  const contacts = await db.device_contact_snapshots.findAll({
    where: { device_id: d.id },
    attributes: ['contact_id', 'display_name', 'phones', 'synced_at'],
    order: [['display_name', 'ASC']],
  });
  return {
    ...serialize(d),
    contacts: contacts.map((contact) => ({
      contact_id: contact.contact_id,
      display_name: contact.display_name,
      phones: parseContactPhones(contact.phones),
      synced_at: contact.synced_at,
    })),
    contacts_synced_at: contacts[0]?.synced_at ?? null,
  };
}

async function getStats() {
  const all = await Device.findAll({ attributes: ['status', 'last_seen'] });
  const stats = { total: all.length, active: 0, locked: 0, disabled: 0, offline: 0 };
  all.forEach((d) => {
    stats[mapBucket(d)] += 1;
  });
  return stats;
}

/**
 * Queues a command for the device agent and optimistically reflects the
 * intended state so the admin UI updates immediately.
 */
async function issueCommand(id, { command, reason, payload }, admin, req) {
  const device = await Device.findByPk(id);
  if (!device) throw new AppError(404, 'Device not found');

  const cmd = await Command.create({
    device_id: device.id,
    command,
    reason: reason || null,
    payload: payload || null,
    issued_by: admin.id,
    status: 'pending',
  });

  // Optimistic device state changes (confirmed later by the agent's result)
  const effects = {
    lock: { status: 'locked', admin_active: true },
    unlock: { status: 'active' },
    disable: { status: 'disabled' },
    enable: { status: 'active' },
    release: { status: 'released', uninstall_protection: false },
    allow_uninstall: { uninstall_protection: false },
    block_uninstall: { uninstall_protection: true },
    revoke: { status: 'revoked', uninstall_protection: false },
  };
  if (effects[command]) await device.update(effects[command]);

  await writeAudit(db.audit_logs, {
    actor: { type: 'admin', id: admin.id, name: admin.name },
    action: `device.${command}`,
    entity: { type: 'device', id: device.id },
    description: reason,
    service: 'device',
    req,
  });

  return { command_uuid: cmd.uuid, command, device_status: device.status, uninstall_protection: device.uninstall_protection };
}

async function commandHistory(id) {
  const device = await Device.findByPk(id);
  if (!device) throw new AppError(404, 'Device not found');
  const commands = await Command.findAll({ where: { device_id: device.id }, order: [['id', 'DESC']], limit: 50 });
  return commands.map((c) => ({
    uuid: c.uuid,
    command: c.command,
    status: c.status,
    reason: c.reason,
    result_message: c.result_message,
    issued_at: c.createdAt,
    delivered_at: c.delivered_at,
    executed_at: c.executed_at,
  }));
}

module.exports = { listDevices, getDevice, getStats, issueCommand, commandHistory };
