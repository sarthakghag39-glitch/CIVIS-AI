const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir);

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("from('issues')") || content.includes('from("issues")')) {
      console.log(`Found in ${file}`);
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes("from('issues')") || line.includes('from("issues")')) {
          console.log(`  Line ${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
