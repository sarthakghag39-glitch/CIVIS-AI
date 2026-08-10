const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const mapping = {
  'Home': 'index.html',
  'arrow_back': 'index.html',
  'Map': 'smart_map.html',
  'map': 'smart_map.html',
  'Smart Map': 'smart_map.html',
  'Dashboard': 'admin_dashboard.html',
  'dashboard': 'admin_dashboard.html',
  'Admin': 'admin_dashboard.html',
  'AI Analysis': 'ai_analysis.html',
  'analytics': 'ai_analysis.html',
  'Emergency': 'emergency.html',
  'emergency': 'emergency.html',
  'Complaints': 'my_complaints.html',
  'My Complaints': 'my_complaints.html',
  'assignment': 'my_complaints.html',
  'Alerts': 'my_complaints.html',
  'notifications': 'my_complaints.html',
  'See all': 'my_complaints.html',
  'Profile': 'profile.html',
  'person': 'profile.html',
  'Settings': 'profile.html'
};

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/<a([^>]*?)href="#"([^>]*?)>([\s\S]*?)<\/a>/g, (match, before, after, inner) => {
    let newHref = '#';
    for (const [key, value] of Object.entries(mapping)) {
      if (inner.includes(key)) {
        newHref = value;
        break;
      }
    }
    return `<a${before}href="${newHref}"${after}>${inner}</a>`;
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Processed ${file}`);
});
