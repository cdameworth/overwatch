const { chromium } = require('playwright');

async function quickTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 Testing current application state...');
  
  // Navigate to the application
  await page.goto('http://localhost:3000');
  
  // Wait for the application to load
  await page.waitForTimeout(3000);
  
  // Check for nodes in the graph
  const nodes = await page.locator('.node-group').count();
  console.log(`📊 Found ${nodes} nodes in the graph`);
  
  // Check API response
  const apiResponse = await page.evaluate(async () => {
    const response = await fetch('/api/parse?useDatabase=true');
    const data = await response.json();
    return {
      apps: data.apps?.length || 0,
      resourceTypes: Object.keys(data.resources?.resource || {}),
      totalResources: Object.values(data.resources?.resource || {}).reduce((total, typeResources) => total + Object.keys(typeResources).length, 0)
    };
  });
  
  console.log('🔗 API Response:', apiResponse);
  
  // Check for telemetry dashboard
  const telemetryDashboard = await page.locator('.telemetry-dashboard').count();
  console.log(`💾 Telemetry dashboard present: ${telemetryDashboard > 0}`);
  
  // Check for health indicators
  const healthIndicators = await page.locator('.health-status-ring').count();
  console.log(`❤️ Health status rings: ${healthIndicators}`);
  
  // Check console for any errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  await page.waitForTimeout(1000);
  
  if (consoleErrors.length > 0) {
    console.log('❌ Console Errors:');
    consoleErrors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('✅ No console errors detected');
  }
  
  await browser.close();
}

quickTest().catch(console.error);