const db = require('../../../../common/database/db_connectivity/tracking_service');
const { AppError } = require('../../../../common/_helpers/response');
const { getPaging, buildMeta } = require('../../../../common/_helpers/pagination');
const { connectivity, mapBucket } = require('../../../../common/_helpers/deviceStatus');

const Device = db.devices;
const Customer = db.customers;
const Location = db.device_locations;
const Op = db.Op;

/** All devices with their last known position for the live map. */
async function liveMap() {
  const devices = await Device.findAll({
    include: [{ model: Customer, as: 'customer', attributes: ['id', 'full_name', 'mobile'] }],
  });

  const markers = devices
    .filter((d) => d.last_latitude != null && d.last_longitude != null)
    .map((d) => ({
      id: d.id,
      device_code: d.device_code,
      customer_name: d.customer?.full_name || null,
      mobile: d.customer?.mobile || null,
      status: d.status,
      bucket: mapBucket(d),
      connectivity: connectivity(d),
      battery_level: d.battery_level,
      latitude: Number(d.last_latitude),
      longitude: Number(d.last_longitude),
      last_seen: d.last_seen,
    }));

  const summary = { active: 0, locked: 0, disabled: 0, offline: 0 };
  devices.forEach((d) => {
    summary[mapBucket(d)] += 1;
  });

  return { total: devices.length, summary, markers };
}

async function locationHistory(deviceId, query) {
  const { page, limit, offset } = getPaging(query, { defaultLimit: 100, maxLimit: 1000 });
  const where = { device_id: deviceId };
  if (query.from || query.to) {
    where.recorded_at = {};
    if (query.from) where.recorded_at[Op.gte] = new Date(query.from);
    if (query.to) where.recorded_at[Op.lte] = new Date(query.to);
  }

  const { rows, count } = await Location.findAndCountAll({
    where,
    order: [['recorded_at', 'DESC']],
    limit,
    offset,
  });

  return {
    items: rows.map((l) => ({
      latitude: Number(l.latitude),
      longitude: Number(l.longitude),
      accuracy: l.accuracy,
      speed: l.speed,
      battery_level: l.battery_level,
      recorded_at: l.recorded_at,
      is_offline_sync: l.is_offline_sync,
    })),
    meta: buildMeta(count, page, limit),
  };
}

// ---- Geofences ----
async function listGeofences() {
  const rows = await db.geofences.findAll({ order: [['created_at', 'DESC']] });
  return rows.map((g) => ({
    id: g.id,
    uuid: g.uuid,
    name: g.name,
    description: g.description,
    center_latitude: Number(g.center_latitude),
    center_longitude: Number(g.center_longitude),
    radius_meters: g.radius_meters,
    alert_on: g.alert_on,
    device_id: g.device_id,
    is_active: g.is_active,
  }));
}

async function createGeofence(body, admin) {
  const g = await db.geofences.create({ ...body, created_by: admin.id });
  return { id: g.id, uuid: g.uuid };
}

async function updateGeofence(id, body) {
  const g = await db.geofences.findByPk(id);
  if (!g) throw new AppError(404, 'Geofence not found');
  await g.update(body);
  return { id: g.id };
}

async function deleteGeofence(id) {
  const n = await db.geofences.destroy({ where: { id } });
  if (!n) throw new AppError(404, 'Geofence not found');
  return { id };
}

// ---- Alerts ----
async function listAlerts(query) {
  const { page, limit, offset } = getPaging(query);
  const where = {};
  if (query.unacknowledged === 'true') where.acknowledged_at = null;

  const { rows, count } = await db.geofence_alerts.findAndCountAll({
    where,
    include: [
      { model: db.geofences, as: 'geofence', attributes: ['name'] },
      { model: Device, as: 'device', attributes: ['device_code'] },
      { model: Customer, as: 'customer', attributes: ['full_name', 'mobile'] },
    ],
    order: [['recorded_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    items: rows.map((a) => ({
      id: a.id,
      event: a.event,
      geofence: a.geofence?.name,
      device_code: a.device?.device_code,
      customer_name: a.customer?.full_name,
      mobile: a.customer?.mobile,
      latitude: Number(a.latitude),
      longitude: Number(a.longitude),
      recorded_at: a.recorded_at,
      acknowledged_at: a.acknowledged_at,
    })),
    meta: buildMeta(count, page, limit),
  };
}

async function acknowledgeAlert(id, admin) {
  const a = await db.geofence_alerts.findByPk(id);
  if (!a) throw new AppError(404, 'Alert not found');
  await a.update({ acknowledged_by: admin.id, acknowledged_at: new Date() });
  return { id: a.id };
}

module.exports = {
  liveMap,
  locationHistory,
  listGeofences,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  listAlerts,
  acknowledgeAlert,
};
