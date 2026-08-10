const fs = require('fs');
const path = require('path');

function searchInDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') searchInDir(filePath);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.html') || filePath.endsWith('.md')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.toLowerCase().includes('dialer') || content.toLowerCase().includes('open_dialer') || content.toLowerCase().includes('mockcall')) {
        console.log(`Found in: ${filePath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes('dialer') || line.toLowerCase().includes('open_dialer') || line.toLowerCase().includes('mockcall')) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

searchInDir('./');
