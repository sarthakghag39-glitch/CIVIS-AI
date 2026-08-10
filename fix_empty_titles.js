const https = require('https');

const supabaseUrl = 'https://dppdyknjrryoljzzdulj.supabase.co';
const apiKey = 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm';

const headers = {
  'apikey': apiKey,
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Fetch issues first
const getUrl = `${supabaseUrl}/rest/v1/issues?select=*`;

const reqGet = https.get(getUrl, { headers }, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', async () => {
    try {
      const issues = JSON.parse(data);
      console.log(`Fetched ${issues.length} issues.`);
      
      for (const issue of issues) {
        let needsUpdate = false;
        const updates = {};
        
        if (!issue.title || issue.title.trim() === '') {
          needsUpdate = true;
          const category = issue.category || 'Road Damage';
          if (category === 'Water Leakage') updates.title = 'Water Pipe Leakage';
          else if (category === 'Garbage') updates.title = 'Overflowing Waste Bin';
          else if (category === 'Streetlights') updates.title = 'Streetlight Malfunction';
          else updates.title = 'Road Pothole Damage';
        }
        
        if (!issue.category || issue.category.trim() === '') {
          needsUpdate = true;
          updates.category = 'Road Damage';
        }
        
        if (!issue.location || issue.location.trim() === '') {
          needsUpdate = true;
          updates.location = 'Pune City';
        }
        
        if (!issue.description || issue.description.trim() === '') {
          needsUpdate = true;
          const category = updates.category || issue.category || 'Road Damage';
          if (category === 'Water Leakage') updates.description = 'Subsurface pipe fracture causing water accumulation.';
          else if (category === 'Garbage') updates.description = 'Accumulated street litter and overflowing garbage bin.';
          else if (category === 'Streetlights') updates.description = 'Non-functional overhead street lighting fixture.';
          else updates.description = 'Structural cavity detected in asphalt road surface.';
        }

        if (needsUpdate) {
          console.log(`Updating Issue ID ${issue.id}...`);
          await updateIssue(issue.id, updates);
        }
      }
      console.log('Database cleanup completed!');
    } catch (e) {
      console.error('Failed to parse get response:', e);
    }
  });
});

function updateIssue(id, updates) {
  return new Promise((resolve) => {
    const patchUrl = `${supabaseUrl}/rest/v1/issues?id=eq.${id}`;
    const reqPatch = https.request(patchUrl, {
      method: 'PATCH',
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`Issue ID ${id} updated successfully:`, updates);
        resolve();
      });
    });
    reqPatch.on('error', (err) => {
      console.error(`Error updating ID ${id}:`, err);
      resolve();
    });
    reqPatch.write(JSON.stringify(updates));
    reqPatch.end();
  });
}
