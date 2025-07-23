// Test helper utilities for Overwatch Infrastructure Monitor tests
const { expect } = require('@playwright/test');

/**
 * Test utilities for D3.js graph interactions
 */
class GraphTestHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Wait for the graph to load and render
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForGraphLoad(timeout = 10000) {
    // Wait for D3.js to load
    await this.page.waitForFunction(() => typeof window.d3 !== 'undefined', { timeout });
    
    // Wait for the graph container to be present
    await this.page.waitForSelector('#graph', { timeout });
    
    // Wait for loading overlay to disappear
    await this.page.waitForSelector('#loading-overlay', { state: 'hidden', timeout });
    
    // Wait for at least one node to be rendered
    await this.page.waitForSelector('.node-group', { timeout });
    
    // Wait for network idle to ensure all resources are loaded
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get all visible nodes on the graph
   */
  async getVisibleNodes() {
    return await this.page.locator('.node-group').all();
  }

  /**
   * Get a specific node by its resource name or type
   * @param {string} identifier - Resource name or type to find
   */
  async getNodeByIdentifier(identifier) {
    // Try to find by resource name first
    let node = this.page.locator('.node-group').filter({ hasText: identifier }).first();
    
    if (await node.count() === 0) {
      // Try to find by resource type
      node = this.page.locator('.node-group').filter({ has: this.page.locator(`[data-type="${identifier}"]`) }).first();
    }
    
    return node;
  }

  /**
   * Hover over a node and verify hover card appears
   * @param {string} nodeIdentifier - Node to hover over
   * @param {object} expectedContent - Expected content in hover card
   */
  async hoverOverNode(nodeIdentifier, expectedContent = {}) {
    const node = await this.getNodeByIdentifier(nodeIdentifier);
    await expect(node).toBeVisible();
    
    // Hover over the node
    await node.hover();
    
    // Wait for hover card to appear
    const hoverCard = this.page.locator('#hover-card');
    await expect(hoverCard).toBeVisible({ timeout: 1000 });
    
    // Verify hover card content if provided
    if (expectedContent.title) {
      await expect(hoverCard.locator('.resource-name')).toContainText(expectedContent.title);
    }
    
    if (expectedContent.type) {
      await expect(hoverCard.locator('.resource-type')).toContainText(expectedContent.type);
    }
    
    if (expectedContent.hasIcon) {
      await expect(hoverCard.locator('img[src*="icons/"]')).toBeVisible();
    }
    
    return hoverCard;
  }

  /**
   * Click on a node and verify detail panel opens
   * @param {string} nodeIdentifier - Node to click
   */
  async clickNode(nodeIdentifier) {
    const node = await this.getNodeByIdentifier(nodeIdentifier);
    await expect(node).toBeVisible();
    
    await node.click();
    
    // Wait for detail panel to open
    const detailPanel = this.page.locator('#detail-panel');
    await expect(detailPanel).toBeVisible({ timeout: 2000 });
    
    return detailPanel;
  }

  /**
   * Verify hover card disappears when moving mouse away
   * @param {string} nodeIdentifier - Node to test
   */
  async testHoverCardCleanup(nodeIdentifier) {
    // First hover to show the card
    await this.hoverOverNode(nodeIdentifier);
    
    // Move mouse away to somewhere safe
    await this.page.mouse.move(50, 50);
    
    // Wait for hover card to disappear
    const hoverCard = this.page.locator('#hover-card');
    await expect(hoverCard).toBeHidden({ timeout: 2000 });
  }

  /**
   * Test rapid hover movements across multiple nodes
   * @param {Array<string>} nodeIdentifiers - Nodes to hover over rapidly
   */
  async testRapidHover(nodeIdentifiers) {
    for (const identifier of nodeIdentifiers) {
      const node = await this.getNodeByIdentifier(identifier);
      if (await node.count() > 0) {
        await node.hover({ timeout: 500 });
        await this.page.waitForTimeout(100); // Brief pause
      }
    }
    
    // Ensure no multiple hover cards are visible
    const hoverCards = this.page.locator('#hover-card');
    const count = await hoverCards.count();
    expect(count).toBeLessThanOrEqual(1);
  }

  /**
   * Test zoom functionality
   * @param {number} zoomLevel - Zoom factor
   */
  async testZoom(zoomLevel = 2) {
    // Use zoom controls
    const zoomInBtn = this.page.locator('#zoom-in-btn');
    
    // Zoom in multiple times to reach desired level
    const clicks = Math.max(1, Math.floor(zoomLevel));
    for (let i = 0; i < clicks; i++) {
      await zoomInBtn.click();
      await this.page.waitForTimeout(200);
    }
    
    // Verify nodes are still interactive after zoom
    const nodes = await this.getVisibleNodes();
    if (nodes.length > 0) {
      await nodes[0].hover();
      await expect(this.page.locator('#hover-card')).toBeVisible({ timeout: 1000 });
    }
  }

  /**
   * Test pan functionality
   */
  async testPan() {
    const graph = this.page.locator('#graph');
    
    // Get initial position
    const initialBox = await graph.boundingBox();
    
    // Pan by dragging
    await graph.hover();
    await this.page.mouse.down();
    await this.page.mouse.move(initialBox.x + 100, initialBox.y + 100);
    await this.page.mouse.up();
    
    await this.page.waitForTimeout(500); // Allow animation to complete
    
    // Test that nodes are still interactive after pan
    const nodes = await this.getVisibleNodes();
    if (nodes.length > 0) {
      await nodes[0].hover();
      await expect(this.page.locator('#hover-card')).toBeVisible({ timeout: 1000 });
    }
  }

  /**
   * Get performance metrics for graph rendering
   */
  async getPerformanceMetrics() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || null,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
      };
    });
    
    return metrics;
  }

  /**
   * Count visible resources and verify they match expected numbers
   * @param {object} expected - Expected counts { nodes, apps, links }
   */
  async verifyResourceCounts(expected = {}) {
    if (expected.nodes) {
      const nodeCount = await this.page.locator('.node-group').count();
      expect(nodeCount).toBeGreaterThanOrEqual(expected.nodes);
    }
    
    if (expected.links) {
      const linkCount = await this.page.locator('.link').count();
      expect(linkCount).toBeGreaterThanOrEqual(expected.links);
    }
    
    if (expected.apps) {
      const appCount = await this.page.locator('.app-boundary').count();
      expect(appCount).toBeGreaterThanOrEqual(expected.apps);
    }
  }

  /**
   * Verify that app boundaries don't block node interactions
   */
  async testAppBoundaryInteractions() {
    const appBoundaries = this.page.locator('.app-boundary');
    const boundaryCount = await appBoundaries.count();
    
    if (boundaryCount > 0) {
      // Get a node that should be inside an app boundary
      const nodes = await this.getVisibleNodes();
      
      if (nodes.length > 0) {
        // Ensure node is still hoverable even with app boundary present
        await nodes[0].hover();
        await expect(this.page.locator('#hover-card')).toBeVisible({ timeout: 1000 });
        
        // Ensure node is still clickable
        await nodes[0].click();
        await expect(this.page.locator('#detail-panel')).toBeVisible({ timeout: 2000 });
        
        // Close detail panel
        await this.page.locator('#detail-close').click();
      }
    }
  }

  /**
   * Test cross-application dependency link styling
   */
  async verifyCrossAppLinks() {
    const crossAppLinks = this.page.locator('.link[stroke-dasharray]');
    const crossAppCount = await crossAppLinks.count();
    
    if (crossAppCount > 0) {
      // Verify cross-app links have different styling
      const firstCrossAppLink = crossAppLinks.first();
      const strokeWidth = await firstCrossAppLink.getAttribute('stroke-width');
      expect(parseFloat(strokeWidth)).toBeGreaterThan(2); // Should be thicker
      
      const dashArray = await firstCrossAppLink.getAttribute('stroke-dasharray');
      expect(dashArray).not.toBe('none'); // Should be dashed
    }
  }

  /**
   * Test keyboard navigation and accessibility
   */
  async testKeyboardNavigation() {
    // Focus on the graph container
    await this.page.locator('#graph-container').focus();
    
    // Test escape key to close hover card
    const nodes = await this.getVisibleNodes();
    if (nodes.length > 0) {
      await nodes[0].hover();
      await expect(this.page.locator('#hover-card')).toBeVisible();
      
      await this.page.keyboard.press('Escape');
      await expect(this.page.locator('#hover-card')).toBeHidden({ timeout: 1000 });
    }
  }
}

/**
 * Backend API test helpers
 */
class APITestHelpers {
  constructor(page) {
    this.page = page;
    this.baseURL = 'http://localhost:4001';
  }

  /**
   * Test the /api/parse endpoint
   */
  async testParseEndpoint() {
    const response = await this.page.request.get(`${this.baseURL}/api/parse`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('applications');
    expect(Array.isArray(data.applications)).toBe(true);
    
    return data;
  }

  /**
   * Mock API response for testing frontend in isolation
   */
  async mockAPIResponse(mockData) {
    await this.page.route('**/api/parse', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData),
      });
    });
  }
}

/**
 * Visual regression test helpers
 */
class VisualTestHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Take a screenshot for visual comparison
   * @param {string} name - Screenshot name
   * @param {object} options - Screenshot options
   */
  async takeScreenshot(name, options = {}) {
    const defaultOptions = {
      fullPage: true,
      threshold: 0.2,
      ...options,
    };
    
    await this.page.screenshot({
      path: `tests/screenshots/${name}.png`,
      ...defaultOptions,
    });
  }

  /**
   * Compare current state with baseline screenshot
   * @param {string} name - Test name
   */
  async compareWithBaseline(name) {
    await expect(this.page).toHaveScreenshot(`${name}.png`);
  }

  /**
   * Test responsive design at different viewport sizes
   */
  async testResponsiveDesign() {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ];
    
    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      await this.page.waitForTimeout(500); // Allow layout to settle
      await this.takeScreenshot(`responsive-${viewport.name}`);
    }
  }
}

module.exports = {
  GraphTestHelpers,
  APITestHelpers,
  VisualTestHelpers,
};