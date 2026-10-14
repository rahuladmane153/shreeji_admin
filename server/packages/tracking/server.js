const { createServer, startServer } = require('../../common/bootstrap/createServer');
const keys = require('../../common/keys/keys');
const routes = require('./app/routes/tracking.routes');

const app = createServer({ serviceName: 'tracking', routes: (router) => routes(router) });
startServer(app, keys.TRACKING_PORT, 'tracking');
