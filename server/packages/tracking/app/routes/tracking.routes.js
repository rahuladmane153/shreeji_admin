const { authenticate, requireType } = require('../../../../common/middleware/authJwt');
const { attachAdmin } = require('../../../../common/middleware/attachActor');
const { validate } = require('../../../../common/middleware/validate');
const schema = require('../validator/tracking.schema');
const ctrl = require('../controllers/tracking.controller');

module.exports = (router) => {
  router.use(authenticate, requireType('admin'), attachAdmin);

  router.get('/live-map', ctrl.liveMap);
  router.get('/devices/:id/locations', ctrl.locationHistory);

  router.get('/geofences', ctrl.listGeofences);
  router.post('/geofences', validate(schema.createGeofence), ctrl.createGeofence);
  router.put('/geofences/:id', validate(schema.updateGeofence), ctrl.updateGeofence);
  router.delete('/geofences/:id', ctrl.deleteGeofence);

  router.get('/alerts', ctrl.listAlerts);
  router.post('/alerts/:id/acknowledge', ctrl.acknowledgeAlert);
};
