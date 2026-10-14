/**
 * Installs node_modules for the root (shared common/ deps + tooling) and for
 * every microservice individually. Run with: npm run install-all
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const serverRoot = path.resolve(__dirname, '../..');
const packagesDir = path.join(serverRoot, 'packages');

function install(dir, label) {
  console.log(`\n==================== Installing: ${label} ====================`);
  execSync('npm install', { cwd: dir, stdio: 'inherit' });
}

// 1. Root (shared common/ code resolves its third-party deps from here)
install(serverRoot, 'root (common)');

// 2. Each microservice
fs.readdirSync(packagesDir)
  .filter((name) => fs.existsSync(path.join(packagesDir, name, 'package.json')))
  .forEach((name) => install(path.join(packagesDir, name), name));

console.log('\n✅ All dependencies installed.');
