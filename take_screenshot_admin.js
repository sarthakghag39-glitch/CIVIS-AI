const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless'],
    defaultViewport: { width: 1440, height: 900 }
  });
  
  const publicDir = path.join(__dirname, 'public');
  const artifactDir = 'C:\\Users\\sarth\\.gemini\\antigravity\\brain\\34873cc1-f75f-4c90-9f51-e77167bec5d7';
  
  const t = Date.now();
  const item = { url: 'http://localhost:3000/admin_dashboard.html', file: 'admin_dashboard.png' };

  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  console.log(`Navigating to ${item.url}?t=${t}...`);
  try {
    await page.goto(`${item.url}?t=${t}`, { waitUntil: 'networkidle0', timeout: 30000 });
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
  await browser.close();
  console.log('Screenshots complete!');
})();
