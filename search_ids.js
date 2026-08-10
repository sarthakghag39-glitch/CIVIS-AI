const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir);

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.statSync(filePath).isFile() && file.endsWith('.html')) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('form-title')) {
      console.log(`Found form-title in ${file}`);
    }
  }
});
