const { chromium } = require('playwright');

async function testCompleteDockerWorkflow() {
  console.log('🐳 TESTING COMPLETE DOCKER WORKFLOW');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  let networkRequests = [];
  
  // Monitor all network activity
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      networkRequests.push({
        type: 'REQUEST',
        method: request.method(),
        url: request.url(),
        timestamp: Date.now(),
        body: request.method() === 'POST' ? request.postData() : null
      });
      console.log(`📤 ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/')) {
      networkRequests.push({
        type: 'RESPONSE',
        url: response.url(),
        status: response.status(),
        ok: response.ok(),
        timestamp: Date.now()
      });
      console.log(`📥 ${response.status()} ${response.url()}`);
    }
  });

  page.on('requestfailed', request => {
    if (request.url().includes('/api/')) {
      networkRequests.push({
        type: 'FAILED',
        method: request.method(),
        url: request.url(),
        error: request.failure()?.errorText,
        timestamp: Date.now()
      });
      console.log(`💥 FAILED ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().toLowerCase().includes('fetch') || msg.text().toLowerCase().includes('failed')) {
      console.log(`🔴 ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });

  try {
    // Step 1: Access Docker frontend
    console.log('\n📋 Step 1: Accessing Docker frontend...');
    await page.goto('http://localhost:5000', { timeout: 15000 });
    await page.waitForSelector('.sidebar', { timeout: 10000 });
    console.log('✅ Docker frontend loaded');

    // Step 2: Select GitHub data source
    console.log('\n📋 Step 2: Selecting GitHub data source...');
    await page.selectOption('#data-source-selector', 'github');
    await page.waitForSelector('#github-config', { visible: true });
    console.log('✅ GitHub config visible');

    // Step 3: Wait for connections
    console.log('\n📋 Step 3: Loading GitHub connections...');
    await page.waitForTimeout(5000);
    
    const connectionOptions = await page.locator('#github-connection option').allTextContents();
    console.log('Connections:', connectionOptions);

    if (connectionOptions.includes('Error loading connections')) {
      throw new Error('GitHub connections failed to load');
    }

    // Step 4: Select personal account
    console.log('\n📋 Step 4: Selecting personal account...');
    await page.selectOption('#github-connection', 'cdameworth-personal');
    await page.waitForSelector('#github-repo-row', { visible: true });
    console.log('✅ Repository row visible');

    // Step 5: Wait for repositories
    console.log('\n📋 Step 5: Loading repositories...');
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-repo-select');
      return select && select.options.length > 1;
    }, { timeout: 15000 });

    const repoOptions = await page.locator('#github-repo-select option').allTextContents();
    console.log('Repositories:', repoOptions);

    if (!repoOptions.some(opt => opt.includes('stock-analytics-engine'))) {
      throw new Error('stock-analytics-engine not found');
    }

    // Step 6: Select repository
    console.log('\n📋 Step 6: Selecting stock-analytics-engine...');
    await page.selectOption('#github-repo-select', 'stock-analytics-engine');
    await page.waitForSelector('#github-branch-row', { visible: true });
    await page.waitForSelector('#load-github-repo', { visible: true });

    const branch = await page.inputValue('#github-branch');
    console.log(`✅ Repository selected, branch: ${branch}`);

    // Step 7: Load repository - THE CRITICAL STEP
    console.log('\n📋 Step 7: LOADING REPOSITORY (CRITICAL TEST)...');
    console.log('🔍 Starting intensive monitoring...');
    
    const beforeClick = networkRequests.length;
    
    // Click the Load Repository button
    await page.click('#load-github-repo');
    console.log('🖱️ Load Repository button clicked');

    // Monitor loading state
    const loadingVisible = await page.locator('#loading-overlay').isVisible();
    console.log(`Loading overlay visible: ${loadingVisible}`);

    if (loadingVisible) {
      console.log('⏳ Loading started, waiting for completion...');
      
      try {
        await page.waitForSelector('#loading-overlay', { hidden: true, timeout: 60000 });
        console.log('✅ Loading completed');
      } catch (timeout) {
        console.log('⚠️ Loading timed out');
        
        // Force hide loading to see current state
        await page.evaluate(() => {
          const overlay = document.querySelector('#loading-overlay');
          if (overlay) overlay.style.display = 'none';
        });
      }
    } else {
      console.log('❌ Loading overlay never appeared');
    }

    // Step 8: Check results
    console.log('\n📋 Step 8: Checking results...');
    await page.waitForTimeout(5000);

    const errorToasts = await page.locator('.toast.toast-error').allTextContents();
    const successToasts = await page.locator('.toast.toast-success').allTextContents();
    
    if (errorToasts.length > 0) {
      console.log('❌ ERRORS:');
      errorToasts.forEach((text, i) => {
        console.log(`   ${i + 1}. ${text.trim()}`);
        if (text.toLowerCase().includes('failed to fetch')) {
          console.log('🎯 "Failed to fetch" error confirmed');
        }
      });
    }

    if (successToasts.length > 0) {
      console.log('✅ SUCCESS MESSAGES:');
      successToasts.forEach((text, i) => {
        console.log(`   ${i + 1}. ${text.trim()}`);
      });
    }

    // Check if graph was rendered
    const nodeCount = await page.locator('#graph .node-group').count();
    const resourceCount = await page.locator('#resource-count').textContent();
    
    console.log(`Graph nodes: ${nodeCount}`);
    console.log(`Resource count: ${resourceCount}`);

    // Step 9: Analyze network activity during load
    console.log('\n📋 Step 9: Analyzing network activity during load...');
    const loadRequests = networkRequests.slice(beforeClick);
    
    console.log(`Network requests during load: ${loadRequests.length}`);
    loadRequests.forEach((req, i) => {
      if (req.type === 'REQUEST') {
        console.log(`  ${i + 1}. 📤 ${req.method} ${req.url}`);
        if (req.body && req.url.includes('parse-github-connection')) {
          console.log(`     Body: ${req.body}`);
        }
      } else if (req.type === 'RESPONSE') {
        console.log(`  ${i + 1}. 📥 ${req.status} ${req.url}`);
      } else if (req.type === 'FAILED') {
        console.log(`  ${i + 1}. 💥 ${req.method} ${req.url} - ${req.error}`);
      }
    });

    // Look for parse requests specifically
    const parseRequests = loadRequests.filter(r => r.url && r.url.includes('parse-github-connection'));
    console.log(`\nParse requests: ${parseRequests.length}`);
    
    if (parseRequests.length === 0) {
      console.log('❌ NO parse-github-connection requests found!');
    } else {
      parseRequests.forEach(req => {
        console.log(`- ${req.type}: ${req.method || ''} ${req.url}`);
        if (req.status) console.log(`  Status: ${req.status}`);
        if (req.error) console.log(`  Error: ${req.error}`);
      });
    }

    await page.screenshot({ path: 'docker-complete-test.png', fullPage: true });
    console.log('📸 Screenshot saved');

    // Final verdict
    console.log('\n🎯 FINAL VERDICT');
    console.log('='.repeat(30));
    
    const hasErrors = errorToasts.length > 0;
    const hasSuccess = successToasts.length > 0;
    const hasNodes = nodeCount > 0;
    const failedRequests = loadRequests.filter(r => r.type === 'FAILED').length;
    
    if (hasSuccess && hasNodes && failedRequests === 0) {
      console.log('🎉 DOCKER WORKFLOW WORKING PERFECTLY!');
    } else if (hasErrors) {
      console.log('❌ DOCKER WORKFLOW FAILING');
      if (errorToasts.some(t => t.includes('Failed to fetch'))) {
        console.log('💡 Issue: API connectivity problems');
      } else {
        console.log('💡 Issue: Backend processing errors');
      }
    } else if (failedRequests > 0) {
      console.log('❌ DOCKER WORKFLOW FAILING');
      console.log('💡 Issue: Network request failures');
    } else {
      console.log('❓ DOCKER WORKFLOW STATUS UNCLEAR');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testCompleteDockerWorkflow().catch(console.error);