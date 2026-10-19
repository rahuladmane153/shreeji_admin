const { authenticate, requireType } = require('../../../../common/middleware/authJwt');
const { attachAdmin } = require('../../../../common/middleware/attachActor');
const { validate } = require('../../../../common/middleware/validate');
const schema = require('../validator/customer.schema');
const ctrl = require('../controllers/customer.controller');

module.exports = (router) => {
  router.use(authenticate, requireType('admin'), attachAdmin);

  // Onboarded customers
  router.get('/customers', ctrl.listCustomers);
  router.get('/customers/:id/devices/:deviceId/contacts', validate(schema.contactsQuery, 'query'), ctrl.listDeviceContacts);
  router.get('/customers/:id', ctrl.getCustomer);
  router.post('/customers/:id/reset-password', validate(schema.resetPassword), ctrl.resetPassword);

  // KYC records / review
  router.get('/kyc', ctrl.listApplications);
  router.get('/kyc/:id', ctrl.getApplication);
  router.post('/kyc/:id/under-review', ctrl.markUnderReview);
  router.post('/kyc/:id/approve', ctrl.approve);
  router.post('/kyc/:id/reject', ctrl.reject);
};
