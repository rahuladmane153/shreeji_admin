const { createServer, startServer } = require('../../common/bootstrap/createServer');
const keys = require('../../common/keys/keys');
const appRoutes = require('./app/routes/app.routes');

const app = createServer({
  serviceName: 'kyc-app',
  serveUploads: true,
  routes: (router) => appRoutes(router),
});

startServer(app, keys.KYC_APP_PORT, 'kyc-app');
