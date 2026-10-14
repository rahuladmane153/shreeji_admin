// PM2 process list for production / UAT.
const services = ['api-gateway', 'auth', 'kyc-app', 'customer', 'device', 'tracking', 'master'];

module.exports = {
  apps: services.map((name) => ({
    name: `shreeji-${name}`,
    script: `packages/${name}/server.js`,
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: { NODE_ENV: 'production' },
  })),
};
