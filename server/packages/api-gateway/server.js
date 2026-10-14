const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const keys = require('../../common/keys/keys');

const app = express();

// This gateway serves a cross-origin JSON API (the SPA runs on a different
// origin), so helmet's page-oriented defaults must be relaxed: a CSP of
// default-src 'self' and Cross-Origin-Resource-Policy: same-origin cause the
// browser to block the response even when CORS headers are correct.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(morgan('dev'));

// In development (or when no allowlist is configured) reflect any origin so the
// admin portal / mobile tooling can call the gateway from any host. In
// production only the configured CLIENT_URLS are allowed. A disallowed origin
// is rejected cleanly (no CORS headers) instead of throwing a 500 on preflight.
const allowAllOrigins = !keys.IS_PRODUCTION || keys.CLIENT_URLS.length === 0;
app.use(
  cors({
    origin: allowAllOrigins
      ? true
      : (origin, cb) => cb(null, !origin || keys.CLIENT_URLS.includes(origin)),
    credentials: true,
  })
);

app.get('/', (req, res) => res.json({ status: true, message: 'Shreeji API Gateway is running' }));
app.get('/health', (req, res) => res.json({ status: true, service: 'api-gateway' }));

/**
 * Routes are /api/<service>/<path>. The gateway strips the /api/<service>
 * prefix and proxies to the service. Auth is verified inside each service
 * (stateless JWT), so the gateway only forwards the Authorization header.
 */
app.use('/api/:service', (req, res, next) => {
  const target = keys.SERVICES[req.params.service];
  if (!target) return res.status(404).json({ status: false, message: 'Service not found' });

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^/api/${req.params.service}`]: '' },
    proxyTimeout: 60000,
    on: {
      proxyRes: (proxyRes) => {
        // Each service also sets its own CORS headers. Strip them so only the
        // gateway's single set remains - a duplicate Access-Control-Allow-Origin
        // makes the browser reject the response with a CORS error.
        delete proxyRes.headers['access-control-allow-origin'];
        delete proxyRes.headers['access-control-allow-credentials'];
        delete proxyRes.headers['access-control-allow-methods'];
        delete proxyRes.headers['access-control-allow-headers'];
        delete proxyRes.headers['access-control-expose-headers'];
      },
      error: (err, req2, res2) => {
        console.error(`[gateway] proxy error -> ${req.params.service}:`, err.message);
        if (!res2.headersSent) {
          res2.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res2.end(JSON.stringify({ status: false, message: 'Upstream service unavailable' }));
      },
    },
  })(req, res, next);
});

const PORT = keys.GATEWAY_PORT;
app.listen(PORT, () => console.log(`[api-gateway] listening on port ${PORT}`));
