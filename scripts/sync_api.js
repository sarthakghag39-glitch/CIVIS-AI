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

// Sync shared engine JS modules from canonical public/js/ to public/admin/js/ and public/user/js/
const sharedJsDir = path.join(__dirname, '..', 'public', 'js');
const adminJsDir = path.join(__dirname, '..', 'public', 'admin', 'js');
const userJsDir = path.join(__dirname, '..', 'public', 'user', 'js');
const engineFiles = ['prioritization_engine.js', 'routing_engine.js', 'clustering_engine.js'];

console.log('Syncing shared engine modules...');
if (!fs.existsSync(adminJsDir)) fs.mkdirSync(adminJsDir, { recursive: true });
if (!fs.existsSync(userJsDir)) fs.mkdirSync(userJsDir, { recursive: true });

engineFiles.forEach(file => {
  const srcFile = path.join(sharedJsDir, file);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(adminJsDir, file));
    fs.copyFileSync(srcFile, path.join(userJsDir, file));
  }
});
console.log('Shared engine modules synchronized to public/admin/js/ and public/user/js/.');
