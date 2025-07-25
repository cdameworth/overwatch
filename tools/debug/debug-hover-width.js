const { chromium } = require('playwright');

async function debugHoverWidth() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔍 Debugging hover width changes...');
  
  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
  });
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(6000);
  
  // Test hover with detailed debugging
  const hoverDebug = await page.evaluate(() => {
    const firstLink = document.querySelector('.link');
    if (!firstLink) return null;
    
    console.log('=== HOVER DEBUG START ===');
    
    // Get initial state
    const initialWidth = firstLink.getAttribute('stroke-width');
    const initialComputedWidth = window.getComputedStyle(firstLink).strokeWidth;
    const isCrossApp = firstLink.classList.contains('cross-app-link');
    
    console.log(`Initial stroke-width attribute: ${initialWidth}`);
    console.log(`Initial computed width: ${initialComputedWidth}`);
    console.log(`Is cross-app link: ${isCrossApp}`);
    
    // Manually trigger onLinkMouseover logic
    const d3Event = {
      currentTarget: firstLink
    };
    
    const linkData = {
      crossApplication: isCrossApp
    };
    
    // Simulate the hover effect manually
    if (linkData.crossApplication) {
      firstLink.setAttribute('stroke-width', '8');
      firstLink.setAttribute('stroke-opacity', '1');
      console.log('Applied hover effect: width=8, opacity=1');
    } else {
      firstLink.setAttribute('stroke-width', '6');
      firstLink.setAttribute('stroke-opacity', '1');
      console.log('Applied hover effect: width=6, opacity=1');
    }
    
    const hoverWidth = firstLink.getAttribute('stroke-width');
    const hoverComputedWidth = window.getComputedStyle(firstLink).strokeWidth;
    
    console.log(`After hover stroke-width attribute: ${hoverWidth}`);
    console.log(`After hover computed width: ${hoverComputedWidth}`);
    
    // Reset
    if (linkData.crossApplication) {
      firstLink.setAttribute('stroke-width', '6');
      firstLink.setAttribute('stroke-opacity', '0.9');
    } else {
      firstLink.setAttribute('stroke-width', '4');
      firstLink.setAttribute('stroke-opacity', '0.8');
    }
    
    const resetWidth = firstLink.getAttribute('stroke-width');
    const resetComputedWidth = window.getComputedStyle(firstLink).strokeWidth;
    
    console.log(`After reset stroke-width attribute: ${resetWidth}`);
    console.log(`After reset computed width: ${resetComputedWidth}`);
    
    console.log('=== HOVER DEBUG END ===');
    
    return {
      initial: { attr: initialWidth, computed: initialComputedWidth },
      hover: { attr: hoverWidth, computed: hoverComputedWidth },
      reset: { attr: resetWidth, computed: resetComputedWidth },
      isCrossApp
    };
  });
  
  if (hoverDebug) {
    console.log('📊 Debug results:');
    console.log(`  Cross-app link: ${hoverDebug.isCrossApp}`);
    console.log(`  Initial: ${hoverDebug.initial.attr} (${hoverDebug.initial.computed})`);
    console.log(`  Hover: ${hoverDebug.hover.attr} (${hoverDebug.hover.computed})`);
    console.log(`  Reset: ${hoverDebug.reset.attr} (${hoverDebug.reset.computed})`);
  }
  
  // Show relevant console messages
  const relevantLogs = consoleLogs.filter(log => 
    log.includes('HOVER') || 
    log.includes('width') || 
    log.includes('stroke')
  );
  
  console.log('📝 Console logs:');
  relevantLogs.forEach(log => console.log(`  ${log}`));
  
  await browser.close();
}

debugHoverWidth().catch(console.error);