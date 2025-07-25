const { test, expect } = require('@playwright/test');

test.describe('Validate Load Repository Button Failed to Fetch', () => {
  let allNetworkActivity = [];
  let allConsoleMessages = [];
  let testStartTime;

  test.beforeEach(async ({ page }) => {
    testStartTime = Date.now();
    allNetworkActivity = [];
    allConsoleMessages = [];

    // Comprehensive network monitoring with timestamps
    page.on('request', request => {
      const requestData = {
        timestamp: Date.now() - testStartTime,
        type: 'REQUEST',
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        resourceType: request.resourceType()
      };

      // Capture request body for API calls
      if (request.method() === 'POST' && request.url().includes('/api/')) {
        try {
          requestData.postData = request.postData();
        } catch (e) {
          requestData.postData = 'Unable to capture';
        }
      }

      allNetworkActivity.push(requestData);
      console.log(`[${requestData.timestamp}ms] 📤 ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      const responseData = {
        timestamp: Date.now() - testStartTime,
        type: 'RESPONSE',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        ok: response.ok()
      };

      allNetworkActivity.push(responseData);

      if (response.url().includes('/api/')) {
        if (response.ok()) {
          console.log(`[${responseData.timestamp}ms] ✅ ${response.status()} ${response.url()}`);
        } else {
          console.log(`[${responseData.timestamp}ms] ❌ ${response.status()} ${response.statusText()} - ${response.url()}`);
        }
      }
    });

    page.on('requestfailed', request => {
      const failureData = {
        timestamp: Date.now() - testStartTime,
        type: 'REQUEST_FAILED',
        method: request.method(),
        url: request.url(),
        failure: request.failure(),
        resourceType: request.resourceType()
      };

      allNetworkActivity.push(failureData);
      console.log(`[${failureData.timestamp}ms] 💥 ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Enhanced console monitoring
    page.on('console', msg => {
      const consoleData = {
        timestamp: Date.now() - testStartTime,
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        args: msg.args()
      };

      allConsoleMessages.push(consoleData);

      if (msg.type() === 'error' || 
          msg.text().toLowerCase().includes('fetch') ||
          msg.text().toLowerCase().includes('failed') ||
          msg.text().toLowerCase().includes('cors')) {
        console.log(`[${consoleData.timestamp}ms] 🔴 ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    // Pre-validate backend availability
    console.log('\n🔍 PRE-TEST BACKEND VALIDATION');
    console.log('='.repeat(40));
    
    const backendCheck = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:4000/api/github/connections');
        return {
          available: true,
          status: response.status,
          ok: response.ok
        };
      } catch (error) {
        return {
          available: false,
          error: error.message
        };
      }
    });

    console.log('Backend status:', backendCheck);
    
    if (!backendCheck.available) {
      console.log('❌ Backend is not available - this will cause Failed to fetch errors');
    }

    // Navigate to application
    await page.goto('http://127.0.0.1:51254');
    await expect(page.locator('.sidebar')).toBeVisible();
    console.log('✅ Application loaded successfully');
  });

  test.afterEach(async ({ page }) => {
    // Generate comprehensive test report
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(50));
    
    // Network summary
    const requests = allNetworkActivity.filter(a => a.type === 'REQUEST');
    const responses = allNetworkActivity.filter(a => a.type === 'RESPONSE');
    const failures = allNetworkActivity.filter(a => a.type === 'REQUEST_FAILED');
    const apiRequests = allNetworkActivity.filter(a => a.url && a.url.includes('/api/'));
    
    console.log(`📈 Network Activity Summary:`);
    console.log(`   - Total requests: ${requests.length}`);
    console.log(`   - Total responses: ${responses.length}`);
    console.log(`   - Failed requests: ${failures.length}`);
    console.log(`   - API-related: ${apiRequests.length}`);
    
    // Console errors summary
    const errors = allConsoleMessages.filter(m => m.type === 'error');
    const fetchErrors = allConsoleMessages.filter(m => 
      m.text.toLowerCase().includes('fetch') || 
      m.text.toLowerCase().includes('failed')
    );
    
    console.log(`🔴 Console Activity Summary:`);
    console.log(`   - Total errors: ${errors.length}`);
    console.log(`   - Fetch-related errors: ${fetchErrors.length}`);
    
    // Detailed failure analysis
    if (failures.length > 0) {
      console.log(`\n💥 Failed Requests Details:`);
      failures.forEach((failure, index) => {
        console.log(`   ${index + 1}. [${failure.timestamp}ms] ${failure.method} ${failure.url}`);
        console.log(`      Error: ${failure.failure?.errorText}`);
      });
    }
    
    if (fetchErrors.length > 0) {
      console.log(`\n🔍 Fetch Error Details:`);
      fetchErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. [${error.timestamp}ms] ${error.text}`);
      });
    }
  });

  test('should validate exact Load Repository button failure scenario', async ({ page }) => {
    console.log('\n🧪 VALIDATING LOAD REPOSITORY BUTTON FAILURE');
    console.log('='.repeat(50));

    // Step 1: Setup GitHub repository selection
    console.log('\n📋 Step 1: Setting up GitHub repository selection...');
    
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    console.log('✅ GitHub configuration panel visible');

    // Wait for connections to load and validate
    console.log('\n📋 Step 2: Validating GitHub connections...');
    await page.waitForTimeout(3000);
    
    const connectionOptions = await page.locator('#github-connection option').allTextContents();
    console.log('Available connections:', connectionOptions);

    if (connectionOptions.includes('Error loading connections')) {
      console.log('❌ CRITICAL: Connections failed to load');
      throw new Error('GitHub connections are not loading - backend connectivity issue');
    }

    // Select personal account
    console.log('\n📋 Step 3: Selecting personal account...');
    const personalOption = connectionOptions.find(opt => 
      opt.includes('Personal Account') || opt.includes('cdameworth')
    );
    
    if (!personalOption) {
      throw new Error('Personal Account connection not found');
    }

    await page.selectOption('#github-connection', 'cdameworth-personal');
    await expect(page.locator('#github-repo-row')).toBeVisible();
    console.log('✅ Repository selection row visible');

    // Wait for repositories
    console.log('\n📋 Step 4: Loading repositories...');
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-repo-select');
      return select && select.options.length > 1;
    }, { timeout: 10000 });

    const repoOptions = await page.locator('#github-repo-select option').allTextContents();
    console.log('Available repositories:', repoOptions);

    if (!repoOptions.some(opt => opt.includes('stock-analytics-engine'))) {
      throw new Error('stock-analytics-engine repository not found');
    }

    // Select stock-analytics-engine
    console.log('\n📋 Step 5: Selecting stock-analytics-engine...');
    await page.selectOption('#github-repo-select', 'stock-analytics-engine');
    await expect(page.locator('#github-branch-row')).toBeVisible();
    await expect(page.locator('#load-github-repo')).toBeVisible();

    const branchValue = await page.inputValue('#github-branch');
    console.log(`✅ Repository selected, branch: ${branchValue}`);

    // Critical moment: Click the Load Repository button
    console.log('\n📋 Step 6: CLICKING LOAD REPOSITORY BUTTON');
    console.log('🔍 Starting intensive monitoring...');
    
    const beforeClickTime = Date.now() - testStartTime;
    const beforeClickNetworkCount = allNetworkActivity.length;
    
    // Click the button
    await page.click('#load-github-repo');
    console.log(`[${Date.now() - testStartTime}ms] 🖱️ Load Repository button clicked`);

    // Monitor loading state
    const loadingAppeared = await page.locator('#loading-overlay').isVisible();
    console.log(`[${Date.now() - testStartTime}ms] Loading overlay visible: ${loadingAppeared}`);

    if (loadingAppeared) {
      console.log('⏳ Loading overlay appeared - monitoring for completion...');
      
      try {
        await expect(page.locator('#loading-overlay')).toBeHidden({ timeout: 45000 });
        console.log(`[${Date.now() - testStartTime}ms] ✅ Loading completed successfully`);
      } catch (timeout) {
        console.log(`[${Date.now() - testStartTime}ms] ⚠️ Loading timed out`);
        
        // Force hide to see current state
        await page.evaluate(() => {
          const overlay = document.querySelector('#loading-overlay');
          if (overlay) overlay.style.display = 'none';
        });
      }
    } else {
      console.log('❌ Loading overlay never appeared - immediate failure likely');
    }

    // Wait for any toasts or errors to appear
    await page.waitForTimeout(3000);

    // Analyze post-click network activity
    console.log('\n📋 Step 7: Analyzing network activity after button click...');
    const afterClickNetworkActivity = allNetworkActivity.slice(beforeClickNetworkCount);
    
    console.log(`Found ${afterClickNetworkActivity.length} network events after button click:`);
    afterClickNetworkActivity.forEach((activity, index) => {
      const relativeTime = activity.timestamp - beforeClickTime;
      if (activity.type === 'REQUEST') {
        console.log(`  +${relativeTime}ms: 📤 ${activity.method} ${activity.url}`);
        if (activity.postData && activity.url.includes('/api/')) {
          console.log(`         Body: ${activity.postData}`);
        }
      } else if (activity.type === 'RESPONSE') {
        console.log(`  +${relativeTime}ms: 📥 ${activity.status} ${activity.url}`);
      } else if (activity.type === 'REQUEST_FAILED') {
        console.log(`  +${relativeTime}ms: 💥 ${activity.method} ${activity.url} - ${activity.failure?.errorText}`);
      }
    });

    // Check for the specific API call we expect
    const parseRequests = afterClickNetworkActivity.filter(activity => 
      activity.url && activity.url.includes('/api/parse-github-connection')
    );

    if (parseRequests.length === 0) {
      console.log('❌ CRITICAL: No /api/parse-github-connection requests found');
      console.log('This indicates the button click is not triggering the expected API call');
    } else {
      console.log(`✅ Found ${parseRequests.length} parse-github-connection requests`);
      parseRequests.forEach(req => {
        console.log(`   - ${req.type}: ${req.method || 'N/A'} ${req.url}`);
        if (req.status) console.log(`     Status: ${req.status} ${req.statusText}`);
        if (req.failure) console.log(`     Failure: ${req.failure.errorText}`);
      });
    }

    // Check for toast messages
    console.log('\n📋 Step 8: Checking for user feedback...');
    
    const errorToasts = page.locator('.toast.toast-error');
    const successToasts = page.locator('.toast.toast-success');
    const warningToasts = page.locator('.toast.toast-warning');
    
    const hasError = await errorToasts.count() > 0;
    const hasSuccess = await successToasts.count() > 0;
    const hasWarning = await warningToasts.count() > 0;
    
    console.log(`Toast status: Error=${hasError}, Success=${hasSuccess}, Warning=${hasWarning}`);

    if (hasError) {
      const errorTexts = await errorToasts.allTextContents();
      console.log('❌ Error messages:');
      errorTexts.forEach((text, index) => {
        const cleanText = text.trim().replace(/\s+/g, ' ');
        console.log(`   ${index + 1}. ${cleanText}`);
        
        if (cleanText.toLowerCase().includes('failed to fetch')) {
          console.log('🎯 FOUND: "Failed to fetch" error message confirmed');
        }
      });
    }

    if (hasSuccess) {
      const successTexts = await successToasts.allTextContents();
      console.log('✅ Success messages:');
      successTexts.forEach((text, index) => {
        console.log(`   ${index + 1}. ${text.trim().replace(/\s+/g, ' ')}`);
      });
    }

    // Take final screenshot
    await page.screenshot({ 
      path: 'validate-load-failure-final.png', 
      fullPage: true 
    });
    console.log('📸 Final state screenshot saved');

    // Final analysis and recommendations
    console.log('\n🎯 FINAL ANALYSIS AND RECOMMENDATIONS');
    console.log('='.repeat(50));
    
    const networkFailures = afterClickNetworkActivity.filter(a => a.type === 'REQUEST_FAILED');
    const corsErrors = allConsoleMessages.filter(m => 
      m.text.toLowerCase().includes('cors') || 
      m.text.toLowerCase().includes('access-control')
    );
    const connectionErrors = allConsoleMessages.filter(m =>
      m.text.toLowerCase().includes('connection refused') ||
      m.text.toLowerCase().includes('net::err_connection_refused')
    );

    if (networkFailures.length > 0) {
      console.log('❌ ISSUE: Network request failures detected');
      console.log('RECOMMENDATION: Check backend server status');
    }

    if (corsErrors.length > 0) {
      console.log('❌ ISSUE: CORS policy errors detected');
      console.log('RECOMMENDATION: Verify CORS configuration in backend');
    }

    if (connectionErrors.length > 0) {
      console.log('❌ ISSUE: Backend connection refused');
      console.log('RECOMMENDATION: Restart backend server');
    }

    if (parseRequests.length === 0) {
      console.log('❌ ISSUE: API request not being made');
      console.log('RECOMMENDATION: Check frontend JavaScript for button click handler');
    }

    const failedParseRequests = parseRequests.filter(req => req.type === 'REQUEST_FAILED');
    if (failedParseRequests.length > 0) {
      console.log('❌ ISSUE: API requests failing');
      console.log('RECOMMENDATION: Debug backend API endpoint');
    }

    if (hasError && !networkFailures.length && !corsErrors.length) {
      console.log('❌ ISSUE: Application-level error (not network)');
      console.log('RECOMMENDATION: Check backend processing logic');
    }

    // Verify the user experience matches expectations
    if (hasError) {
      const fetchErrorExists = (await errorToasts.allTextContents()).some(text => 
        text.toLowerCase().includes('failed to fetch')
      );
      
      if (fetchErrorExists) {
        console.log('\n✅ VALIDATION CONFIRMED: "Failed to fetch" error reproduced');
      } else {
        console.log('\n❓ VALIDATION UNCLEAR: Error present but not "Failed to fetch"');
      }
    } else {
      console.log('\n❓ VALIDATION FAILED: No error toast found - may be working correctly');
    }
  });

  test('should validate backend connectivity during button click', async ({ page }) => {
    console.log('\n🧪 BACKEND CONNECTIVITY VALIDATION TEST');
    console.log('='.repeat(45));

    await page.goto('http://127.0.0.1:51254');
    await page.waitForSelector('.sidebar');

    // Test backend connectivity at the exact moment of issue
    const connectivityTest = await page.evaluate(async () => {
      const results = [];
      
      // Test 1: Basic connection test
      try {
        const healthResponse = await fetch('http://localhost:4000/api/github/connections');
        results.push({
          test: 'GitHub Connections API',
          success: healthResponse.ok,
          status: healthResponse.status,
          error: null
        });
      } catch (error) {
        results.push({
          test: 'GitHub Connections API',
          success: false,
          status: null,
          error: error.message
        });
      }

      // Test 2: Exact API call that should be made
      try {
        const parseResponse = await fetch('http://localhost:4000/api/parse-github-connection', {
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
        
        const responseData = await parseResponse.text();
        results.push({
          test: 'Parse GitHub Connection API',
          success: parseResponse.ok,
          status: parseResponse.status,
          error: null,
          responseLength: responseData.length,
          responsePreview: responseData.substring(0, 200)
        });
      } catch (error) {
        results.push({
          test: 'Parse GitHub Connection API',
          success: false,
          status: null,
          error: error.message
        });
      }

      return results;
    });

    console.log('Backend connectivity test results:');
    connectivityTest.forEach((result, index) => {
      console.log(`${index + 1}. ${result.test}:`);
      console.log(`   Success: ${result.success}`);
      console.log(`   Status: ${result.status || 'N/A'}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.responseLength) console.log(`   Response size: ${result.responseLength} characters`);
      if (result.responsePreview) console.log(`   Response preview: ${result.responsePreview}...`);
      console.log('');
    });

    // Determine backend status
    const backendWorking = connectivityTest.every(test => test.success);
    const partialWorking = connectivityTest.some(test => test.success);

    if (backendWorking) {
      console.log('✅ BACKEND STATUS: Fully operational');
    } else if (partialWorking) {
      console.log('⚠️ BACKEND STATUS: Partially working');
    } else {
      console.log('❌ BACKEND STATUS: Not responding');
    }
  });
});