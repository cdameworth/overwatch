# Testing Guide - Overwatch Infrastructure Monitor

## Overview

This comprehensive testing solution validates the D3.js-based web application's functionality, specifically focusing on hover interactions and UI responsiveness. The testing framework addresses the known issue with hover events being blocked by SVG elements or layering problems.

## Test Architecture

### 🧪 Test Types
- **Unit Tests**: Individual component and function testing using Jest
- **Integration Tests**: API-Frontend interaction validation
- **E2E Tests**: Complete user workflow testing with Playwright
- **Visual Regression**: Screenshot-based UI consistency validation
- **Performance Tests**: Speed and responsiveness benchmarking
- **Hover Functionality**: Dedicated tests for mouse event handling

### 🛠️ Technology Stack
- **Playwright**: Cross-browser E2E testing and automation
- **Jest**: Unit and integration testing framework
- **jsdom**: DOM simulation for unit tests
- **Pixelmatch**: Visual diff comparison
- **Lighthouse**: Performance auditing
- **Sinon**: Mocking and stubbing

## Quick Start

### 1. Install Dependencies
```bash
npm install
npm run test:setup  # Install Playwright browsers
```

### 2. Start the Application
```bash
# Terminal 1: Backend (port 4001)
npm run server

# Terminal 2: Frontend (port 3000)
npm run client
```

### 3. Run Tests
```bash
# Run all tests
npm run test:comprehensive

# Quick hover-only tests
npm run test:quick

# CI-friendly run
npm run test:ci

# Debug mode with browser window
npm run test:debug
```

## Available Test Commands

### Core Test Suites
```bash
npm test                    # Unit tests only
npm run test:e2e           # All E2E tests
npm run test:visual        # Visual regression tests
npm run test:performance   # Performance benchmarks
npm run test:hover         # Hover functionality tests
npm run test:all           # Unit + E2E tests
```

### Advanced Options
```bash
npm run test:e2e:headed    # E2E tests with visible browser
npm run test:e2e:debug     # E2E tests with debugger
npm run test:coverage      # Unit tests with coverage report
npm run test:watch         # Unit tests in watch mode
```

### Environment Variables
```bash
# Test configuration
HEADED=true              # Show browser during E2E tests
DEBUG=true              # Enable debug mode
CI=true                 # CI-optimized settings
SCREENSHOTS=false       # Disable screenshots
COVERAGE=false          # Disable coverage reporting
TEST_TIMEOUT=60000      # Test timeout in milliseconds
TEST_SUITE=hover        # Run specific test suite
```

## Test Structure

```
tests/
├── setup/                  # Test configuration
│   ├── jest.setup.js      # Jest configuration and mocks
│   ├── global-setup.js    # Playwright global setup
│   └── global-teardown.js # Playwright cleanup
├── helpers/               # Utility functions
│   └── test-helpers.js    # D3.js and UI interaction helpers
├── unit/                  # Unit tests
│   └── visualizer.test.js # OverwatchVisualizer class tests
├── integration/           # Integration tests
│   └── api-frontend.test.js # API-Frontend interaction tests
├── e2e/                   # End-to-end tests
│   ├── hover-functionality.spec.js # Hover interaction tests
│   ├── visual-regression.spec.js   # UI consistency tests
│   └── performance.spec.js         # Performance benchmarks
├── screenshots/           # Visual regression baselines
├── reports/              # Test output and reports
└── run-tests.js          # Comprehensive test runner
```

## Key Test Scenarios

### 🖱️ Hover Functionality Tests
- **Basic Hover Detection**: Mouse enters node area triggers hover card
- **Hover Card Content**: Resource details and AWS service icons display
- **Positioning**: Cards position correctly relative to cursor and screen edges
- **Cleanup**: Cards disappear when mouse leaves or ESC pressed
- **Rapid Movement**: No multiple cards accumulate during quick hovers
- **Event Blocking**: App boundaries don't interfere with node interactions
- **Zoom/Pan Integration**: Hover works correctly during graph transformations

### 👁️ Visual Regression Tests
- **Graph Layout**: D3.js force-directed layout consistency
- **AWS Icons**: Resource type icons render correctly
- **Hover Cards**: Consistent styling and animations
- **App Boundaries**: Container visualization doesn't block interactions
- **Dependency Links**: Line styling and cross-app link differentiation
- **Responsive Design**: Multiple viewport size compatibility

### ⚡ Performance Tests
- **Page Load Time**: Under 5 seconds initial load
- **Graph Rendering**: Under 8 seconds for complex layouts
- **Hover Response**: Under 200ms average response time
- **Memory Usage**: Stable memory during extended interactions
- **Animation Smoothness**: Maintain >30 FPS during interactions
- **Large Datasets**: Handle 100+ nodes efficiently

## Test Configuration

### Playwright Configuration (`playwright.config.js`)
```javascript
// Cross-browser testing
projects: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari']

// Automatic server startup
webServer: [
  { command: 'npm run server', url: 'http://localhost:4001' },
  { command: 'npm run client', url: 'http://localhost:3000' }
]

// Reporter configuration
reporter: ['html', 'json', 'junit', 'list']
```

### Jest Configuration (`package.json`)
```json
{
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/tests/setup/jest.setup.js"],
    "collectCoverageFrom": ["frontend/**/*.js", "backend/**/*.js"]
  }
}
```

## Test Helpers & Utilities

### GraphTestHelpers Class
Provides utilities for D3.js graph interactions:
- `waitForGraphLoad()`: Wait for complete graph rendering
- `getVisibleNodes()`: Get all rendered node elements
- `hoverOverNode(identifier)`: Hover and validate hover card
- `testZoom(level)`: Test zoom functionality
- `testPan()`: Test pan/drag functionality
- `verifyResourceCounts()`: Validate node/link counts

### APITestHelpers Class
Backend API interaction utilities:
- `testParseEndpoint()`: Validate /api/parse response
- `mockAPIResponse(data)`: Mock API for frontend-only testing

### VisualTestHelpers Class
Visual regression testing utilities:
- `takeScreenshot(name)`: Capture named screenshots
- `compareWithBaseline(name)`: Compare against baseline images
- `testResponsiveDesign()`: Multi-viewport testing

## Troubleshooting

### Common Issues

**Hover Tests Failing**
```bash
# Check if hover events are being blocked
npm run test:hover -- --headed --debug

# Verify event layering
playwright codegen http://localhost:3000
```

**Visual Tests Failing**
```bash
# Update baseline screenshots
npm run test:visual -- --update-snapshots

# Check pixel differences
npm run test:visual -- --reporter=html
```

**Performance Tests Failing**
```bash
# Run with verbose logging
DEBUG=true npm run test:performance

# Check system resources
npm run test:performance -- --workers=1
```

**Server Connection Issues**
```bash
# Verify servers are running
curl http://localhost:4001/api/parse
curl http://localhost:3000

# Check port availability
lsof -i :3000
lsof -i :4001
```

### Debug Mode

Enable debug mode for detailed test execution:
```bash
npm run test:debug
```

This will:
- Show browser windows during tests
- Enable verbose logging
- Pause on failures
- Generate detailed reports

### CI/CD Integration

For continuous integration:
```bash
# Optimized for CI environments
npm run test:ci
```

Features:
- Headless browser execution
- Parallel test limitation
- JUnit XML reporting
- Screenshot capture on failures
- Performance metrics collection

## Reporting

### Test Reports
- **HTML Report**: `tests/reports/html-report/index.html`
- **JSON Report**: `tests/reports/results.json`
- **JUnit XML**: `tests/reports/results.xml`
- **Coverage Report**: `coverage/lcov-report/index.html`

### Performance Metrics
```json
{
  "pageLoadTime": 2500,
  "hoverResponseTime": 85,
  "graphRenderTime": 4200,
  "memoryUsage": 45.2
}
```

### Visual Diff Reports
Screenshots and diff images are stored in:
- `tests/screenshots/`: Baseline images
- `test-results/`: Failure screenshots and diffs

## Best Practices

### Writing Tests
1. **Use descriptive test names** with `@tags` for filtering
2. **Wait for elements** instead of using fixed delays
3. **Clean up state** between tests
4. **Mock external dependencies** appropriately
5. **Test edge cases** like screen edges and rapid interactions

### Hover Testing
1. **Verify hover card appears** within reasonable time (100ms)
2. **Check positioning** relative to cursor and viewport
3. **Test cleanup** when mouse leaves or ESC pressed
4. **Validate content** includes expected resource details
5. **Ensure no blocking** by app boundaries or other elements

### Visual Testing
1. **Set consistent viewport sizes** for reliable comparisons
2. **Wait for animations** to complete before screenshots
3. **Use appropriate thresholds** for pixel differences (0.2-0.3)
4. **Update baselines** when legitimate UI changes occur

### Performance Testing
1. **Establish realistic budgets** based on application requirements
2. **Test with various dataset sizes** to ensure scalability
3. **Monitor memory usage** during extended interactions
4. **Measure actual user interactions** not just synthetic metrics

## Contributing

### Adding New Tests
1. Choose appropriate test type (unit/integration/e2e)
2. Use existing helpers and patterns
3. Add descriptive tags for filtering
4. Update this README if adding new test categories

### Modifying Existing Tests
1. Maintain backward compatibility
2. Update baselines for visual tests if needed
3. Adjust performance budgets if requirements change
4. Test across all supported browsers

---

**For questions or issues with the testing framework, please check the troubleshooting section above or review the test strategy document in `TEST-STRATEGY.md`.**