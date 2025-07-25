const { test, expect } = require('@playwright/test');

test.describe('Debug Stock Analytics Engine Failed to Fetch', () => {
  let networkLogs = [];
  let consoleLogs = [];

  test.beforeEach(async ({ page }) => {
    // Clear logs for each test
    networkLogs = [];
    consoleLogs = [];

    // Comprehensive network monitoring
    page.on('request', request => {
      networkLogs.push({
        type: 'REQUEST',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
      
      console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      networkLogs.push({
        type: 'RESPONSE',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      });
      
      if (!response.ok() || response.url().includes('api')) {
        console.log(`📥 RESPONSE: ${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });

    page.on('requestfailed', request => {
      networkLogs.push({
        type: 'REQUEST_FAILED',
        url: request.url(),
        failure: request.failure(),
        timestamp: new Date().toISOString()
      });
      
      console.log(`❌ REQUEST_FAILED: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Console monitoring
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
      
      if (msg.type() === 'error' || msg.text().includes('fetch') || msg.text().includes('Failed')) {
        console.log(`🔴 CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    // Navigate to the application
    await page.goto('http://127.0.0.1:51254');
    
    // Wait for the application to load
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('#data-source-selector')).toBeVisible();
  });

  test('should debug Failed to Fetch error for stock-analytics-engine', async ({ page }) => {
    console.log('🧪 Starting debug test for stock-analytics-engine repository...');
    
    // Step 1: Select GitHub Repository data source
    console.log('📋 Step 1: Selecting GitHub Repository data source');
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    
    // Wait a moment for connections to load
    await page.waitForTimeout(3000);
    
    // Step 2: Check what connections are available
    console.log('📋 Step 2: Checking available connections');
    const connectionOptions = await page.locator('#github-connection option').allTextContents();
    console.log('Available connections:', connectionOptions);
    
    if (connectionOptions.includes('Error loading connections')) {
      console.log('❌ Connections failed to load - checking why...');
      
      // Filter network logs for connection API calls
      const connectionApiCalls = networkLogs.filter(log => 
        log.url && log.url.includes('/api/github/connections')
      );
      
      console.log('Connection API calls:', connectionApiCalls);
      
      // Try manual entry instead since connections are not working
      console.log('🔄 Falling back to manual entry...');
      await page.click('#toggle-manual-github');
      await expect(page.locator('#manual-github-config')).toBeVisible();
      
      await page.fill('#github-owner', 'cdameworth');
      await page.fill('#github-repo', 'stock-analytics-engine');
      await page.fill('#github-branch-manual', 'main');
      
      await page.click('#load-github-repo-manual');
      
    } else {
      // Step 3: Select personal account connection
      console.log('📋 Step 3: Selecting personal account connection');
      const personalConnectionExists = connectionOptions.some(option => 
        option.includes('Personal Account') || option.includes('cdameworth')
      );
      
      if (!personalConnectionExists) {
        console.log('❌ Personal account connection not found');
        console.log('Available connections:', connectionOptions);
        throw new Error('Personal Account connection not available');
      }
      
      await page.selectOption('#github-connection', 'cdameworth-personal');
      await expect(page.locator('#github-repo-row')).toBeVisible();
      
      // Step 4: Wait for repositories to load
      console.log('📋 Step 4: Waiting for repositories to load');
      await page.waitForFunction(() => {
        const select = document.querySelector('#github-repo-select');
        return select && select.options.length > 1;
      }, { timeout: 10000 });
      
      const repoOptions = await page.locator('#github-repo-select option').allTextContents();
      console.log('Available repositories:', repoOptions);
      
      // Step 5: Select stock-analytics-engine repository
      console.log('📋 Step 5: Selecting stock-analytics-engine repository');
      const stockAnalyticsExists = repoOptions.some(option => 
        option.includes('stock-analytics-engine')
      );
      
      if (!stockAnalyticsExists) {
        console.log('❌ stock-analytics-engine repository not found');
        console.log('Available repositories:', repoOptions);
        throw new Error('stock-analytics-engine repository not available');
      }
      
      await page.selectOption('#github-repo-select', 'stock-analytics-engine');
      await expect(page.locator('#github-branch-row')).toBeVisible();
      await expect(page.locator('#load-github-repo')).toBeVisible();
      
      // Verify branch is set to main
      const branchValue = await page.inputValue('#github-branch');
      console.log('Branch value:', branchValue);
      
      // Step 6: Load the repository
      console.log('📋 Step 6: Loading repository...');
      await page.click('#load-github-repo');
    }
    
    // Step 7: Monitor the loading process
    console.log('📋 Step 7: Monitoring loading process...');
    
    // Wait for loading to start
    await expect(page.locator('#loading-overlay')).toBeVisible();
    console.log('✅ Loading started');
    
    // Wait for loading to complete with extended timeout
    try {
      await expect(page.locator('#loading-overlay')).toBeHidden({ timeout: 45000 });
      console.log('✅ Loading completed');
    } catch (loadingTimeout) {
      console.log('⚠️ Loading timed out - checking current state...');
      
      // Force hide loading overlay to see what happened
      await page.evaluate(() => {
        const overlay = document.querySelector('#loading-overlay');
        if (overlay) overlay.style.display = 'none';
      });
    }
    
    // Step 8: Check for toasts and errors
    console.log('📋 Step 8: Checking for toasts and results...');
    
    await page.waitForTimeout(2000); // Wait for toasts to appear
    
    const successToast = page.locator('.toast.toast-success');
    const errorToast = page.locator('.toast.toast-error');
    const warningToast = page.locator('.toast.toast-warning');
    
    const hasSuccess = await successToast.isVisible();
    const hasError = await errorToast.isVisible();
    const hasWarning = await warningToast.isVisible();
    
    console.log('Toast status:', { hasSuccess, hasError, hasWarning });
    
    if (hasSuccess) {
      const successText = await successToast.textContent();
      console.log('✅ SUCCESS:', successText);
      
      // Check if graph is rendered
      const hasGraph = await page.locator('#graph svg').isVisible();
      const nodeCount = await page.locator('#graph .node-group').count();
      const resourceCount = await page.locator('#resource-count').textContent();
      
      console.log('Graph status:', { hasGraph, nodeCount, resourceCount });
      
    } else if (hasError) {
      const errorText = await errorToast.allTextContents();
      console.log('❌ ERROR TOASTS:', errorText);
      
      // Check for specific "Failed to fetch" errors
      const fetchErrors = errorText.filter(text => 
        text.toLowerCase().includes('failed to fetch') || 
        text.toLowerCase().includes('fetch')
      );
      
      if (fetchErrors.length > 0) {
        console.log('🔍 FETCH ERRORS DETECTED:', fetchErrors);
      }
      
    } else if (hasWarning) {
      const warningText = await warningToast.textContent();
      console.log('⚠️ WARNING:', warningText);
    } else {
      console.log('❓ No toasts found - checking for other indicators...');
    }
    
    // Step 9: Analyze network logs for failures
    console.log('📋 Step 9: Analyzing network activity...');
    
    const failedRequests = networkLogs.filter(log => 
      log.type === 'REQUEST_FAILED' || 
      (log.type === 'RESPONSE' && log.status >= 400)
    );
    
    const apiRequests = networkLogs.filter(log => 
      log.url && log.url.includes('/api/')
    );
    
    const githubApiRequests = networkLogs.filter(log => 
      log.url && (log.url.includes('/api/parse-github') || log.url.includes('/api/github/'))
    );
    
    console.log('Network Analysis:');
    console.log('- Failed requests:', failedRequests.length);
    console.log('- API requests:', apiRequests.length);
    console.log('- GitHub API requests:', githubApiRequests.length);
    
    if (failedRequests.length > 0) {
      console.log('❌ Failed requests details:');
      failedRequests.forEach(req => {
        console.log(`  - ${req.url}: ${req.failure?.errorText || req.status + ' ' + req.statusText}`);
      });
    }
    
    if (githubApiRequests.length > 0) {
      console.log('🔍 GitHub API requests:');
      githubApiRequests.forEach(req => {
        console.log(`  - ${req.type}: ${req.method || 'N/A'} ${req.url} - ${req.status || 'PENDING'}`);
      });
    }
    
    // Step 10: Check console errors
    console.log('📋 Step 10: Analyzing console logs...');
    
    const errorLogs = consoleLogs.filter(log => log.type === 'error');
    const fetchLogs = consoleLogs.filter(log => 
      log.text.toLowerCase().includes('fetch') || 
      log.text.toLowerCase().includes('failed')
    );
    
    if (errorLogs.length > 0) {
      console.log('❌ Console errors:');
      errorLogs.forEach(log => {
        console.log(`  - ${log.text}`);
      });
    }
    
    if (fetchLogs.length > 0) {
      console.log('🔍 Fetch-related logs:');
      fetchLogs.forEach(log => {
        console.log(`  - ${log.type}: ${log.text}`);
      });
    }
    
    // Step 11: Take screenshot for debugging
    await page.screenshot({ 
      path: 'debug-stock-analytics-final-state.png', 
      fullPage: true 
    });
    console.log('📸 Final state screenshot saved');
    
    // Step 12: Print detailed analysis
    console.log('\n🔍 DETAILED ANALYSIS:');
    console.log('='.repeat(50));
    
    if (fetchErrors && fetchErrors.length > 0) {
      console.log('❌ FETCH ERRORS DETECTED:');
      console.log('This indicates a network connectivity issue between frontend and backend.');
      console.log('Possible causes:');
      console.log('1. CORS policy blocking requests');
      console.log('2. Backend not accessible from frontend port');
      console.log('3. Network timeout issues');
      console.log('4. Invalid API endpoint URLs');
    }
    
    // Verify the issue exists (don't fail the test, just document it)
    if (hasError) {
      console.log('✅ Test successfully reproduced the "Failed to Fetch" error');
    } else if (hasSuccess) {
      console.log('✅ Repository loaded successfully - issue may be intermittent');
    } else {
      console.log('❓ Unclear state - no clear success or error indicators');
    }
  });

  test('should test direct API endpoints for debugging', async ({ page }) => {
    console.log('🧪 Testing direct API endpoints...');
    
    // Navigate to application first to establish session
    await page.goto('http://127.0.0.1:51254');
    await page.waitForSelector('.sidebar');
    
    // Test 1: Check GitHub connections API directly
    console.log('📋 Test 1: GitHub connections API');
    try {
      const connectionsResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:4000/api/github/connections');
          const data = await response.json();
          return { 
            ok: response.ok, 
            status: response.status, 
            data: data,
            error: null 
          };
        } catch (error) {
          return { 
            ok: false, 
            status: 0, 
            data: null, 
            error: error.message 
          };
        }
      });
      
      console.log('Connections API result:', connectionsResponse);
      
    } catch (error) {
      console.log('❌ Connections API test failed:', error.message);
    }
    
    // Test 2: Check manual GitHub parsing API
    console.log('📋 Test 2: Manual GitHub parsing API');
    try {
      const parseResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:4000/api/parse-github', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              owner: 'cdameworth',
              repo: 'stock-analytics-engine',
              branch: 'main'
            })
          });
          const data = await response.json();
          return { 
            ok: response.ok, 
            status: response.status, 
            data: data,
            error: null 
          };
        } catch (error) {
          return { 
            ok: false, 
            status: 0, 
            data: null, 
            error: error.message 
          };
        }
      });
      
      console.log('Parse GitHub API result:', parseResponse);
      
      if (parseResponse.ok) {
        console.log('✅ Direct API call succeeded');
        console.log('Apps found:', parseResponse.data?.apps?.length || 0);
        console.log('Resources found:', Object.keys(parseResponse.data?.resources?.resource || {}).length);
      }
      
    } catch (error) {
      console.log('❌ Parse GitHub API test failed:', error.message);
    }
    
    // Test 3: Test with connection-based API
    console.log('📋 Test 3: Connection-based GitHub parsing API');
    try {
      const connectionParseResponse = await page.evaluate(async () => {
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
          const data = await response.json();
          return { 
            ok: response.ok, 
            status: response.status, 
            data: data,
            error: null 
          };
        } catch (error) {
          return { 
            ok: false, 
            status: 0, 
            data: null, 
            error: error.message 
          };
        }
      });
      
      console.log('Connection-based API result:', connectionParseResponse);
      
    } catch (error) {
      console.log('❌ Connection-based API test failed:', error.message);
    }
  });
});