const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir);

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('openDialerModal') || content.includes('Dialer')) {
      console.log(`Found in ${file}`);
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('openDialerModal') || line.includes('Dialer')) {
          console.log(`  Line ${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
