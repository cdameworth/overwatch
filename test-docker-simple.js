const { chromium } = require('playwright');

async function testDockerEnvironment() {
  console.log('🐳 Testing Docker Environment GitHub Integration');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Test 1: Can we access the Docker frontend?
    console.log('\n📋 Step 1: Testing Docker frontend access...');
    await page.goto('http://localhost:5000', { timeout: 15000 });
    await page.waitForSelector('.sidebar', { timeout: 10000 });
    console.log('✅ Docker frontend accessible on port 5000');

    // Test 2: Can we access the backend from the frontend?
    console.log('\n📋 Step 2: Testing backend connectivity from Docker frontend...');
    const backendTest = await page.evaluate(async () => {
      const tests = [];
      
      // Test various backend URLs
      const urls = [
        'http://localhost:4001',
        'http://localhost:4000', 
        'http://backend:4000',
        'http://127.0.0.1:4001'
      ];

      for (const url of urls) {
        try {
          const response = await fetch(`${url}/api/github/connections`);
          tests.push({
            url,
            success: true,
            status: response.status,
            ok: response.ok
          });
        } catch (error) {
          tests.push({
            url,
            success: false,
            error: error.message
          });
        }
      }
      
      return tests;
    });

    console.log('Backend connectivity results:');
    backendTest.forEach(test => {
      if (test.success) {
        console.log(`✅ ${test.url} - Status: ${test.status} OK: ${test.ok}`);
      } else {
        console.log(`❌ ${test.url} - Error: ${test.error}`);
      }
    });

    const workingBackend = backendTest.find(t => t.success && t.ok);
    if (!workingBackend) {
      console.log('\n❌ DOCKER ISSUE: Backend not accessible from frontend container');
      console.log('This explains the "Failed to fetch" errors in Docker environment');
      
      // Test if backend container is reachable at all
      const containerTest = await page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:4001/');
          return { reachable: true, status: response.status };
        } catch (error) {
          return { reachable: false, error: error.message };
        }
      });
      
      if (containerTest.reachable) {
        console.log('✅ Backend container is reachable but API endpoints failing');
        console.log('💡 Backend service may be crashing during API requests');
      } else {
        console.log('❌ Backend container not reachable at all');
        console.log('💡 Docker networking or port mapping issue');
      }
    } else {
      console.log(`✅ Working backend found: ${workingBackend.url}`);
    }

    // Test 3: Try the GitHub workflow anyway
    console.log('\n📋 Step 3: Testing GitHub workflow in Docker...');
    
    await page.selectOption('#data-source-selector', 'github');
    await page.waitForSelector('#github-config', { visible: true });
    console.log('✅ GitHub config panel visible');

    await page.waitForTimeout(5000);
    
    const connectionOptions = await page.locator('#github-connection option').allTextContents();
    console.log('Connection options:', connectionOptions);

    if (connectionOptions.includes('Error loading connections')) {
      console.log('❌ CONFIRMED: GitHub connections failing to load in Docker');
      console.log('🎯 Root cause: Backend API not accessible from frontend container');
    } else {
      console.log('✅ Connections loaded successfully in Docker');
    }

    await page.screenshot({ path: 'docker-test-final.png', fullPage: true });
    console.log('📸 Screenshot saved: docker-test-final.png');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testDockerEnvironment().catch(console.error);