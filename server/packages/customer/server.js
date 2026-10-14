const { createServer, startServer } = require('../../common/bootstrap/createServer');
const keys = require('../../common/keys/keys');
const routes = require('./app/routes/customer.routes');

const app = createServer({
  serviceName: 'customer',
  serveUploads: true, // admin views KYC documents through this service
  routes: (router) => routes(router),
});

startServer(app, keys.CUSTOMER_PORT, 'customer');
