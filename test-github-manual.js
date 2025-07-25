const { chromium } = require('playwright');

async function testGitHubConnections() {
  console.log('🧪 Testing GitHub Repository Data Source...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('📍 Navigating to application...');
    await page.goto('http://127.0.0.1:51254');
    
    // Wait for the application to load
    await page.waitForSelector('.sidebar', { timeout: 10000 });
    console.log('✅ Application loaded');

    // Select GitHub Repository from data source dropdown
    console.log('🔄 Selecting GitHub Repository data source...');
    await page.selectOption('#data-source-selector', 'github');
    
    // Wait for GitHub config section to appear
    await page.waitForSelector('#github-config', { visible: true, timeout: 5000 });
    console.log('✅ GitHub config section appeared');

    // Wait for connections to load
    console.log('⏳ Waiting for GitHub connections to load...');
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-connection');
      return select && select.options.length > 1 && 
             !select.options[0].textContent.includes('Loading connections');
    }, { timeout: 15000 });
    
    // Get connection options
    const connectionOptions = await page.locator('#github-connection option').allTextContents();
    console.log('✅ Connections loaded:', connectionOptions);

    // Select a connection
    console.log('🔄 Selecting Personal Account connection...');
    await page.selectOption('#github-connection', 'cdameworth-personal');
    
    // Wait for repository row to appear
    await page.waitForSelector('#github-repo-row', { visible: true, timeout: 5000 });
    console.log('✅ Repository selection appeared');

    // Wait for repositories to load
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-repo-select');
      return select && select.options.length > 1;
    }, { timeout: 10000 });
    
    // Get repository options
    const repoOptions = await page.locator('#github-repo-select option').allTextContents();
    console.log('✅ Repositories loaded:', repoOptions);

    // Select repository
    console.log('🔄 Selecting stock-analytics-engine repository...');
    await page.selectOption('#github-repo-select', 'stock-analytics-engine');
    
    // Wait for branch row and load button to appear
    await page.waitForSelector('#github-branch-row', { visible: true, timeout: 5000 });
    await page.waitForSelector('#load-github-repo', { visible: true, timeout: 5000 });
    console.log('✅ Branch input and load button appeared');

    // Check branch value
    const branchValue = await page.inputValue('#github-branch');
    console.log('✅ Default branch set to:', branchValue);

    // Click load repository button
    console.log('🚀 Loading repository...');
    await page.click('#load-github-repo');
    
    // Wait for loading to start
    await page.waitForSelector('#loading-overlay', { visible: true, timeout: 5000 });
    console.log('⏳ Loading started...');
    
    // Wait for loading to finish
    await page.waitForSelector('#loading-overlay', { hidden: true, timeout: 30000 });
    console.log('✅ Loading completed');

    // Check for success toast
    try {
      await page.waitForSelector('.toast.toast-success', { visible: true, timeout: 10000 });
      const toastText = await page.locator('.toast.toast-success').textContent();
      console.log('✅ Success toast:', toastText);
    } catch (e) {
      console.log('⚠️ No success toast found');
    }

    // Check if graph is rendered
    try {
      await page.waitForSelector('#graph svg', { visible: true, timeout: 5000 });
      console.log('✅ Graph SVG rendered');
      
      // Count nodes
      const nodeCount = await page.locator('#graph .node-group').count();
      console.log('✅ Nodes rendered:', nodeCount);
      
      // Check resource count
      const resourceCountText = await page.locator('#resource-count').textContent();
      console.log('✅ Resource count:', resourceCountText);
      
    } catch (e) {
      console.log('❌ Graph not rendered:', e.message);
    }

    console.log('🎉 Test completed successfully!');
    
    // Keep browser open for inspection
    console.log('Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take screenshot on failure
    await page.screenshot({ path: 'test-failure.png' });
    console.log('📸 Screenshot saved as test-failure.png');
    
    // Keep browser open longer on failure
    await page.waitForTimeout(5000);
  } finally {
    await browser.close();
  }
}

testGitHubConnections().catch(console.error);