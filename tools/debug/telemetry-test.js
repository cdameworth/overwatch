const { chromium } = require('playwright');

async function telemetryTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('💾 Testing telemetry features...');
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(5000); // Wait longer for telemetry to load
  
  // Check for telemetry dashboard
  const telemetryDashboard = await page.locator('.telemetry-dashboard').count();
  console.log(`🎛️ Telemetry dashboard present: ${telemetryDashboard > 0}`);
  
  // Check for health status rings
  const healthRings = await page.locator('.health-status-ring').count();
  console.log(`❤️ Health status rings: ${healthRings}`);
  
  // Check for health indicators in dashboard
  const healthIndicators = await page.locator('.health-indicator').count();
  console.log(`🟢 Health indicators: ${healthIndicators}`);
  
  // Check if there are any colored dependency lines
  const coloredLinks = await page.evaluate(() => {
    const links = document.querySelectorAll('.link');
    let coloredCount = 0;
    links.forEach(link => {
      const stroke = window.getComputedStyle(link).stroke;
      if (stroke !== 'rgb(222, 226, 230)') { // Not the default gray
        coloredCount++;
      }
    });
    return { total: links.length, colored: coloredCount };
  });
  console.log(`🔗 Links: ${coloredLinks.total} total, ${coloredLinks.colored} with health colors`);
  
  await browser.close();
}

telemetryTest().catch(console.error);