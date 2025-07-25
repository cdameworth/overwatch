const { chromium } = require('playwright');

async function simpleTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔍 Testing API and visualization...');
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  // Count nodes
  const nodeCount = await page.locator('.node-group').count();
  console.log(`📊 Nodes found: ${nodeCount}`);
  
  // Check app count display
  const appCountText = await page.locator('#app-count').textContent();
  console.log(`🏢 App count display: ${appCountText}`);
  
  // Check resource count display  
  const resourceCountText = await page.locator('#resource-count').textContent();
  console.log(`📦 Resource count display: ${resourceCountText}`);
  
  await browser.close();
}

simpleTest().catch(console.error);