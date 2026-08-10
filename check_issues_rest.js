const https = require('https');

const url = 'https://dppdyknjrryoljzzdulj.supabase.co/rest/v1/issues?select=*&order=id.desc';
const headers = {
  'apikey': 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm',
  'Authorization': 'Bearer sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm'
};

const req = https.get(url, { headers }, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const issues = JSON.parse(data);
      console.log('Issues Count:', issues.length);
      issues.forEach(issue => {
        console.log(`ID: ${issue.id} | Title: "${issue.title}" | Category: "${issue.category}" | Location: "${issue.location}" | ReportedBy: "${issue.reported_by}" | Email: "${issue.reported_by_email}" | Description: "${issue.description}"`);
      });
    } catch (e) {
      console.error('Parse error:', e, data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});
