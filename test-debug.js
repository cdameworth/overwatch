const { chromium } = require('playwright');

async function debugGitHubConnections() {
  console.log('🔍 Debugging GitHub connections...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    await page.goto('http://127.0.0.1:51254');
    await page.waitForSelector('.sidebar', { timeout: 10000 });

    // Select GitHub Repository
    await page.selectOption('#data-source-selector', 'github');
    await page.waitForSelector('#github-config', { visible: true });

    // Wait a bit for connections to load
    await page.waitForTimeout(3000);

    // Check what's in the dropdown
    const connectionOptions = await page.locator('#github-connection option').allTextContents();
    console.log('Connection options:', connectionOptions);

    // Check console errors
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      console.log(`Console ${msg.type()}: ${msg.text()}`);
    });

    // Check network errors
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`Network error: ${response.status()} ${response.url()}`);
      }
    });

    // Wait a bit more and check again
    await page.waitForTimeout(5000);
    
    const updatedOptions = await page.locator('#github-connection option').allTextContents();
    console.log('Updated options:', updatedOptions);

    // Take screenshot
    await page.screenshot({ path: 'debug-github.png', fullPage: true });
    console.log('Screenshot saved as debug-github.png');

    // Keep browser open for inspection
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugGitHubConnections().catch(console.error);