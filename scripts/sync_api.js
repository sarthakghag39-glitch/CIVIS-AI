// Build script: Sync primary api/ directory to public/api/ and public/user/api/
const fs = require('fs');
const path = require('path');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const rootApi = path.join(__dirname, '..', 'api');
const publicApi = path.join(__dirname, '..', 'public', 'api');
const publicUserApi = path.join(__dirname, '..', 'public', 'user', 'api');

console.log('Syncing API endpoints...');
copyDirRecursive(rootApi, publicApi);
copyDirRecursive(rootApi, publicUserApi);
console.log('API endpoints successfully synchronized across root, public/, and public/user/.');
