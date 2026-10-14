const express = require('express');
const cors = require('cors');
const path = require('path');
const keys = require('../keys/keys');
const { errorHandler } = require('../middleware/errorHandler');

/**
 * Builds a configured Express app for a microservice.
 * @param {object} opts
 * @param {string} opts.serviceName
 * @param {function(express.Router): void} opts.routes  mounts the service routes
 * @param {boolean} [opts.serveUploads]  expose UPLOAD_DIR at /uploads
 */
function createServer({ serviceName, routes, serveUploads = false }) {
  const app = express();

  app.use(cors({ origin: keys.CLIENT_URLS.length ? keys.CLIENT_URLS : '*' }));
  app.use(express.json({ limit: `${keys.MAX_UPLOAD_MB + 5}mb` }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.set('trust proxy', true);

  app.get('/health', (req, res) =>
    res.json({ status: true, service: serviceName, time: new Date().toISOString() })
  );

  if (serveUploads) {
    app.use('/uploads', express.static(keys.UPLOAD_DIR));
  }

  const router = express.Router();
  routes(router);
  app.use('/', router);

  app.use((req, res) => res.status(404).json({ status: false, code: 404, message: 'Route not found' }));
  app.use(errorHandler);

  return app;
}

function startServer(app, port, serviceName) {
  return app.listen(port, () => console.log(`[${serviceName}] listening on port ${port}`));
}

module.exports = { createServer, startServer };
