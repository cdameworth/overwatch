const { chromium } = require('playwright');

async function testDependencyLines() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔗 Testing dependency line coloring...');
  
  await page.goto('http://localhost:5000');
  await page.waitForTimeout(6000);
  
  // Check for dependency links
  const linkCount = await page.locator('.link').count();
  console.log(`🔗 Dependency links found: ${linkCount}`);
  
  if (linkCount > 0) {
    // Get all link colors and styles
    const linkDetails = await page.evaluate(() => {
      const links = document.querySelectorAll('.link');
      const details = [];
      
      links.forEach((link, index) => {
        const computedStyle = window.getComputedStyle(link);
        details.push({
          index,
          stroke: computedStyle.stroke,
          strokeWidth: computedStyle.strokeWidth,
          strokeDasharray: computedStyle.strokeDasharray,
          opacity: computedStyle.strokeOpacity || computedStyle.opacity
        });
      });
      
      return details;
    });
    
    console.log('🎨 Link styling details:');
    linkDetails.forEach(link => {
      console.log(`  Link ${link.index}: color=${link.stroke}, width=${link.strokeWidth}, dash=${link.strokeDasharray}`);
    });
    
    // Count colored vs default links
    const defaultColor = 'rgb(222, 226, 230)'; // border-color CSS variable
    const coloredLinks = linkDetails.filter(link => link.stroke !== defaultColor);
    console.log(`🌈 Colored links: ${coloredLinks.length}/${linkCount}`);
  }
  
  await browser.close();
}

testDependencyLines().catch(console.error);