// Global setup for Playwright tests
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function globalSetup(config) {
  console.log('🚀 Starting global test setup...');
  
  // Create necessary directories
  const dirs = [
    'tests/screenshots',
    'tests/reports',
    'tests/reports/html-report',
    'tests/reports/coverage',
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Wait for servers to be ready
  console.log('⏱️  Waiting for servers to be ready...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test backend connectivity
    console.log('🔍 Testing backend connectivity...');
    const backendResponse = await page.goto('http://localhost:4001/api/parse');
    if (backendResponse && backendResponse.status() !== 404) {
      console.log('✅ Backend server is responding');
    }
    
    // Test frontend connectivity  
    console.log('🔍 Testing frontend connectivity...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Frontend server is responding');
    
    // Take baseline screenshots for visual regression tests
    console.log('📸 Capturing baseline screenshots...');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ 
      path: 'tests/screenshots/baseline-desktop.png',
      fullPage: true 
    });
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'tests/screenshots/baseline-mobile.png',
      fullPage: true 
    });
    
    console.log('✅ Baseline screenshots captured');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('🎉 Global test setup completed successfully');
  
  return async () => {
    console.log('🧹 Running global teardown...');
  };
}

module.exports = globalSetup;