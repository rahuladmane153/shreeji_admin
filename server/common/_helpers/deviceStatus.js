const keys = require('../keys/keys');

/**
 * Derives the connectivity state shown on the live map.
 * A device is "offline" if it has not been seen within the threshold.
 */
function connectivity(device) {
  if (!device.last_seen) return 'offline';
  const ageMin = (Date.now() - new Date(device.last_seen).getTime()) / 60000;
  return ageMin <= keys.DEVICE_OFFLINE_AFTER_MINUTES ? 'online' : 'offline';
}

/**
 * The marker colour bucket for the admin map:
 *  active+online -> active, locked -> locked, disabled -> disabled, else offline
 */
function mapBucket(device) {
  const online = connectivity(device) === 'online';
  if (device.status === 'locked') return 'locked';
  if (device.status === 'disabled') return 'disabled';
  if (!online) return 'offline';
  return 'active';
}

module.exports = { connectivity, mapBucket };
