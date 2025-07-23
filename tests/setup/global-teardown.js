// Global teardown for Playwright tests
const fs = require('fs');
const path = require('path');

async function globalTeardown(config) {
  console.log('🧹 Running global teardown...');
  
  try {
    // Generate test summary report
    const reportsDir = path.join(process.cwd(), 'tests/reports');
    const summaryFile = path.join(reportsDir, 'test-summary.json');
    
    const summary = {
      timestamp: new Date().toISOString(),
      testRun: {
        completed: true,
        duration: Date.now() - (global.testStartTime || Date.now()),
      },
      environment: {
        node: process.version,
        platform: process.platform,
        cwd: process.cwd(),
      },
    };
    
    if (fs.existsSync(reportsDir)) {
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
      console.log('📊 Test summary written to:', summaryFile);
    }
    
    // Clean up temporary files if needed
    const tempDir = path.join(process.cwd(), 'tests/temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🗑️  Cleaned up temporary files');
    }
    
    console.log('✅ Global teardown completed');
    
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
  }
}

module.exports = globalTeardown;