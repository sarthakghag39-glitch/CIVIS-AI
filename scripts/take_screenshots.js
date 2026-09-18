const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const urls = [
  { url: 'http://localhost:3000/index.html', file: 'home.png' },
  { url: 'http://localhost:3000/smart_map.html', file: 'smart_map.png' },
  { url: 'http://localhost:3000/admin_dashboard.html', file: 'admin_dashboard.png' },
  { url: 'http://localhost:3000/ai_analysis.html', file: 'ai_analysis.png' },
  { url: 'http://localhost:3000/emergency.html', file: 'emergency.png' },
  { url: 'http://localhost:3000/my_complaints.html', file: 'my_complaints.png' },
  { url: 'http://localhost:3000/profile.html', file: 'profile.png' }
];

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless'],
    defaultViewport: { width: 1440, height: 900 }
  });
  
  const publicDir = path.join(__dirname, 'public');
  const artifactDir = 'C:\\Users\\sarth\\.gemini\\antigravity\\brain\\34873cc1-f75f-4c90-9f51-e77167bec5d7';
  
  // Use a cache-busting timestamp
  const t = Date.now();

  for (const item of urls) {
    const page = await browser.newPage();
    // Disable cache in the page
    await page.setCacheEnabled(false);
    console.log(`Navigating to ${item.url}?t=${t}...`);
    try {
      await page.goto(`${item.url}?t=${t}`, { waitUntil: 'networkidle0', timeout: 30000 });
      // Wait for Tailwind CDN to apply (wait for a body class or just an explicit 5 seconds)
      await new Promise(r => setTimeout(r, 5000));
      
      const outputPath = path.join(publicDir, item.file);
      await page.screenshot({ path: outputPath, fullPage: true });
      console.log(`Screenshot saved to ${outputPath}`);
      
      const artifactPath = path.join(artifactDir, item.file);
      fs.copyFileSync(outputPath, artifactPath);
      console.log(`Screenshot copied to ${artifactPath}`);
    } catch (err) {
      console.error(`Error taking screenshot of ${item.url}:`, err);
    }
    await page.close();
  }

  await browser.close();
  console.log('Screenshots complete!');
})();
