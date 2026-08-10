const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Inject Supabase JS CDN inside <head> if not already present
  if (!content.includes('supabase-js')) {
    content = content.replace('</head>', '  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n</head>');
    fs.writeFileSync(filePath, content);
    console.log(`Injected Supabase script into ${file}`);
  } else {
    console.log(`Supabase script already present in ${file}`);
  }
});
