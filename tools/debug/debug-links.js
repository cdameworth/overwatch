const { chromium } = require('playwright');

async function debugLinks() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔍 Debugging link health coloring...');
  
  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
  });
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(8000); // Wait for full load and processing
  
  // Filter for relevant console messages
  const relevantLogs = consoleLogs.filter(log => 
    log.includes('Enhancing') || 
    log.includes('Link') || 
    log.includes('telemetry') ||
    log.includes('Cross-app') ||
    log.includes('Intra-app') ||
    log.includes('debug')
  );
  
  console.log('📝 Debug logs:');
  relevantLogs.forEach(log => console.log(`  ${log}`));
  
  await browser.close();
}

debugLinks().catch(console.error);