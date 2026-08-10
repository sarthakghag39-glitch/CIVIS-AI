const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all <nav>...</nav>
  const matches = content.match(/<nav[\s\S]*?<\/nav>/g);
  if (matches) {
    console.log(`=== File: ${file} ===`);
    matches.forEach(nav => {
      // Find all hrefs inside this nav
      const hrefs = nav.match(/href="([^"]*?)"/g);
      console.log(nav.substring(0, 150) + '...');
      console.log('Hrefs found:', hrefs);
    });
  }
});
