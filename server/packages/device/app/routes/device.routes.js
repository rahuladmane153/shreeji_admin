const { authenticate, requireType } = require('../../../../common/middleware/authJwt');
const { attachAdmin } = require('../../../../common/middleware/attachActor');
const { validate } = require('../../../../common/middleware/validate');
const schema = require('../validator/device.schema');
const ctrl = require('../controllers/device.controller');

module.exports = (router) => {
  router.use(authenticate, requireType('admin'), attachAdmin);

  router.get('/devices', ctrl.list);
  router.get('/devices/stats', ctrl.stats);
  router.get('/devices/:id', ctrl.get);
  router.get('/devices/:id/commands', ctrl.commandHistory);
  router.post('/devices/:id/commands', validate(schema.issueCommand), ctrl.issueCommand);
};
