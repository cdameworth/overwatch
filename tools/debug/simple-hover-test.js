const { chromium } = require('playwright');

async function simpleHoverTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🧪 Simple hover test...');
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(6000);
  
  // First, collapse the telemetry dashboard to get it out of the way
  const dashboardExists = await page.locator('#telemetry-toggle').count();
  if (dashboardExists > 0) {
    console.log('📊 Collapsing telemetry dashboard...');
    try {
      await page.click('#telemetry-toggle', { timeout: 2000 });
      await page.waitForTimeout(500);
      console.log('✅ Dashboard collapsed');
    } catch (e) {
      console.log('⚠️ Could not collapse dashboard:', e.message);
    }
  }
  
  // Check basic counts
  const nodeCount = await page.locator('.node-group').count();
  const linkCount = await page.locator('.link').count();
  console.log(`📊 Found ${nodeCount} nodes and ${linkCount} links`);
  
  // Test if we can interact with a node by clicking it
  if (nodeCount > 0) {
    try {
      // Get the position of the first node
      const firstNode = page.locator('.node-group').first();
      const box = await firstNode.boundingBox();
      
      if (box) {
        console.log(`🎯 First node position: ${box.x}, ${box.y}`);
        
        // Try to trigger mouseover event directly
        await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
        await page.waitForTimeout(1000);
        
        // Check if hover card appeared
        const hoverCardVisible = await page.locator('#hover-card').isVisible().catch(() => false);
        console.log(`💳 Hover card visible: ${hoverCardVisible}`);
        
        if (hoverCardVisible) {
          const content = await page.locator('#hover-card').innerHTML();
          const hasTelemetry = content.includes('Application Health');
          console.log(`📊 Contains telemetry: ${hasTelemetry}`);
        }
      }
    } catch (e) {
      console.log('❌ Error testing node hover:', e.message);
    }
  }
  
  // Test link hover by triggering mouseover event
  if (linkCount > 0) {
    try {
      console.log('🔗 Testing link hover...');
      
      // Get the first link and try to hover
      const firstLink = page.locator('.link').first();
      await firstLink.hover({ timeout: 5000 });
      await page.waitForTimeout(1000);
      
      const linkTooltipVisible = await page.locator('#link-tooltip').isVisible().catch(() => false);
      console.log(`🏷️ Link tooltip visible: ${linkTooltipVisible}`);
      
      if (linkTooltipVisible) {
        const content = await page.locator('#link-tooltip').innerHTML();
        const hasTelemetry = content.includes('Connection Health');
        console.log(`📡 Contains connection telemetry: ${hasTelemetry}`);
      }
    } catch (e) {
      console.log('❌ Error testing link hover:', e.message);
    }
  }
  
  await browser.close();
}

simpleHoverTest().catch(console.error);