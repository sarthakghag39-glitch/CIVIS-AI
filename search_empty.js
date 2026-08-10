const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir);

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.statSync(filePath).isFile() && (file.endsWith('.js') || file.endsWith('.html'))) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('EMPTY') || content.includes('empty')) {
      console.log(`Found in ${file}`);
      // Find line numbers
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('EMPTY') || line.includes('empty')) {
          console.log(`  Line ${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
