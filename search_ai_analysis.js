const fs = require('fs');
const content = fs.readFileSync('public/app.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('function initAiAnalysisPage') || line.includes('initAiAnalysisPage')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
