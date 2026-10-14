/**
 * Starts every microservice together for local development using nodemon.
 * Run with: npm run dev
 */
const concurrently = require('concurrently');
const path = require('path');

const root = path.resolve(__dirname, '../..');

const services = [
  ['gateway', 'api-gateway'],
  ['auth', 'auth'],
  ['kyc-app', 'kyc-app'],
  ['customer', 'customer'],
  ['device', 'device'],
  ['tracking', 'tracking'],
  ['master', 'master'],
];

const colors = ['cyan', 'green', 'yellow', 'magenta', 'blue', 'white', 'red'];

concurrently(
  services.map(([name, dir], i) => ({
    name,
    prefixColor: colors[i % colors.length],
    // Run each service relative to the server root; cwd avoids spaces in the
    // absolute path (e.g. "C:\Users\Rahul Admane\...") breaking the command.
    command: `node packages/${dir}/server.js`,
    cwd: root,
  })),
  { prefix: 'name', killOthers: ['failure'], restartTries: 2 }
).result.catch(() => process.exit(1));
