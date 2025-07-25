const { chromium } = require('playwright');

async function testCORSFix() {
  console.log('🧪 Testing CORS fix for stock-analytics-engine...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitor network for CORS errors
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('CORS')) {
      console.log('❌ CORS ERROR:', msg.text());
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/') && !response.ok()) {
      console.log(`❌ API Error: ${response.status()} ${response.url()}`);
    } else if (response.url().includes('/api/')) {
      console.log(`✅ API Success: ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Navigate to the application
    await page.goto('http://127.0.0.1:51254');
    await page.waitForSelector('.sidebar', { timeout: 10000 });
    console.log('✅ Application loaded');

    // Select GitHub Repository
    await page.selectOption('#data-source-selector', 'github');
    await page.waitForSelector('#github-config', { visible: true });
    console.log('✅ GitHub config visible');

    // Wait for connections to load
    await page.waitForTimeout(3000);
    
    const connectionOptions = await page.locator('#github-connection option').allTextContents();
    console.log('Connection options:', connectionOptions);

    if (!connectionOptions.includes('Error loading connections')) {
      console.log('🎉 CORS FIX SUCCESSFUL! Connections loaded properly');
      
      // Try to select personal account and load repository
      const hasPersonalAccount = connectionOptions.some(opt => opt.includes('Personal Account') || opt.includes('cdameworth'));
      
      if (hasPersonalAccount) {
        console.log('✅ Personal account found, testing repository loading...');
        
        await page.selectOption('#github-connection', 'cdameworth-personal');
        await page.waitForSelector('#github-repo-row', { visible: true, timeout: 5000 });
        
        await page.waitForFunction(() => {
          const select = document.querySelector('#github-repo-select');
          return select && select.options.length > 1;
        }, { timeout: 10000 });
        
        const repoOptions = await page.locator('#github-repo-select option').allTextContents();
        console.log('Repository options:', repoOptions);
        
        if (repoOptions.some(opt => opt.includes('stock-analytics-engine'))) {
          console.log('✅ stock-analytics-engine found! Testing load...');
          
          await page.selectOption('#github-repo-select', 'stock-analytics-engine');
          await page.waitForSelector('#load-github-repo', { visible: true });
          
          const branchValue = await page.inputValue('#github-branch');
          console.log('Branch:', branchValue);
          
          // Load the repository
          await page.click('#load-github-repo');
          await page.waitForSelector('#loading-overlay', { visible: true });
          console.log('⏳ Loading started...');
          
          await page.waitForSelector('#loading-overlay', { hidden: true, timeout: 45000 });
          console.log('✅ Loading completed');
          
          // Check results
          const successToast = await page.locator('.toast.toast-success').isVisible({ timeout: 5000 });
          const errorToast = await page.locator('.toast.toast-error').isVisible({ timeout: 5000 });
          
          if (successToast) {
            const successText = await page.locator('.toast.toast-success').textContent();
            console.log('🎉 SUCCESS:', successText);
            
            const nodeCount = await page.locator('#graph .node-group').count();
            const resourceCount = await page.locator('#resource-count').textContent();
            console.log(`📊 Graph rendered with ${nodeCount} nodes, ${resourceCount}`);
            
          } else if (errorToast) {
            const errorText = await page.locator('.toast.toast-error').textContent();
            console.log('❌ ERROR:', errorText);
            
            if (errorText.includes('Failed to fetch')) {
              console.log('❌ CORS issue still present');
            } else {
              console.log('✅ CORS fixed, but other error occurred');
            }
          }
        }
      }
    } else {
      console.log('❌ CORS issue still present - connections failed to load');
    }

    // Keep browser open for 5 seconds
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testCORSFix().catch(console.error);