const { createServer, startServer } = require('../../common/bootstrap/createServer');
const keys = require('../../common/keys/keys');
const routes = require('./app/routes/master.routes');

const app = createServer({ serviceName: 'master', routes: (router) => routes(router) });
startServer(app, keys.MASTER_PORT, 'master');
