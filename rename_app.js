const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace CityAI and City AI with CIVIS AI
  let updated = false;
  
  if (content.includes('CityAI')) {
    content = content.replace(/CityAI/g, 'CIVIS AI');
    updated = true;
  }
  if (content.includes('City AI')) {
    content = content.replace(/City AI/g, 'CIVIS AI');
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated name in ${file}`);
  }
});
