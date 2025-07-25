const { chromium } = require('playwright');

async function testLineWidths() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('📏 Testing increased dependency line widths...');
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(6000);
  
  // Check link stroke widths
  const linkDetails = await page.evaluate(() => {
    const links = document.querySelectorAll('.link');
    const details = [];
    
    links.forEach((link, index) => {
      const computedStyle = window.getComputedStyle(link);
      const crossApp = link.classList.contains('cross-app-link');
      
      details.push({
        index,
        crossApplication: crossApp,
        strokeWidth: computedStyle.strokeWidth,
        strokeColor: computedStyle.stroke,
        strokeDasharray: computedStyle.strokeDasharray,
        className: link.className
      });
    });
    
    return details;
  });
  
  console.log('🔗 Link width analysis:');
  linkDetails.forEach(link => {
    console.log(`  Link ${link.index}: ${link.crossApplication ? 'Cross-app' : 'Standard'} - Width: ${link.strokeWidth}, Color: ${link.strokeColor}`);
  });
  
  // Test hover effect on first link
  if (linkDetails.length > 0) {
    console.log('🖱️ Testing hover effect on first link...');
    
    const hoverResult = await page.evaluate(() => {
      const firstLink = document.querySelector('.link');
      if (firstLink) {
        const originalWidth = window.getComputedStyle(firstLink).strokeWidth;
        
        // Trigger mouseover
        const mouseoverEvent = new MouseEvent('mouseover', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        firstLink.dispatchEvent(mouseoverEvent);
        
        // Check width after hover
        const hoverWidth = window.getComputedStyle(firstLink).strokeWidth;
        
        // Trigger mouseout
        const mouseoutEvent = new MouseEvent('mouseout', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        firstLink.dispatchEvent(mouseoutEvent);
        
        // Check width after mouseout
        const resetWidth = window.getComputedStyle(firstLink).strokeWidth;
        
        return {
          originalWidth,
          hoverWidth,
          resetWidth,
          hoverIncrease: parseFloat(hoverWidth) > parseFloat(originalWidth)
        };
      }
      return null;
    });
    
    if (hoverResult) {
      console.log('📊 Hover effect results:');
      console.log(`  Original width: ${hoverResult.originalWidth}`);
      console.log(`  Hover width: ${hoverResult.hoverWidth}`);
      console.log(`  Reset width: ${hoverResult.resetWidth}`);
      console.log(`  Width increases on hover: ${hoverResult.hoverIncrease}`);
    }
  }
  
  // Check if tooltip appears
  const tooltipTest = await page.evaluate(() => {
    const firstLink = document.querySelector('.link');
    if (firstLink) {
      const mouseoverEvent = new MouseEvent('mouseover', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      firstLink.dispatchEvent(mouseoverEvent);
      
      // Check if tooltip exists and is visible
      const tooltip = document.getElementById('link-tooltip');
      return {
        tooltipExists: !!tooltip,
        tooltipVisible: tooltip ? window.getComputedStyle(tooltip).display !== 'none' : false
      };
    }
    return null;
  });
  
  if (tooltipTest) {
    console.log('🏷️ Tooltip functionality:');
    console.log(`  Tooltip appears: ${tooltipTest.tooltipExists && tooltipTest.tooltipVisible}`);
  }
  
  await browser.close();
}

testLineWidths().catch(console.error);