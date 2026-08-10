const fs = require('fs');
const content = fs.readFileSync('public/app.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('insert(') || line.includes('insert (')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
