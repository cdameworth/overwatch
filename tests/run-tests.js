#!/usr/bin/env node

/**
 * Comprehensive test runner for Overwatch Infrastructure Monitor
 * Executes all test types with reporting and environment setup
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, duration: 0, coverage: null },
      integration: { passed: 0, failed: 0, duration: 0 },
      e2e: { passed: 0, failed: 0, duration: 0 },
      visual: { passed: 0, failed: 0, duration: 0 },
      performance: { passed: 0, failed: 0, duration: 0, metrics: {} },
    };
    
    this.config = {
      parallel: process.env.CI ? false : true,
      headed: process.env.HEADED === 'true',
      debug: process.env.DEBUG === 'true',
      screenshot: process.env.SCREENSHOTS !== 'false',
      coverage: process.env.COVERAGE !== 'false',
      timeout: parseInt(process.env.TEST_TIMEOUT) || 60000,
    };

    this.startTime = Date.now();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green
      warning: '\x1b[33m',  // Yellow
      error: '\x1b[31m',    // Red
      reset: '\x1b[0m',     // Reset
    };

    console.log(`${colors[level]}[${timestamp}] ${message}${colors.reset}`);
  }

  async checkEnvironment() {
    this.log('🔍 Checking test environment...');
    
    const checks = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'npm', command: 'npm --version' },
      { name: 'Backend port 4001', test: () => this.checkPort(4001) },
      { name: 'Frontend port 3000', test: () => this.checkPort(3000) },
    ];

    for (const check of checks) {
      try {
        if (check.command) {
          const version = await this.execAsync(check.command);
          this.log(`✅ ${check.name}: ${version.trim()}`, 'success');
        } else if (check.test) {
          const result = await check.test();
          this.log(`${result ? '✅' : '❌'} ${check.name}: ${result ? 'Available' : 'Not available'}`, result ? 'success' : 'warning');
        }
      } catch (error) {
        this.log(`❌ ${check.name}: ${error.message}`, 'error');
      }
    }
  }

  async checkPort(port) {
    const net = require('net');
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(false));
        server.close();
      });
      server.on('error', () => resolve(true));
    });
  }

  execAsync(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }

  spawnAsync(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        ...options,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (!options.silent) {
          process.stdout.write(data);
        }
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (!options.silent) {
          process.stderr.write(data);
        }
      });

      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      child.on('error', reject);
    });
  }

  async setupReporting() {
    const reportsDir = path.join(process.cwd(), 'tests', 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Create test run metadata
    const metadata = {
      startTime: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: os.platform(),
        arch: os.arch(),
        ci: !!process.env.CI,
      },
      config: this.config,
    };

    fs.writeFileSync(
      path.join(reportsDir, 'test-run-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    this.log('📊 Test reporting setup complete', 'success');
  }

  async runUnitTests() {
    this.log('🧪 Running unit tests...');
    const startTime = Date.now();

    try {
      const args = ['test'];
      
      if (this.config.coverage) {
        args.push('--coverage');
      }

      if (process.env.CI) {
        args.push('--ci', '--watchAll=false');
      }

      const result = await this.spawnAsync('npm', args);
      
      const duration = Date.now() - startTime;
      
      if (result.code === 0) {
        this.results.unit.passed = this.parseTestResults(result.stdout, 'passed');
        this.results.unit.duration = duration;
        this.log(`✅ Unit tests passed in ${duration}ms`, 'success');
      } else {
        this.results.unit.failed = this.parseTestResults(result.stdout, 'failed');
        this.results.unit.duration = duration;
        this.log(`❌ Unit tests failed in ${duration}ms`, 'error');
      }

      return result.code === 0;
    } catch (error) {
      this.log(`❌ Unit tests error: ${error.message}`, 'error');
      return false;
    }
  }

  async runIntegrationTests() {
    this.log('🔗 Running integration tests...');
    const startTime = Date.now();

    try {
      const result = await this.spawnAsync('npx', [
        'jest',
        'tests/integration',
        '--testTimeout=30000',
      ]);
      
      const duration = Date.now() - startTime;
      
      if (result.code === 0) {
        this.results.integration.passed = this.parseTestResults(result.stdout, 'passed');
        this.results.integration.duration = duration;
        this.log(`✅ Integration tests passed in ${duration}ms`, 'success');
      } else {
        this.results.integration.failed = this.parseTestResults(result.stdout, 'failed');
        this.results.integration.duration = duration;
        this.log(`❌ Integration tests failed in ${duration}ms`, 'error');
      }

      return result.code === 0;
    } catch (error) {
      this.log(`❌ Integration tests error: ${error.message}`, 'error');
      return false;
    }
  }

  async runE2ETests() {
    this.log('🎯 Running E2E tests...');
    const startTime = Date.now();

    try {
      const args = ['test'];
      
      if (this.config.headed) {
        args.push('--headed');
      }
      
      if (this.config.debug) {
        args.push('--debug');
      }

      if (process.env.CI) {
        args.push('--reporter=line');
      }

      const result = await this.spawnAsync('npx', ['playwright', ...args]);
      
      const duration = Date.now() - startTime;
      
      if (result.code === 0) {
        this.results.e2e.passed = this.parsePlaywrightResults(result.stdout, 'passed');
        this.results.e2e.duration = duration;
        this.log(`✅ E2E tests passed in ${duration}ms`, 'success');
      } else {
        this.results.e2e.failed = this.parsePlaywrightResults(result.stdout, 'failed');
        this.results.e2e.duration = duration;
        this.log(`❌ E2E tests failed in ${duration}ms`, 'error');
      }

      return result.code === 0;
    } catch (error) {
      this.log(`❌ E2E tests error: ${error.message}`, 'error');
      return false;
    }
  }

  async runVisualRegressionTests() {
    this.log('👁️  Running visual regression tests...');
    const startTime = Date.now();

    try {
      const result = await this.spawnAsync('npx', [
        'playwright', 
        'test', 
        '--grep', 
        'visual',
        '--update-snapshots'
      ]);
      
      const duration = Date.now() - startTime;
      
      if (result.code === 0) {
        this.results.visual.passed = this.parsePlaywrightResults(result.stdout, 'passed');
        this.results.visual.duration = duration;
        this.log(`✅ Visual regression tests passed in ${duration}ms`, 'success');
      } else {
        this.results.visual.failed = this.parsePlaywrightResults(result.stdout, 'failed');
        this.results.visual.duration = duration;
        this.log(`❌ Visual regression tests failed in ${duration}ms`, 'error');
      }

      return result.code === 0;
    } catch (error) {
      this.log(`❌ Visual regression tests error: ${error.message}`, 'error');
      return false;
    }
  }

  async runPerformanceTests() {
    this.log('⚡ Running performance tests...');
    const startTime = Date.now();

    try {
      const result = await this.spawnAsync('npx', [
        'playwright', 
        'test', 
        '--grep', 
        'performance'
      ]);
      
      const duration = Date.now() - startTime;
      
      if (result.code === 0) {
        this.results.performance.passed = this.parsePlaywrightResults(result.stdout, 'passed');
        this.results.performance.duration = duration;
        this.results.performance.metrics = this.parsePerformanceMetrics(result.stdout);
        this.log(`✅ Performance tests passed in ${duration}ms`, 'success');
      } else {
        this.results.performance.failed = this.parsePlaywrightResults(result.stdout, 'failed');
        this.results.performance.duration = duration;
        this.log(`❌ Performance tests failed in ${duration}ms`, 'error');
      }

      return result.code === 0;
    } catch (error) {
      this.log(`❌ Performance tests error: ${error.message}`, 'error');
      return false;
    }
  }

  async runHoverTests() {
    this.log('🖱️  Running hover functionality tests...');
    const startTime = Date.now();

    try {
      const result = await this.spawnAsync('npx', [
        'playwright', 
        'test', 
        '--grep', 
        'hover'
      ]);
      
      const duration = Date.now() - startTime;
      
      if (result.code === 0) {
        this.log(`✅ Hover tests passed in ${duration}ms`, 'success');
      } else {
        this.log(`❌ Hover tests failed in ${duration}ms`, 'error');
      }

      return result.code === 0;
    } catch (error) {
      this.log(`❌ Hover tests error: ${error.message}`, 'error');
      return false;
    }
  }

  parseTestResults(output, type) {
    // Simple parsing for Jest output
    const patterns = {
      passed: /(\d+) passed/,
      failed: /(\d+) failed/,
    };

    const match = output.match(patterns[type]);
    return match ? parseInt(match[1]) : 0;
  }

  parsePlaywrightResults(output, type) {
    // Simple parsing for Playwright output
    const patterns = {
      passed: /(\d+) passed/,
      failed: /(\d+) failed/,
    };

    const match = output.match(patterns[type]);
    return match ? parseInt(match[1]) : 0;
  }

  parsePerformanceMetrics(output) {
    const metrics = {};
    
    // Extract performance metrics from console logs
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.includes('Page load time:')) {
        metrics.pageLoadTime = parseInt(line.match(/(\d+)ms/)?.[1]) || 0;
      }
      if (line.includes('Average hover response time:')) {
        metrics.hoverResponseTime = parseFloat(line.match(/(\d+\.?\d*)ms/)?.[1]) || 0;
      }
      if (line.includes('Graph render time:')) {
        metrics.graphRenderTime = parseInt(line.match(/(\d+)ms/)?.[1]) || 0;
      }
    });

    return metrics;
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const totalPassed = Object.values(this.results).reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = Object.values(this.results).reduce((sum, r) => sum + r.failed, 0);
    const totalTests = totalPassed + totalFailed;

    const report = {
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        successRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0',
        totalDuration,
        timestamp: new Date().toISOString(),
      },
      details: this.results,
      environment: {
        node: process.version,
        platform: os.platform(),
        ci: !!process.env.CI,
      },
      config: this.config,
    };

    // Write report to file
    const reportsDir = path.join(process.cwd(), 'tests', 'reports');
    const reportFile = path.join(reportsDir, 'test-summary.json');
    
    try {
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      this.log(`📋 Test report written to: ${reportFile}`, 'success');
    } catch (error) {
      this.log(`❌ Failed to write report: ${error.message}`, 'error');
    }

    return report;
  }

  displaySummary(report) {
    this.log('', 'info');
    this.log('📊 TEST SUMMARY', 'info');
    this.log('================', 'info');
    this.log(`Total Tests: ${report.summary.totalTests}`, 'info');
    this.log(`Passed: ${report.summary.totalPassed}`, report.summary.totalPassed > 0 ? 'success' : 'info');
    this.log(`Failed: ${report.summary.totalFailed}`, report.summary.totalFailed > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${report.summary.successRate}%`, parseFloat(report.summary.successRate) >= 80 ? 'success' : 'warning');
    this.log(`Total Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s`, 'info');
    this.log('', 'info');

    // Detailed breakdown
    Object.entries(this.results).forEach(([testType, result]) => {
      if (result.passed > 0 || result.failed > 0) {
        const status = result.failed === 0 ? '✅' : '❌';
        this.log(`${status} ${testType.toUpperCase()}: ${result.passed} passed, ${result.failed} failed (${(result.duration / 1000).toFixed(2)}s)`, 
                 result.failed === 0 ? 'success' : 'error');
      }
    });

    // Performance metrics
    if (this.results.performance.metrics && Object.keys(this.results.performance.metrics).length > 0) {
      this.log('', 'info');
      this.log('⚡ PERFORMANCE METRICS', 'info');
      Object.entries(this.results.performance.metrics).forEach(([metric, value]) => {
        this.log(`${metric}: ${value}ms`, 'info');
      });
    }

    this.log('', 'info');
  }

  async run() {
    try {
      this.log('🚀 Starting comprehensive test suite for Overwatch Infrastructure Monitor', 'info');
      
      await this.checkEnvironment();
      await this.setupReporting();

      const testSuite = process.env.TEST_SUITE || 'all';
      const results = [];

      if (testSuite === 'all' || testSuite === 'unit') {
        results.push(await this.runUnitTests());
      }

      if (testSuite === 'all' || testSuite === 'integration') {
        results.push(await this.runIntegrationTests());
      }

      if (testSuite === 'all' || testSuite === 'e2e') {
        results.push(await this.runE2ETests());
      }

      if (testSuite === 'all' || testSuite === 'visual') {
        results.push(await this.runVisualRegressionTests());
      }

      if (testSuite === 'all' || testSuite === 'performance') {
        results.push(await this.runPerformanceTests());
      }

      if (testSuite === 'all' || testSuite === 'hover') {
        results.push(await this.runHoverTests());
      }

      const report = this.generateReport();
      this.displaySummary(report);

      const allPassed = results.every(result => result === true);
      
      if (allPassed) {
        this.log('🎉 All tests passed successfully!', 'success');
        process.exit(0);
      } else {
        this.log('❌ Some tests failed. Check the output above for details.', 'error');
        process.exit(1);
      }

    } catch (error) {
      this.log(`💥 Test runner failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner;