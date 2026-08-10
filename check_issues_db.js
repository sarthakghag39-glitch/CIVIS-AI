const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dppdyknjrryoljzzdulj.supabase.co';
const supabaseKey = 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('issues').select('*').order('id', { ascending: false });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Issues Count:', data.length);
    data.forEach(issue => {
      console.log(`ID: ${issue.id} | Title: "${issue.title}" | Category: "${issue.category}" | Location: "${issue.location}" | ReportedBy: "${issue.reported_by}" | Email: "${issue.reported_by_email}" | Description: "${issue.description}"`);
    });
  }
}

run();
