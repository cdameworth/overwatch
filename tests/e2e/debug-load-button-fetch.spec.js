const { test, expect } = require('@playwright/test');

test.describe('Debug Load Repository Button Failed to Fetch', () => {
  let networkRequests = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Clear logs
    networkRequests = [];
    consoleMessages = [];

    // Comprehensive network monitoring
    page.on('request', request => {
      const requestData = {
        type: 'REQUEST',
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        body: null,
        timestamp: new Date().toISOString()
      };
      
      // Capture POST body for API calls
      if (request.method() === 'POST' && request.url().includes('/api/')) {
        try {
          requestData.body = request.postData();
        } catch (e) {
          requestData.body = 'Unable to capture body';
        }
      }
      
      networkRequests.push(requestData);
      console.log(`📤 ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      networkRequests.push({
        type: 'RESPONSE',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      });

      if (!response.ok() && response.url().includes('/api/')) {
        console.log(`❌ ${response.status()} ${response.statusText()} - ${response.url()}`);
      } else if (response.url().includes('/api/')) {
        console.log(`✅ ${response.status()} - ${response.url()}`);
      }
    });

    page.on('requestfailed', request => {
      networkRequests.push({
        type: 'FAILED',
        url: request.url(),
        method: request.method(),
        failure: request.failure(),
        timestamp: new Date().toISOString()
      });
      console.log(`💥 FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Console monitoring with more detail
    page.on('console', msg => {
      const message = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      };
      consoleMessages.push(message);

      if (msg.type() === 'error' || msg.text().toLowerCase().includes('fetch') || msg.text().toLowerCase().includes('failed')) {
        console.log(`🔴 ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    // Navigate and wait for load
    await page.goto('http://127.0.0.1:51254');
    await expect(page.locator('.sidebar')).toBeVisible();
    console.log('✅ Application loaded');
  });

  test('should debug exact user workflow causing Failed to fetch', async ({ page }) => {
    console.log('\n🧪 DEBUGGING EXACT USER WORKFLOW');
    console.log('='.repeat(50));

    // Step 1: Select GitHub Repository
    console.log('📋 Step 1: Selecting GitHub Repository data source...');
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    console.log('✅ GitHub config visible');

    // Step 2: Wait for connections to load and verify
    console.log('📋 Step 2: Waiting for connections...');
    await page.waitForTimeout(2000);
    
    const connectionOptions = await page.locator('#github-connection option').allTextContents();
    console.log('Available connections:', connectionOptions);

    if (connectionOptions.includes('Error loading connections')) {
      console.log('❌ Connections failed to load - this indicates CORS issues persist');
      
      // Show the exact failed request
      const connectionRequests = networkRequests.filter(req => 
        req.url && req.url.includes('/api/github/connections')
      );
      console.log('Connection requests:', connectionRequests);
      
      throw new Error('Connections not loading - CORS issue not fully resolved');
    }

    // Step 3: Select Personal Account
    console.log('📋 Step 3: Selecting Personal Account...');
    const personalAccountOption = connectionOptions.find(opt => 
      opt.includes('Personal Account') || opt.includes('cdameworth')
    );
    
    if (!personalAccountOption) {
      throw new Error('Personal Account connection not found');
    }

    await page.selectOption('#github-connection', 'cdameworth-personal');
    await expect(page.locator('#github-repo-row')).toBeVisible();
    console.log('✅ Repository row visible');

    // Step 4: Wait for repositories and verify
    console.log('📋 Step 4: Waiting for repositories...');
    
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-repo-select');
      return select && select.options.length > 1;
    }, { timeout: 10000 });

    const repoOptions = await page.locator('#github-repo-select option').allTextContents();
    console.log('Available repositories:', repoOptions);

    const stockAnalyticsOption = repoOptions.find(opt => 
      opt.includes('stock-analytics-engine')
    );

    if (!stockAnalyticsOption) {
      throw new Error('stock-analytics-engine repository not found');
    }

    // Step 5: Select stock-analytics-engine
    console.log('📋 Step 5: Selecting stock-analytics-engine...');
    await page.selectOption('#github-repo-select', 'stock-analytics-engine');
    
    await expect(page.locator('#github-branch-row')).toBeVisible();
    await expect(page.locator('#load-github-repo')).toBeVisible();
    
    const branchValue = await page.inputValue('#github-branch');
    console.log('✅ Branch set to:', branchValue);

    // Step 6: Monitor the exact moment of button click
    console.log('📋 Step 6: Clicking Load Repository button...');
    console.log('🔍 MONITORING NETWORK ACTIVITY DURING BUTTON CLICK...');
    
    // Clear previous network logs to focus on the button click
    const beforeClickRequestCount = networkRequests.length;
    
    // Click the load button
    await page.click('#load-github-repo');
    console.log('🖱️ Button clicked!');

    // Wait a moment for requests to start
    await page.waitForTimeout(1000);

    // Monitor loading state
    const loadingVisible = await page.locator('#loading-overlay').isVisible();
    console.log('Loading overlay visible:', loadingVisible);

    if (loadingVisible) {
      console.log('⏳ Loading started, waiting for completion...');
      
      try {
        await expect(page.locator('#loading-overlay')).toBeHidden({ timeout: 30000 });
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
      console.log('❌ Loading overlay never appeared - request may have failed immediately');
    }

    // Step 7: Analyze what happened during button click
    console.log('📋 Step 7: Analyzing button click network activity...');
    
    const newRequests = networkRequests.slice(beforeClickRequestCount);
    console.log(`Found ${newRequests.length} new network requests after button click:`);
    
    newRequests.forEach((req, index) => {
      if (req.type === 'REQUEST') {
        console.log(`  ${index + 1}. 📤 ${req.method} ${req.url}`);
        if (req.body) {
          console.log(`     Body: ${req.body}`);
        }
      } else if (req.type === 'RESPONSE') {
        console.log(`  ${index + 1}. 📥 ${req.status} ${req.url}`);
      } else if (req.type === 'FAILED') {
        console.log(`  ${index + 1}. 💥 FAILED ${req.method} ${req.url} - ${req.failure?.errorText}`);
      }
    });

    // Look specifically for the parse-github-connection request
    const parseRequests = newRequests.filter(req => 
      req.url && req.url.includes('/api/parse-github-connection')
    );

    if (parseRequests.length === 0) {
      console.log('❌ NO parse-github-connection requests found!');
      console.log('This suggests the button click is not triggering the expected API call.');
    } else {
      console.log(`✅ Found ${parseRequests.length} parse-github-connection requests:`);
      parseRequests.forEach(req => {
        console.log(`   - ${req.type}: ${req.method || 'N/A'} ${req.url}`);
        if (req.type === 'REQUEST' && req.body) {
          console.log(`     Request body: ${req.body}`);
        }
        if (req.type === 'RESPONSE') {
          console.log(`     Response: ${req.status} ${req.statusText}`);
        }
        if (req.type === 'FAILED') {
          console.log(`     Failure: ${req.failure?.errorText}`);
        }
      });
    }

    // Step 8: Check for toasts and error messages
    console.log('📋 Step 8: Checking for error messages...');
    
    await page.waitForTimeout(2000); // Wait for toasts
    
    const errorToasts = page.locator('.toast.toast-error');
    const successToasts = page.locator('.toast.toast-success');
    
    const hasError = await errorToasts.isVisible();
    const hasSuccess = await successToasts.isVisible();
    
    console.log('Toast status:', { hasError, hasSuccess });

    if (hasError) {
      const errorTexts = await errorToasts.allTextContents();
      console.log('❌ Error messages found:');
      errorTexts.forEach((text, index) => {
        console.log(`   ${index + 1}. ${text.trim()}`);
        
        if (text.toLowerCase().includes('failed to fetch')) {
          console.log('🔍 FOUND "Failed to fetch" error!');
        }
      });
    }

    if (hasSuccess) {
      const successText = await successToasts.textContent();
      console.log('✅ Success message:', successText.trim());
    }

    // Step 9: Check console errors during the process
    console.log('📋 Step 9: Analyzing console messages...');
    
    const recentErrors = consoleMessages
      .filter(msg => msg.type === 'error')
      .slice(-10); // Last 10 errors
    
    if (recentErrors.length > 0) {
      console.log('❌ Recent console errors:');
      recentErrors.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.text}`);
      });
    }

    // Step 10: Take screenshot for visual debugging
    await page.screenshot({ 
      path: 'debug-load-button-final.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved: debug-load-button-final.png');

    // Step 11: Summary analysis
    console.log('\n🔍 SUMMARY ANALYSIS');
    console.log('='.repeat(50));
    
    const failedRequests = networkRequests.filter(req => req.type === 'FAILED');
    const corsErrors = consoleMessages.filter(msg => 
      msg.text.toLowerCase().includes('cors') || 
      msg.text.toLowerCase().includes('access-control')
    );
    
    console.log(`- Total network requests: ${networkRequests.length}`);
    console.log(`- Failed requests: ${failedRequests.length}`);
    console.log(`- CORS errors: ${corsErrors.length}`);
    console.log(`- Console errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    
    if (failedRequests.length > 0) {
      console.log('\n❌ FAILED REQUESTS:');
      failedRequests.forEach(req => {
        console.log(`   - ${req.method} ${req.url}: ${req.failure?.errorText}`);
      });
    }
    
    if (corsErrors.length > 0) {
      console.log('\n❌ CORS ERRORS STILL PRESENT:');
      corsErrors.forEach(err => {
        console.log(`   - ${err.text}`);
      });
    }
    
    // Determine the root cause
    if (corsErrors.length > 0) {
      console.log('\n🎯 ROOT CAUSE: CORS issues still present');
      console.log('The CORS fix may not be complete or the server needs to be restarted.');
    } else if (failedRequests.length > 0) {
      console.log('\n🎯 ROOT CAUSE: Network request failures');
      console.log('Requests are being made but failing for non-CORS reasons.');
    } else if (parseRequests.length === 0) {
      console.log('\n🎯 ROOT CAUSE: API request not being made');
      console.log('The button click is not triggering the expected API call.');
    } else {
      console.log('\n🎯 ROOT CAUSE: Unknown - need more investigation');
    }
  });

  test('should verify CORS headers in response', async ({ page }) => {
    console.log('\n🧪 TESTING CORS HEADERS');
    console.log('='.repeat(30));

    await page.goto('http://127.0.0.1:51254');
    await page.waitForSelector('.sidebar');

    // Test CORS by making direct API calls from the frontend context
    const corsTest = await page.evaluate(async () => {
      const tests = [];
      
      // Test 1: GitHub connections
      try {
        const response = await fetch('http://localhost:4000/api/github/connections', {
          method: 'GET'
        });
        tests.push({
          endpoint: '/api/github/connections',
          method: 'GET',
          success: response.ok,
          status: response.status,
          corsAllowed: true
        });
      } catch (error) {
        tests.push({
          endpoint: '/api/github/connections',
          method: 'GET',
          success: false,
          error: error.message,
          corsAllowed: error.message.includes('CORS') ? false : 'unknown'
        });
      }

      // Test 2: Parse GitHub Connection (POST)
      try {
        const response = await fetch('http://localhost:4000/api/parse-github-connection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            connectionId: 'cdameworth-personal',
            repositoryName: 'stock-analytics-engine',
            branch: 'main'
          })
        });
        tests.push({
          endpoint: '/api/parse-github-connection',
          method: 'POST',
          success: response.ok,
          status: response.status,
          corsAllowed: true
        });
      } catch (error) {
        tests.push({
          endpoint: '/api/parse-github-connection',
          method: 'POST',
          success: false,
          error: error.message,
          corsAllowed: error.message.includes('CORS') ? false : 'unknown'
        });
      }

      return tests;
    });

    console.log('CORS Test Results:');
    corsTest.forEach((test, index) => {
      console.log(`${index + 1}. ${test.method} ${test.endpoint}`);
      console.log(`   Success: ${test.success}`);
      console.log(`   CORS Allowed: ${test.corsAllowed}`);
      if (test.status) console.log(`   Status: ${test.status}`);
      if (test.error) console.log(`   Error: ${test.error}`);
      console.log('');
    });

    // Verify the tests
    const corsBlocked = corsTest.filter(test => test.corsAllowed === false);
    if (corsBlocked.length > 0) {
      console.log('❌ CORS is still blocking some requests');
      throw new Error('CORS configuration incomplete');
    } else {
      console.log('✅ CORS appears to be working for direct API calls');
    }
  });
});