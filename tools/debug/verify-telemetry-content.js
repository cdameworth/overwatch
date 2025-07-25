const { chromium } = require('playwright');

async function verifyTelemetryContent() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('✅ Verifying telemetry content in hover elements...');
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(6000);
  
  // Trigger node hover and check content
  await page.evaluate(() => {
    const firstNode = document.querySelector('.node-group');
    if (firstNode) {
      const event = new MouseEvent('mouseover', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      firstNode.dispatchEvent(event);
    }
  });
  
  await page.waitForTimeout(1000);
  
  // Check node hover card content
  const nodeHoverExists = await page.locator('#hover-card').count();
  if (nodeHoverExists > 0) {
    const nodeContent = await page.locator('#hover-card').innerHTML();
    
    console.log('📊 NODE HOVER CARD ANALYSIS:');
    console.log(`  Has Application Health: ${nodeContent.includes('Application Health')}`);
    console.log(`  Has Demo indicator: ${nodeContent.includes('Demo')}`);
    console.log(`  Has Response Time: ${nodeContent.includes('Response Time')}`);
    console.log(`  Has Throughput: ${nodeContent.includes('Throughput')}`);
    console.log(`  Has Error Rate: ${nodeContent.includes('Error Rate')}`);
    console.log(`  Has health dot indicator: ${nodeContent.includes('border-radius: 50%')}`);
    
    // Extract health status if present
    const healthMatch = nodeContent.match(/background: (#[a-fA-F0-9]{6})/);
    if (healthMatch) {
      console.log(`  Health color: ${healthMatch[1]}`);
    }
  } else {
    console.log('❌ Node hover card not found');
  }
  
  // Trigger link hover and check content
  await page.evaluate(() => {
    const firstLink = document.querySelector('.link');
    if (firstLink) {
      const event = new MouseEvent('mouseover', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      firstLink.dispatchEvent(event);
    }
  });
  
  await page.waitForTimeout(1000);
  
  // Check link tooltip content
  const linkTooltipExists = await page.locator('#link-tooltip').count();
  if (linkTooltipExists > 0) {
    const linkContent = await page.locator('#link-tooltip').innerHTML();
    
    console.log('🔗 LINK TOOLTIP ANALYSIS:');
    console.log(`  Has Connection Health: ${linkContent.includes('Connection Health')}`);
    console.log(`  Has Demo indicator: ${linkContent.includes('Demo')}`);
    console.log(`  Has Latency: ${linkContent.includes('Latency')}`);
    console.log(`  Has Packet Loss: ${linkContent.includes('Packet Loss')}`);
    console.log(`  Has Jitter: ${linkContent.includes('Jitter')}`);
    console.log(`  Has Source/Target breakdown: ${linkContent.includes('Source:') && linkContent.includes('Target:')}`);
    console.log(`  Has health dot indicator: ${linkContent.includes('border-radius: 50%')}`);
    
    // Extract connection health color if present
    const healthMatch = linkContent.match(/background: (#[a-fA-F0-9]{6})/);
    if (healthMatch) {
      console.log(`  Connection health color: ${healthMatch[1]}`);
    }
  } else {
    console.log('❌ Link tooltip not found');
  }
  
  await browser.close();
}

verifyTelemetryContent().catch(console.error);