const { chromium } = require('playwright');

async function testHoverTelemetry() {
  const browser = await chromium.launch({ headless: false }); // Show browser for visual inspection
  const page = await browser.newPage();
  
  console.log('🖱️ Testing hover telemetry functionality...');
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(6000); // Wait for full load
  
  console.log('✅ Page loaded, testing node hover...');
  
  // Test node hover functionality
  const nodeCount = await page.locator('.node-group').count();
  console.log(`📊 Found ${nodeCount} nodes to test`);
  
  if (nodeCount > 0) {
    // Hover over the first node
    await page.locator('.node-group').first().hover();
    await page.waitForTimeout(1000);
    
    // Check if hover card appeared
    const hoverCard = await page.locator('#hover-card').count();
    console.log(`💳 Node hover card appeared: ${hoverCard > 0}`);
    
    if (hoverCard > 0) {
      // Check if telemetry section is present
      const hoverCardContent = await page.locator('#hover-card').innerHTML();
      const hasTelemetry = hoverCardContent.includes('Application Health') || hoverCardContent.includes('Demo');
      console.log(`📊 Node hover card contains telemetry: ${hasTelemetry}`);
      
      if (hasTelemetry) {
        console.log('✅ Node telemetry metrics are working!');
      }
    }
    
    // Move mouse away to hide node hover card
    await page.mouse.move(100, 100);
    await page.waitForTimeout(500);
  }
  
  console.log('🔗 Testing link hover...');
  
  // Test link hover functionality
  const linkCount = await page.locator('.link').count();
  console.log(`🔗 Found ${linkCount} links to test`);
  
  if (linkCount > 0) {
    // Hover over the first link
    await page.locator('.link').first().hover();
    await page.waitForTimeout(1000);
    
    // Check if link tooltip appeared
    const linkTooltip = await page.locator('#link-tooltip').count();
    console.log(`🏷️ Link tooltip appeared: ${linkTooltip > 0}`);
    
    if (linkTooltip > 0) {
      // Check if telemetry section is present
      const tooltipContent = await page.locator('#link-tooltip').innerHTML();
      const hasTelemetry = tooltipContent.includes('Connection Health') || tooltipContent.includes('Demo');
      console.log(`📡 Link tooltip contains telemetry: ${hasTelemetry}`);
      
      if (hasTelemetry) {
        console.log('✅ Link telemetry metrics are working!');
        
        // Check for specific metrics
        const hasLatency = tooltipContent.includes('Latency');
        const hasPacketLoss = tooltipContent.includes('Packet Loss');
        const hasJitter = tooltipContent.includes('Jitter');
        
        console.log(`📊 Link metrics present - Latency: ${hasLatency}, Packet Loss: ${hasPacketLoss}, Jitter: ${hasJitter}`);
      }
    }
  }
  
  console.log('🎯 Test completed. Browser will remain open for 10 seconds for visual inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
}

testHoverTelemetry().catch(console.error);