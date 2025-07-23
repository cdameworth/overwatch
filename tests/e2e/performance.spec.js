// Performance tests for Overwatch Infrastructure Monitor
const { test, expect } = require('@playwright/test');
const { GraphTestHelpers } = require('../helpers/test-helpers');

test.describe('Performance Tests', () => {
  let graphHelpers;

  test.beforeEach(async ({ page }) => {
    graphHelpers = new GraphTestHelpers(page);
  });

  test('should load page within acceptable time limits @performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`Page load time: ${loadTime}ms`);
  });

  test('should render graph within performance budget @performance', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    await graphHelpers.waitForGraphLoad();
    const renderTime = Date.now() - startTime;
    
    // Graph should render within 8 seconds for complex layouts
    expect(renderTime).toBeLessThan(8000);
    
    console.log(`Graph render time: ${renderTime}ms`);
  });

  test('should respond to hover interactions quickly @performance', async ({ page }) => {
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    const nodes = await graphHelpers.getVisibleNodes();
    expect(nodes.length).toBeGreaterThan(0);
    
    // Measure hover response time
    const hoverTimes = [];
    
    for (let i = 0; i < Math.min(5, nodes.length); i++) {
      const startTime = Date.now();
      
      await nodes[i].hover();
      await expect(page.locator('#hover-card')).toBeVisible();
      
      const hoverTime = Date.now() - startTime;
      hoverTimes.push(hoverTime);
      
      // Move mouse away to hide card
      await page.mouse.move(50, 50);
      await page.waitForTimeout(100);
    }
    
    const avgHoverTime = hoverTimes.reduce((a, b) => a + b, 0) / hoverTimes.length;
    
    // Hover response should be under 200ms on average
    expect(avgHoverTime).toBeLessThan(200);
    
    console.log(`Average hover response time: ${avgHoverTime}ms`);
    console.log(`Hover times: ${hoverTimes.join(', ')}ms`);
  });

  test('should handle zoom operations smoothly @performance', async ({ page }) => {
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    const zoomInBtn = page.locator('#zoom-in-btn');
    const zoomOutBtn = page.locator('#zoom-out-btn');
    
    // Measure zoom operation times
    const zoomTimes = [];
    
    // Zoom in operations
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      await zoomInBtn.click();
      await page.waitForTimeout(300); // Wait for zoom animation
      const zoomTime = Date.now() - startTime;
      zoomTimes.push(zoomTime);
    }
    
    // Zoom out operations
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      await zoomOutBtn.click();
      await page.waitForTimeout(300); // Wait for zoom animation
      const zoomTime = Date.now() - startTime;
      zoomTimes.push(zoomTime);
    }
    
    const avgZoomTime = zoomTimes.reduce((a, b) => a + b, 0) / zoomTimes.length;
    
    // Zoom operations should be under 500ms on average
    expect(avgZoomTime).toBeLessThan(500);
    
    console.log(`Average zoom time: ${avgZoomTime}ms`);
  });

  test('should handle pan operations smoothly @performance', async ({ page }) => {
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    const graph = page.locator('#graph');
    
    const panTimes = [];
    
    // Perform multiple pan operations
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      await graph.hover();
      await page.mouse.down();
      await page.mouse.move(i * 50, i * 50);
      await page.mouse.up();
      
      await page.waitForTimeout(200); // Wait for pan animation
      
      const panTime = Date.now() - startTime;
      panTimes.push(panTime);
    }
    
    const avgPanTime = panTimes.reduce((a, b) => a + b, 0) / panTimes.length;
    
    // Pan operations should be under 400ms on average
    expect(avgPanTime).toBeLessThan(400);
    
    console.log(`Average pan time: ${avgPanTime}ms`);
  });

  test('should maintain performance with many hover interactions @performance', async ({ page }) => {
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    const nodes = await graphHelpers.getVisibleNodes();
    const nodeCount = Math.min(20, nodes.length);
    
    if (nodeCount > 0) {
      const startTime = Date.now();
      
      // Rapidly hover over many nodes
      for (let i = 0; i < nodeCount; i++) {
        await nodes[i % nodes.length].hover();
        // Very brief pause to allow hover processing
        await page.waitForTimeout(10);
      }
      
      const totalTime = Date.now() - startTime;
      const timePerHover = totalTime / nodeCount;
      
      // Should handle rapid hovers efficiently (under 50ms per hover)
      expect(timePerHover).toBeLessThan(50);
      
      console.log(`Time per hover interaction: ${timePerHover}ms`);
    }
  });

  test('should handle memory efficiently during extended use @performance', async ({ page }) => {
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    // Get initial memory metrics
    let memoryInfo = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        };
      }
      return null;
    });
    
    if (memoryInfo) {
      const initialMemory = memoryInfo.usedJSHeapSize;
      
      // Simulate extended interaction
      const nodes = await graphHelpers.getVisibleNodes();
      
      for (let cycle = 0; cycle < 10; cycle++) {
        // Hover over nodes
        for (let i = 0; i < Math.min(5, nodes.length); i++) {
          await nodes[i].hover();
          await page.waitForTimeout(50);
        }
        
        // Zoom operations
        await page.locator('#zoom-in-btn').click();
        await page.waitForTimeout(100);
        await page.locator('#zoom-out-btn').click();
        await page.waitForTimeout(100);
        
        // Pan operations
        const graph = page.locator('#graph');
        await graph.hover();
        await page.mouse.down();
        await page.mouse.move(cycle * 10, cycle * 10);
        await page.mouse.up();
        await page.waitForTimeout(100);
      }
      
      // Check final memory usage
      memoryInfo = await page.evaluate(() => performance.memory);
      const finalMemory = memoryInfo.usedJSHeapSize;
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      // Memory growth should be reasonable (under 50MB for extended interactions)
      expect(memoryGrowthMB).toBeLessThan(50);
      
      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
      console.log(`Initial memory: ${(initialMemory / (1024 * 1024)).toFixed(2)}MB`);
      console.log(`Final memory: ${(finalMemory / (1024 * 1024)).toFixed(2)}MB`);
    }
  });

  test('should load and parse API data efficiently @performance', async ({ page }) => {
    // Intercept API call to measure response time
    let apiResponseTime;
    
    await page.route('**/api/parse', async (route, request) => {
      const startTime = Date.now();
      const response = await route.fetch();
      apiResponseTime = Date.now() - startTime;
      
      await route.fulfill({ response });
    });
    
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    // API should respond within 2 seconds
    expect(apiResponseTime).toBeLessThan(2000);
    
    console.log(`API response time: ${apiResponseTime}ms`);
  });

  test('should render large datasets efficiently @performance', async ({ page }) => {
    // This test assumes we can control the dataset size
    // In a real scenario, you might use a different endpoint or mock data
    
    // Mock a large dataset
    const largeDataset = {
      applications: Array.from({ length: 10 }, (_, appIndex) => ({
        id: `app-${appIndex}`,
        name: `Application ${appIndex}`,
        resources: Array.from({ length: 20 }, (_, resIndex) => ({
          id: `res-${appIndex}-${resIndex}`,
          name: `resource-${appIndex}-${resIndex}`,
          type: 'aws_lambda_function',
          configuration: { runtime: 'nodejs18.x' },
          dependencies: []
        }))
      }))
    };
    
    await page.route('**/api/parse', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset),
      });
    });
    
    const startTime = Date.now();
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    const renderTime = Date.now() - startTime;
    
    // Should handle large datasets within reasonable time (15 seconds)
    expect(renderTime).toBeLessThan(15000);
    
    console.log(`Large dataset render time: ${renderTime}ms`);
    
    // Verify all nodes are rendered
    const nodeCount = await page.locator('.node-group').count();
    expect(nodeCount).toBeGreaterThan(100); // Should have many nodes
    
    console.log(`Rendered ${nodeCount} nodes`);
  });

  test('should maintain performance during concurrent interactions @performance', async ({ page }) => {
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    const nodes = await graphHelpers.getVisibleNodes();
    
    if (nodes.length > 0) {
      const startTime = Date.now();
      
      // Simulate concurrent interactions
      const promises = [
        // Hover interactions
        (async () => {
          for (let i = 0; i < 10; i++) {
            await nodes[i % nodes.length].hover();
            await page.waitForTimeout(20);
          }
        })(),
        
        // Zoom interactions
        (async () => {
          for (let i = 0; i < 3; i++) {
            await page.locator('#zoom-in-btn').click();
            await page.waitForTimeout(100);
          }
        })(),
        
        // Pan interactions
        (async () => {
          const graph = page.locator('#graph');
          for (let i = 0; i < 3; i++) {
            await graph.hover();
            await page.mouse.down();
            await page.mouse.move(i * 30, i * 30);
            await page.mouse.up();
            await page.waitForTimeout(100);
          }
        })(),
      ];
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      
      // Concurrent operations should complete within reasonable time
      expect(totalTime).toBeLessThan(5000);
      
      console.log(`Concurrent operations completed in: ${totalTime}ms`);
    }
  });

  test('should collect and report performance metrics @performance', async ({ page }) => {
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    // Collect comprehensive performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');
      
      return {
        navigation: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstByte: navigation.responseStart - navigation.requestStart,
        },
        paint: {
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || null,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
        },
        resources: {
          total: resources.length,
          totalTransferSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
          scripts: resources.filter(r => r.name.includes('.js')).length,
          styles: resources.filter(r => r.name.includes('.css')).length,
          images: resources.filter(r => r.name.includes('.svg') || r.name.includes('.png')).length,
        },
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        } : null,
      };
    });
    
    // Log metrics for monitoring
    console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));
    
    // Assert reasonable performance thresholds
    expect(metrics.navigation.domContentLoaded).toBeLessThan(3000);
    expect(metrics.navigation.loadComplete).toBeLessThan(5000);
    
    if (metrics.paint.firstContentfulPaint) {
      expect(metrics.paint.firstContentfulPaint).toBeLessThan(3000);
    }
    
    if (metrics.memory) {
      const memoryUsageMB = metrics.memory.usedJSHeapSize / (1024 * 1024);
      expect(memoryUsageMB).toBeLessThan(100); // Under 100MB
    }
  });

  test('should maintain smooth animations @performance', async ({ page }) => {
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    // Test animation smoothness by measuring frame rate during interactions
    let frameCount = 0;
    let animationRunning = true;
    
    // Start frame counting
    await page.evaluate(() => {
      let frames = 0;
      window.frameCounter = { count: 0 };
      
      function countFrames() {
        window.frameCounter.count++;
        if (window.frameCounter.running) {
          requestAnimationFrame(countFrames);
        }
      }
      
      window.frameCounter.running = true;
      countFrames();
    });
    
    // Perform animations that should be smooth
    const startTime = Date.now();
    
    // Zoom animation
    await page.locator('#zoom-in-btn').click();
    await page.waitForTimeout(500);
    
    // Pan animation
    const graph = page.locator('#graph');
    await graph.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Stop frame counting
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    frameCount = await page.evaluate(() => {
      window.frameCounter.running = false;
      return window.frameCounter.count;
    });
    
    const fps = (frameCount / duration) * 1000;
    
    // Should maintain reasonable frame rate (above 30 FPS)
    expect(fps).toBeGreaterThan(30);
    
    console.log(`Animation FPS: ${fps.toFixed(2)}`);
    console.log(`Frame count: ${frameCount} in ${duration}ms`);
  });
});