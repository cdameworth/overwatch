const { chromium } = require('playwright');

async function debugHover() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔍 Debugging hover functionality...');
  
  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
  });
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(6000);
  
  // Trigger mouseover event on first node
  const nodeCount = await page.locator('.node-group').count();
  console.log(`📊 Found ${nodeCount} nodes`);
  
  if (nodeCount > 0) {
    console.log('🖱️ Triggering mouseover on first node...');
    
    // Use JavaScript to trigger the mouseover event directly
    await page.evaluate(() => {
      const firstNode = document.querySelector('.node-group');
      if (firstNode) {
        const event = new MouseEvent('mouseover', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: 500,
          clientY: 300
        });
        firstNode.dispatchEvent(event);
        console.log('Mouseover event dispatched on node');
        
        // Check if hover card exists
        const hoverCard = document.getElementById('hover-card');
        console.log('Hover card after mouseover:', !!hoverCard);
        if (hoverCard) {
          console.log('Hover card display:', window.getComputedStyle(hoverCard).display);
          console.log('Hover card visibility:', window.getComputedStyle(hoverCard).visibility);
        }
      }
    });
    
    await page.waitForTimeout(2000);
  }
  
  // Test link hover
  const linkCount = await page.locator('.link').count();
  console.log(`🔗 Found ${linkCount} links`);
  
  if (linkCount > 0) {
    console.log('🖱️ Triggering mouseover on first link...');
    
    await page.evaluate(() => {
      const firstLink = document.querySelector('.link');
      if (firstLink) {
        const event = new MouseEvent('mouseover', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: 500,
          clientY: 300
        });
        firstLink.dispatchEvent(event);
        console.log('Mouseover event dispatched on link');
        
        // Check if tooltip exists
        const tooltip = document.getElementById('link-tooltip');
        console.log('Link tooltip after mouseover:', !!tooltip);
        if (tooltip) {
          console.log('Link tooltip display:', window.getComputedStyle(tooltip).display);
        }
      }
    });
    
    await page.waitForTimeout(2000);
  }
  
  // Show relevant console messages
  const relevantLogs = consoleLogs.filter(log => 
    log.includes('mouseover') || 
    log.includes('hover') || 
    log.includes('Hover') ||
    log.includes('card') ||
    log.includes('tooltip')
  );
  
  console.log('📝 Debug logs:');
  relevantLogs.forEach(log => console.log(`  ${log}`));
  
  await browser.close();
}

debugHover().catch(console.error);