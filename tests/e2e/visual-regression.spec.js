// Visual regression tests for D3.js graph rendering
const { test, expect } = require('@playwright/test');
const { GraphTestHelpers, VisualTestHelpers } = require('../helpers/test-helpers');

test.describe('Visual Regression Tests', () => {
  let graphHelpers;
  let visualHelpers;

  test.beforeEach(async ({ page }) => {
    graphHelpers = new GraphTestHelpers(page);
    visualHelpers = new VisualTestHelpers(page);
    
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
  });

  test('should render graph layout consistently @visual', async ({ page }) => {
    // Set consistent viewport for screenshot comparison
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Wait for any animations to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot and compare with baseline
    await expect(page).toHaveScreenshot('graph-layout-desktop.png', {
      threshold: 0.3, // Allow for minor variations in D3.js positioning
      fullPage: true,
    });
  });

  test('should render AWS resource icons correctly @visual', async ({ page }) => {
    // Focus on the graph area specifically
    const graphContainer = page.locator('#graph-container');
    
    await expect(graphContainer).toHaveScreenshot('aws-resource-icons.png', {
      threshold: 0.2,
    });
  });

  test('should display hover card with consistent styling @visual', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    
    if (nodes.length > 0) {
      // Hover over first node
      await nodes[0].hover();
      
      const hoverCard = page.locator('#hover-card');
      await expect(hoverCard).toBeVisible();
      
      // Wait for hover card animation to complete
      await page.waitForTimeout(500);
      
      // Screenshot just the hover card area
      await expect(hoverCard).toHaveScreenshot('hover-card-styling.png', {
        threshold: 0.2,
      });
    }
  });

  test('should render app boundary containers consistently @visual', async ({ page }) => {
    // Check if app boundaries are present
    const appBoundaries = page.locator('.app-boundary');
    const boundaryCount = await appBoundaries.count();
    
    if (boundaryCount > 0) {
      await expect(page.locator('#graph')).toHaveScreenshot('app-boundaries.png', {
        threshold: 0.3,
      });
    }
  });

  test('should render dependency links with correct styling @visual', async ({ page }) => {
    // Focus on the SVG links area
    const links = page.locator('.link');
    const linkCount = await links.count();
    
    if (linkCount > 0) {
      // Take screenshot of the graph area showing links
      await expect(page.locator('#graph')).toHaveScreenshot('dependency-links.png', {
        threshold: 0.3,
      });
    }
  });

  test('should render cross-application links with special styling @visual', async ({ page }) => {
    // Look for cross-application links (dashed lines)
    const crossAppLinks = page.locator('.link[stroke-dasharray]');
    const crossLinkCount = await crossAppLinks.count();
    
    if (crossLinkCount > 0) {
      await expect(page.locator('#graph')).toHaveScreenshot('cross-app-links.png', {
        threshold: 0.3,
      });
    }
  });

  test('should maintain visual consistency after zoom operations @visual', async ({ page }) => {
    // Zoom in
    const zoomInBtn = page.locator('#zoom-in-btn');
    await zoomInBtn.click();
    await zoomInBtn.click(); // Zoom in twice
    
    // Wait for zoom animation to complete
    await page.waitForTimeout(1000);
    
    await expect(page.locator('#graph-container')).toHaveScreenshot('zoomed-in-view.png', {
      threshold: 0.4, // Higher threshold due to zoom positioning variations
    });
  });

  test('should maintain visual consistency after pan operations @visual', async ({ page }) => {
    // Pan the graph by dragging
    const graph = page.locator('#graph');
    await graph.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    
    // Wait for pan animation to complete
    await page.waitForTimeout(1000);
    
    await expect(page.locator('#graph-container')).toHaveScreenshot('panned-view.png', {
      threshold: 0.4,
    });
  });

  test('should render detail panel consistently @visual', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    
    if (nodes.length > 0) {
      // Click on a node to open detail panel
      await nodes[0].click();
      
      const detailPanel = page.locator('#detail-panel');
      await expect(detailPanel).toBeVisible();
      
      // Wait for panel animation
      await page.waitForTimeout(500);
      
      await expect(detailPanel).toHaveScreenshot('detail-panel.png', {
        threshold: 0.2,
      });
      
      // Close the panel for cleanup
      await page.locator('#detail-close').click();
    }
  });

  test('should render sidebar with consistent styling @visual', async ({ page }) => {
    const sidebar = page.locator('.sidebar');
    
    await expect(sidebar).toHaveScreenshot('sidebar-layout.png', {
      threshold: 0.2,
    });
  });

  test('should render graph controls consistently @visual', async ({ page }) => {
    const graphControls = page.locator('.graph-controls');
    
    await expect(graphControls).toHaveScreenshot('graph-controls.png', {
      threshold: 0.2,
    });
  });

  test('should handle responsive design correctly @visual', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Wait for layout to adjust
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot(`responsive-${viewport.name}.png`, {
        fullPage: true,
        threshold: 0.3,
      });
    }
  });

  test('should render loading states consistently @visual', async ({ page }) => {
    // Navigate to a fresh page to catch loading state
    const newPage = await page.context().newPage();
    
    // Navigate but don't wait for load
    await newPage.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Try to capture loading overlay
    const loadingOverlay = newPage.locator('#loading-overlay');
    if (await loadingOverlay.isVisible()) {
      await expect(loadingOverlay).toHaveScreenshot('loading-state.png', {
        threshold: 0.2,
      });
    }
    
    await newPage.close();
  });

  test('should render empty state consistently if no data @visual', async ({ page }) => {
    // Mock empty API response
    await page.route('**/api/parse', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ applications: [] }),
      });
    });
    
    // Navigate to fresh page with mocked empty response
    const newPage = await page.context().newPage();
    await newPage.goto('/');
    
    // Wait for empty state to render
    await newPage.waitForTimeout(2000);
    
    await expect(newPage.locator('#graph-container')).toHaveScreenshot('empty-state.png', {
      threshold: 0.2,
    });
    
    await newPage.close();
  });

  test('should render filter controls consistently @visual', async ({ page }) => {
    const filterSection = page.locator('.filter-group');
    
    if (await filterSection.count() > 0) {
      await expect(filterSection).toHaveScreenshot('filter-controls.png', {
        threshold: 0.2,
      });
    }
  });

  test('should render minimap consistently @visual', async ({ page }) => {
    const minimap = page.locator('#minimap');
    
    if (await minimap.isVisible()) {
      await expect(minimap).toHaveScreenshot('minimap.png', {
        threshold: 0.3,
      });
    }
  });

  test('should maintain consistent node positioning after interactions @visual', async ({ page }) => {
    // Perform several interactions that might affect node positions
    const nodes = await graphHelpers.getVisibleNodes();
    
    if (nodes.length >= 2) {
      // Hover over multiple nodes
      await nodes[0].hover();
      await page.waitForTimeout(200);
      await nodes[1].hover();
      await page.waitForTimeout(200);
      
      // Click on a node
      await nodes[0].click();
      await page.waitForTimeout(500);
      
      // Close detail panel
      await page.locator('#detail-close').click();
      await page.waitForTimeout(500);
      
      // Take final screenshot to ensure stability
      await expect(page.locator('#graph')).toHaveScreenshot('post-interaction-layout.png', {
        threshold: 0.4, // Allow for some variation after interactions
      });
    }
  });

  test('should render tooltips and help text consistently @visual', async ({ page }) => {
    // Test any help tooltips or info icons
    const helpIcons = page.locator('.help-icon, .info-icon, [title]');
    const helpCount = await helpIcons.count();
    
    if (helpCount > 0) {
      // Hover over first help icon to show tooltip
      await helpIcons.first().hover();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('help-tooltips.png', {
        threshold: 0.2,
      });
    }
  });

  test('should render error states consistently @visual', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/parse', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });
    
    // Navigate to fresh page with mocked error
    const newPage = await page.context().newPage();
    await newPage.goto('/');
    
    // Wait for error state to render
    await newPage.waitForTimeout(3000);
    
    // Look for error messages or states
    const errorElements = newPage.locator('.error, .error-message, .alert-danger');
    if (await errorElements.count() > 0) {
      await expect(errorElements.first()).toHaveScreenshot('error-state.png', {
        threshold: 0.2,
      });
    }
    
    await newPage.close();
  });
});