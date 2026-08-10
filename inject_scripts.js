const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if app.js is already injected to avoid duplication
  if (!content.includes('src="app.js"')) {
    content = content.replace('</body>', '<script src="app.js"></script></body>');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Injected app.js into ${file}`);
  } else {
    console.log(`app.js already present in ${file}`);
  }
});
