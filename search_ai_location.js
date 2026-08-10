const fs = require('fs');
const content = fs.readFileSync('public/ai_analysis.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('location') || line.toLowerCase().includes('input')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
