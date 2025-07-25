const { chromium } = require('playwright');

async function testContainerTelemetry() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🐳 Testing container telemetry features...');
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(5000); // Wait for telemetry to load
  
  // Check resource count
  const resourceCount = await page.locator('#resource-count').textContent();
  console.log(`📦 Resource count: ${resourceCount}`);
  
  // Check app count
  const appCount = await page.locator('#app-count').textContent();
  console.log(`🏢 App count: ${appCount}`);
  
  // Check for telemetry dashboard
  const telemetryDashboard = await page.locator('.telemetry-dashboard').count();
  console.log(`🎛️ Telemetry dashboard: ${telemetryDashboard > 0 ? 'Present' : 'Missing'}`);
  
  if (telemetryDashboard > 0) {
    // Check if dashboard shows demo mode
    const dashboardTitle = await page.locator('.telemetry-dashboard h3').textContent();
    console.log(`📊 Dashboard title: "${dashboardTitle}"`);
    
    // Test toggle functionality
    console.log('🔄 Testing toggle functionality...');
    
    // Click to collapse
    await page.click('#telemetry-toggle');
    await page.waitForTimeout(500);
    
    const isCollapsed = await page.locator('.telemetry-dashboard.collapsed').count();
    console.log(`📉 Dashboard collapsed: ${isCollapsed > 0}`);
    
    // Click to expand
    await page.click('#telemetry-toggle');
    await page.waitForTimeout(500);
    
    const isExpanded = await page.locator('.telemetry-dashboard.collapsed').count();
    console.log(`📈 Dashboard expanded: ${isExpanded === 0}`);
  }
  
  // Check for health status rings
  const healthRings = await page.locator('.health-status-ring').count();
  console.log(`❤️ Health status rings: ${healthRings}`);
  
  // Check if health rings have colors (not grey)
  const coloredRings = await page.evaluate(() => {
    const rings = document.querySelectorAll('.health-status-ring');
    let coloredCount = 0;
    rings.forEach(ring => {
      const stroke = window.getComputedStyle(ring).stroke;
      if (stroke !== 'rgb(108, 117, 125)' && stroke !== 'grey') { // Not grey
        coloredCount++;
      }
    });
    return { total: rings.length, colored: coloredCount };
  });
  console.log(`🎨 Colored health rings: ${coloredRings.colored}/${coloredRings.total}`);
  
  // Check for dependency links with colors
  const linkColors = await page.evaluate(() => {
    const links = document.querySelectorAll('.link');
    const colors = {};
    links.forEach(link => {
      const stroke = window.getComputedStyle(link).stroke;
      colors[stroke] = (colors[stroke] || 0) + 1;
    });
    return colors;
  });
  console.log(`🔗 Link colors:`, linkColors);
  
  // Check console for telemetry-related messages
  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.text().includes('telemetry') || msg.text().includes('mock')) {
      consoleLogs.push(msg.text());
    }
  });
  
  await page.waitForTimeout(1000);
  
  if (consoleLogs.length > 0) {
    console.log('📝 Telemetry console messages:');
    consoleLogs.forEach(log => console.log(`  - ${log}`));
  }
  
  await browser.close();
}

testContainerTelemetry().catch(console.error);