const db = require('../../../../common/database/db_connectivity/kyc_app_service');
const { AppError } = require('../../../../common/_helpers/response');
const { isInside } = require('../../../../common/_helpers/geo');

const Device = db.devices;
const Heartbeat = db.device_heartbeats;
const Location = db.device_locations;
const Command = db.device_commands;
const Geofence = db.geofences;
const GeofenceAlert = db.geofence_alerts;
const Consent = db.consent_logs;

/** Registers or updates a device for the authenticated customer. */
async function registerDevice(customerId, body) {
  const [device, created] = await Device.findOrCreate({
    where: { customer_id: customerId, android_id: body.android_id },
    defaults: { customer_id: customerId, ...body, last_seen: new Date() },
  });

  if (!created) {
    await device.update({
      device_model: body.device_model ?? device.device_model,
      manufacturer: body.manufacturer ?? device.manufacturer,
      os_version: body.os_version ?? device.os_version,
      sdk_int: body.sdk_int ?? device.sdk_int,
      app_version: body.app_version ?? device.app_version,
      fcm_token: body.fcm_token ?? device.fcm_token,
      last_seen: new Date(),
    });
  }

  return {
    id: device.id,
    device_id: device.device_id,
    device_code: device.device_code,
    status: device.status,
    uninstall_protection: device.uninstall_protection,
    registered_at: device.registered_at,
    is_new: created,
  };
}

/** Whether this phone (by android_id) is registered to the customer. */
async function deviceStatus(customerId, androidId) {
  const device = androidId
    ? await Device.findOne({ where: { customer_id: customerId, android_id: androidId } })
    : null;
  if (!device || device.status === 'revoked') return { registered: false, device: null };
  return {
    registered: true,
    device: {
      id: device.id,
      device_id: device.device_id,
      device_code: device.device_code,
      status: device.status,
      uninstall_protection: device.uninstall_protection,
      registered_at: device.registered_at,
      last_seen: device.last_seen,
    },
  };
}

async function getCustomerDevice(customerId, deviceId) {
  const device = await Device.findOne({ where: { id: deviceId, customer_id: customerId } });
  if (!device) throw new AppError(404, 'Device not found');
  return device;
}

async function heartbeat(customerId, deviceId, body) {
  const device = await getCustomerDevice(customerId, deviceId);
  await Heartbeat.create({ device_id: device.id, ...body });
  await device.update({
    battery_level: body.battery_level ?? device.battery_level,
    is_charging: body.is_charging ?? device.is_charging,
    network_type: body.network_type ?? device.network_type,
    app_version: body.app_version ?? device.app_version,
    last_seen: new Date(),
  });
  return { status: device.status, admin_active: device.admin_active };
}

/** Evaluates geofences for a point and records enter/exit alerts. */
async function evaluateGeofences(device, customerId, point) {
  const fences = await Geofence.findAll({
    where: { is_active: true, [db.Op.or]: [{ device_id: null }, { device_id: device.id }] },
  });
  if (!fences.length) return;

  // Previous position to detect transitions
  const prev =
    device.last_latitude != null && device.last_longitude != null
      ? { lat: Number(device.last_latitude), lng: Number(device.last_longitude) }
      : null;

  for (const fence of fences) {
    const nowInside = isInside(point.latitude, point.longitude, fence);
    const wasInside = prev ? isInside(prev.lat, prev.lng, fence) : null;
    let event = null;
    if (wasInside === null) {
      event = null; // no baseline yet
    } else if (!wasInside && nowInside) {
      event = 'enter';
    } else if (wasInside && !nowInside) {
      event = 'exit';
    }

    if (event && (fence.alert_on === 'both' || fence.alert_on === event)) {
      await GeofenceAlert.create({
        geofence_id: fence.id,
        device_id: device.id,
        customer_id: customerId,
        event,
        latitude: point.latitude,
        longitude: point.longitude,
        recorded_at: point.recorded_at,
      });
    }
  }
}

async function ingestLocations(customerId, deviceId, points, { offlineSync = false } = {}) {
  const device = await getCustomerDevice(customerId, deviceId);

  // Sort chronologically so transitions evaluate in order
  const sorted = [...points].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

  const rows = sorted.map((p) => ({
    device_id: device.id,
    customer_id: customerId,
    latitude: p.latitude,
    longitude: p.longitude,
    accuracy: p.accuracy ?? null,
    altitude: p.altitude ?? null,
    speed: p.speed ?? null,
    heading: p.heading ?? null,
    battery_level: p.battery_level ?? null,
    recorded_at: p.recorded_at,
    is_offline_sync: offlineSync,
  }));
  await Location.bulkCreate(rows);

  // Geofence evaluation only for live (not backfilled) points
  if (!offlineSync) {
    for (const p of sorted) {
      // eslint-disable-next-line no-await-in-loop
      await evaluateGeofences(device, customerId, p);
      device.last_latitude = p.latitude;
      device.last_longitude = p.longitude;
    }
  }

  const last = sorted[sorted.length - 1];
  await device.update({
    last_latitude: last.latitude,
    last_longitude: last.longitude,
    last_location_at: last.recorded_at,
    last_seen: new Date(),
    battery_level: last.battery_level ?? device.battery_level,
  });

  return { accepted: rows.length };
}

/** Returns pending admin commands for the device and marks them delivered. */
async function pollCommands(customerId, deviceId) {
  const device = await getCustomerDevice(customerId, deviceId);
  const commands = await Command.findAll({
    where: { device_id: device.id, status: 'pending' },
    order: [['id', 'ASC']],
  });

  await Promise.all(
    commands.map((c) => c.update({ status: 'delivered', delivered_at: new Date() }))
  );

  return {
    device_status: device.status,
    uninstall_protection: device.uninstall_protection,
    commands: commands.map((c) => ({ uuid: c.uuid, command: c.command, payload: c.payload })),
  };
}

async function reportCommandResult(customerId, deviceId, commandUuid, { status, result_message }) {
  const device = await getCustomerDevice(customerId, deviceId);
  const command = await Command.findOne({ where: { uuid: commandUuid, device_id: device.id } });
  if (!command) throw new AppError(404, 'Command not found');

  await command.update({ status, result_message, executed_at: new Date() });

  // Reflect executed state on the device
  if (status === 'executed') {
    const map = {
      lock: { status: 'locked' },
      unlock: { status: 'active' },
      disable: { status: 'disabled' },
      enable: { status: 'active' },
      release: { status: 'released', uninstall_protection: false },
      allow_uninstall: { uninstall_protection: false },
      block_uninstall: { uninstall_protection: true },
      revoke: { status: 'revoked', uninstall_protection: false },
    };
    if (map[command.command]) await device.update(map[command.command]);
  }
  return { message: 'Command result recorded' };
}

async function recordConsents(customerId, deviceId, { consents, app_version }, req) {
  const rows = consents.map((c) => ({
    customer_id: customerId,
    device_id: deviceId || null,
    consent_type: c.consent_type,
    accepted: c.accepted,
    consent_version: c.consent_version || null,
    app_version: app_version || null,
    ip_address: req?.ip || null,
  }));
  await Consent.bulkCreate(rows);
  return { recorded: rows.length };
}

module.exports = {
  registerDevice,
  deviceStatus,
  getCustomerDevice,
  heartbeat,
  ingestLocations,
  pollCommands,
  reportCommandResult,
  recordConsents,
};
