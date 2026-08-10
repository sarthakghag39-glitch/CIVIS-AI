const fs = require('fs');

['public/index.html', 'public/profile.html', 'public/app.js'].forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.toLowerCase().includes('admin')) {
    console.log(`Found in ${file}:`);
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes('admin')) {
        console.log(`  Line ${index + 1}: ${line.trim()}`);
      }
    });
  }
});
