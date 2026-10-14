const { createServer, startServer } = require('../../common/bootstrap/createServer');
const keys = require('../../common/keys/keys');
const routes = require('./app/routes/device.routes');

const app = createServer({ serviceName: 'device', routes: (router) => routes(router) });
startServer(app, keys.DEVICE_PORT, 'device');
