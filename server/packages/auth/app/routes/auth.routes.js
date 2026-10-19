const { validate } = require('../../../../common/middleware/validate');
const schema = require('../validator/auth.schema');
const ctrl = require('../controllers/auth.controller');

module.exports = (router) => {
  // Admin (web)
  router.post('/admin/login', validate(schema.adminLogin), ctrl.adminLogin);
  router.post('/admin/refresh', validate(schema.refresh), ctrl.adminRefresh);
  router.post('/admin/logout', validate(schema.logout), ctrl.adminLogout);

  // Customer (mobile)
  router.post('/customer/register', validate(schema.customerRegister), ctrl.customerRegister);
  router.post('/customer/login', validate(schema.customerLogin), ctrl.customerLogin);
  router.post('/customer/refresh', validate(schema.refresh), ctrl.customerRefresh);
  router.post('/customer/logout', validate(schema.logout), ctrl.customerLogout);
};
