const fs = require('fs');
const content = fs.readFileSync('public/admin_dashboard.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('location') || line.includes('href') || line.includes('replace')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
