const { chromium } = require('playwright');

async function testHoverEvent() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🎯 Testing actual hover event dispatch...');
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(6000);
  
  // Test the actual mouse events that would trigger D3 handlers
  const eventTest = await page.evaluate(() => {
    const firstLink = document.querySelector('.link');
    if (!firstLink) return null;
    
    console.log('=== EVENT TEST START ===');
    
    const initialWidth = window.getComputedStyle(firstLink).strokeWidth;
    console.log(`Initial computed width: ${initialWidth}`);
    
    // Create and dispatch mouseover event
    const mouseoverEvent = new MouseEvent('mouseover', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: 500,
      clientY: 300
    });
    
    console.log('Dispatching mouseover event...');
    const result = firstLink.dispatchEvent(mouseoverEvent);
    console.log(`Event dispatched successfully: ${result}`);
    
    // Check width after event
    setTimeout(() => {
      const hoverWidth = window.getComputedStyle(firstLink).strokeWidth;
      console.log(`Width after mouseover: ${hoverWidth}`);
      
      // Dispatch mouseout event
      const mouseoutEvent = new MouseEvent('mouseout', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      
      console.log('Dispatching mouseout event...');
      firstLink.dispatchEvent(mouseoutEvent);
      
      setTimeout(() => {
        const resetWidth = window.getComputedStyle(firstLink).strokeWidth;
        console.log(`Width after mouseout: ${resetWidth}`);
        console.log('=== EVENT TEST END ===');
      }, 100);
    }, 100);
    
    return {
      initial: initialWidth,
      eventDispatched: result
    };
  });
  
  // Wait for the async operations in the evaluate
  await page.waitForTimeout(1000);
  
  if (eventTest) {
    console.log('📊 Event test results:');
    console.log(`  Initial width: ${eventTest.initial}`);
    console.log(`  Event dispatched: ${eventTest.eventDispatched}`);
  }
  
  await browser.close();
}

testHoverEvent().catch(console.error);