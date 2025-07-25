const { chromium } = require('playwright');

async function simpleTelemetryTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🧪 Simple telemetry test...');
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(6000); // Wait longer for full load
  
  // Check basic counts
  const resourceCount = await page.locator('#resource-count').textContent();
  const appCount = await page.locator('#app-count').textContent();
  console.log(`📊 ${resourceCount}, ${appCount}`);
  
  // Check health rings count
  const healthRings = await page.locator('.health-status-ring').count();
  console.log(`❤️ Health rings: ${healthRings}`);
  
  // Check if any health rings have non-grey colors
  const healthRingColors = await page.evaluate(() => {
    const rings = document.querySelectorAll('.health-status-ring');
    const colors = {};
    rings.forEach((ring, index) => {
      const stroke = window.getComputedStyle(ring).stroke;
      colors[`ring${index}`] = stroke;
    });
    return colors;
  });
  
  // Count non-grey rings
  const nonGreyRings = Object.values(healthRingColors).filter(color => 
    !color.includes('108, 117, 125') && // not grey
    !color.includes('grey') && 
    color !== 'none'
  ).length;
  
  console.log(`🎨 Non-grey health rings: ${nonGreyRings}/${healthRings}`);
  
  // Check telemetry dashboard
  const dashboardExists = await page.locator('.telemetry-dashboard').count() > 0;
  console.log(`🎛️ Dashboard exists: ${dashboardExists}`);
  
  if (dashboardExists) {
    const dashboardTitle = await page.locator('.telemetry-dashboard h3').textContent();
    console.log(`📋 Dashboard: "${dashboardTitle}"`);
  }
  
  await browser.close();
}

simpleTelemetryTest().catch(console.error);