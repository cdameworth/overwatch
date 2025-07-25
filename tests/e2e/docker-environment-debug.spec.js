const { test, expect } = require('@playwright/test');

test.describe('Docker Environment GitHub Integration Debug', () => {
  test('should validate Docker container networking and GitHub integration', async ({ page }) => {
    console.log('\n🐳 DOCKER ENVIRONMENT DEBUGGING');
    console.log('='.repeat(50));

    // Test Docker environment access
    console.log('📋 Step 1: Testing Docker frontend access...');
    try {
      await page.goto('http://localhost:5000', { timeout: 10000 });
      await expect(page.locator('.sidebar')).toBeVisible({ timeout: 10000 });
      console.log('✅ Docker frontend accessible on port 5000');
    } catch (error) {
      console.log('❌ Docker frontend not accessible:', error.message);
      throw error;
    }

    // Test backend connectivity from Docker frontend
    console.log('\n📋 Step 2: Testing backend connectivity from Docker frontend...');
    const backendConnectivity = await page.evaluate(async () => {
      const results = [];
      
      // Test different backend URLs that might work in Docker
      const backendUrls = [
        'http://localhost:4001',     // Docker mapped port
        'http://localhost:4000',     // Original port
        'http://backend:4000',       // Docker service name
        'http://127.0.0.1:4001',     // Alternative localhost
      ];

      for (const url of backendUrls) {
        try {
          const response = await fetch(`${url}/api/github/connections`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          results.push({
            url,
            success: true,
            status: response.status,
            ok: response.ok
          });
        } catch (error) {
          results.push({
            url,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    });

    console.log('Backend connectivity results:');
    backendConnectivity.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ ${result.url} - Status: ${result.status}`);
      } else {
        console.log(`❌ ${result.url} - Error: ${result.error}`);
      }
    });

    const workingBackend = backendConnectivity.find(r => r.success && r.ok);
    if (!workingBackend) {
      console.log('❌ No working backend URL found in Docker environment');
      throw new Error('Backend not accessible from Docker frontend');
    }

    console.log(`✅ Working backend URL: ${workingBackend.url}`);

    // Test GitHub integration workflow in Docker
    console.log('\n📋 Step 3: Testing GitHub integration workflow...');
    
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    console.log('✅ GitHub config panel visible');

    // Monitor network requests
    let networkRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          type: 'REQUEST',
          method: request.method(),
          url: request.url(),
          timestamp: Date.now()
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

    // Wait for connections to load
    await page.waitForTimeout(5000);
    
    const connectionOptions = await page.locator('#github-connection option').allTextContents();
    console.log('GitHub connections:', connectionOptions);

    if (connectionOptions.includes('Error loading connections')) {
      console.log('❌ GitHub connections failed to load in Docker');
      
      // Analyze the failed requests
      const failedConnectionRequests = networkRequests.filter(req => 
        req.url.includes('/api/github/connections') && 
        (req.type === 'FAILED' || (req.type === 'RESPONSE' && !req.ok))
      );
      
      console.log('Failed connection requests:', failedConnectionRequests);
      throw new Error('GitHub connections not loading in Docker environment');
    }

    // Test repository loading if connections work
    if (connectionOptions.some(opt => opt.includes('Personal Account') || opt.includes('cdameworth'))) {
      console.log('\n📋 Step 4: Testing repository loading...');
      
      await page.selectOption('#github-connection', 'cdameworth-personal');
      await expect(page.locator('#github-repo-row')).toBeVisible();
      
      await page.waitForFunction(() => {
        const select = document.querySelector('#github-repo-select');
        return select && select.options.length > 1;
      }, { timeout: 10000 });

      const repoOptions = await page.locator('#github-repo-select option').allTextContents();
      console.log('Repository options:', repoOptions);

      if (repoOptions.includes('stock-analytics-engine')) {
        console.log('\n📋 Step 5: Testing Load Repository button...');
        
        await page.selectOption('#github-repo-select', 'stock-analytics-engine');
        await expect(page.locator('#load-github-repo')).toBeVisible();
        
        const beforeClick = networkRequests.length;
        await page.click('#load-github-repo');
        
        console.log('🖱️ Load Repository button clicked in Docker environment');
        
        // Monitor for loading and completion
        const loadingVisible = await page.locator('#loading-overlay').isVisible();
        console.log(`Loading overlay visible: ${loadingVisible}`);
        
        if (loadingVisible) {
          try {
            await expect(page.locator('#loading-overlay')).toBeHidden({ timeout: 45000 });
            console.log('✅ Loading completed successfully');
          } catch (timeout) {
            console.log('⚠️ Loading timed out');
          }
        }
        
        // Check for error messages
        await page.waitForTimeout(3000);
        const errorToast = await page.locator('.toast.toast-error').isVisible();
        const successToast = await page.locator('.toast.toast-success').isVisible();
        
        if (errorToast) {
          const errorText = await page.locator('.toast.toast-error').textContent();
          console.log('❌ Error in Docker environment:', errorText);
          
          if (errorText.includes('Failed to fetch')) {
            console.log('🎯 "Failed to fetch" error confirmed in Docker');
          }
        }
        
        if (successToast) {
          const successText = await page.locator('.toast.toast-success').textContent();
          console.log('✅ Success in Docker environment:', successText);
        }
        
        // Analyze network activity after button click
        const afterClick = networkRequests.slice(beforeClick);
        console.log(`\nNetwork activity after button click (${afterClick.length} requests):`);
        afterClick.forEach(req => {
          if (req.type === 'FAILED') {
            console.log(`💥 ${req.method} ${req.url} - ${req.error}`);
          } else {
            console.log(`${req.type === 'REQUEST' ? '📤' : '📥'} ${req.method || req.status} ${req.url}`);
          }
        });
      }
    }

    // Take screenshot of final state
    await page.screenshot({ 
      path: 'docker-debug-final.png', 
      fullPage: true 
    });
    console.log('📸 Docker debug screenshot saved');

    // Summary
    console.log('\n🎯 DOCKER ENVIRONMENT SUMMARY');
    console.log('='.repeat(40));
    
    const totalRequests = networkRequests.length;
    const failedRequests = networkRequests.filter(r => r.type === 'FAILED').length;
    const errorResponses = networkRequests.filter(r => r.type === 'RESPONSE' && !r.ok).length;
    
    console.log(`Total API requests: ${totalRequests}`);
    console.log(`Failed requests: ${failedRequests}`);
    console.log(`Error responses: ${errorResponses}`);
    console.log(`Working backend: ${workingBackend.url}`);
    
    if (failedRequests > 0 || errorResponses > 0) {
      console.log('❌ Issues detected in Docker environment');
    } else {
      console.log('✅ Docker environment appears healthy');
    }
  });

  test('should validate environment variables in Docker', async ({ page }) => {
    console.log('\n🔐 DOCKER ENVIRONMENT VARIABLES TEST');
    console.log('='.repeat(40));

    await page.goto('http://localhost:5000');
    await expect(page.locator('.sidebar')).toBeVisible();

    // Test if GitHub credentials are properly set
    const envTest = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:4001/api/debug/env', {
          method: 'GET'
        });
        
        if (response.ok) {
          return {
            success: true,
            data: await response.json()
          };
        } else {
          return {
            success: false,
            status: response.status
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    if (envTest.success) {
      console.log('✅ Environment endpoint accessible');
      console.log('Environment data:', envTest.data);
    } else {
      console.log('❌ Environment endpoint not accessible:', envTest.error || envTest.status);
    }
  });
});