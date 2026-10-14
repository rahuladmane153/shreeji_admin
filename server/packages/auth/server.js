const { createServer, startServer } = require('../../common/bootstrap/createServer');
const keys = require('../../common/keys/keys');
const authRoutes = require('./app/routes/auth.routes');

const app = createServer({
  serviceName: 'auth',
  routes: (router) => authRoutes(router),
});

startServer(app, keys.AUTH_PORT, 'auth');
