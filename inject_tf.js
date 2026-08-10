const fs = require('fs');
const path = require('path');

const aiAnalysisPath = path.join(__dirname, 'public', 'ai_analysis.html');
let content = fs.readFileSync(aiAnalysisPath, 'utf8');

// Inject TF.js and MobileNet in the head if not present
if (!content.includes('tfjs')) {
  content = content.replace('</head>', '  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>\n  <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet"></script>\n</head>');
  fs.writeFileSync(aiAnalysisPath, content);
  console.log('Injected TensorFlow.js and MobileNet into ai_analysis.html');
} else {
  console.log('TensorFlow.js already present in ai_analysis.html');
}
