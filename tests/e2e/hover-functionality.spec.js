// Hover functionality tests for Overwatch Infrastructure Monitor
const { test, expect } = require('@playwright/test');
const { GraphTestHelpers, APITestHelpers } = require('../helpers/test-helpers');

test.describe('Hover Functionality Tests', () => {
  let graphHelpers;
  let apiHelpers;

  test.beforeEach(async ({ page }) => {
    graphHelpers = new GraphTestHelpers(page);
    apiHelpers = new APITestHelpers(page);
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the graph to load
    await graphHelpers.waitForGraphLoad();
  });

  test('should display hover card when hovering over AWS resource nodes @hover', async ({ page }) => {
    // Enable DevTools for detailed debugging
    const client = await page.context().newCDPSession(page);
    await client.send('Runtime.enable');
    await client.send('DOM.enable');
    
    const nodes = await graphHelpers.getVisibleNodes();
    expect(nodes.length).toBeGreaterThan(0);

    // Debug pointer events using DevTools
    console.log('🔍 DEBUGGING POINTER EVENTS WITH DEVTOOLS:');
    
    // Get detailed info about the first node
    const firstNode = nodes[0];
    const nodeInfo = await page.evaluate(() => {
      const element = document.querySelector('.node-group');
      if (!element) return { error: 'No .node-group found' };
      
      const svg = document.querySelector('#graph svg');
      const rect = element.getBoundingClientRect();
      const svgRect = svg ? svg.getBoundingClientRect() : null;
      
      return {
        nodeExists: !!element,
        nodeClass: element.className.baseVal || element.className,
        nodeTransform: element.getAttribute('transform'),
        nodePosition: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        svgPosition: svgRect ? { x: svgRect.x, y: svgRect.y, width: svgRect.width, height: svgRect.height } : null,
        nodeComputedStyle: window.getComputedStyle(element).pointerEvents,
        svgComputedStyle: svg ? window.getComputedStyle(svg).pointerEvents : null,
        elementAtPoint: document.elementFromPoint(rect.x + rect.width/2, rect.y + rect.height/2)?.tagName
      };
    });
    
    console.log('Node debug info:', JSON.stringify(nodeInfo, null, 2));
    
    // Test manual hover event
    const manualHoverResult = await page.evaluate(() => {
      const node = document.querySelector('.node-group');
      if (!node) return { error: 'No node found' };
      
      const rect = node.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      
      // Dispatch mouseover event manually
      const mouseOverEvent = new MouseEvent('mouseover', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      });
      
      let eventReceived = false;
      node.addEventListener('mouseover', () => { eventReceived = true; }, { once: true });
      
      node.dispatchEvent(mouseOverEvent);
      
      // Wait a moment and check if hover card was created
      setTimeout(() => {}, 100);
      const hoverCard = document.getElementById('hover-card');
      
      return {
        eventDispatched: true,
        eventReceived: eventReceived,
        hoverCardExists: !!hoverCard,
        hoverCardVisible: hoverCard ? (hoverCard.style.opacity !== '0' && hoverCard.style.display !== 'none') : false
      };
    });
    
    console.log('Manual hover test result:', JSON.stringify(manualHoverResult, null, 2));

    // Test hover on the first available node
    await firstNode.hover();

    // Verify hover card appears
    const hoverCard = page.locator('#hover-card');
    await expect(hoverCard).toBeVisible({ timeout: 1000 });

    // Verify hover card has expected structure
    await expect(hoverCard.locator('.resource-name, .detail-title')).toBeVisible();
    await expect(hoverCard.locator('.resource-type, .resource-details')).toBeVisible();
  });

  test('should show correct resource information in hover card @hover', async ({ page }) => {
    // Look for a specific resource type (lambda function)
    const lambdaNode = await graphHelpers.getNodeByIdentifier('aws_lambda_function');
    
    if (await lambdaNode.count() > 0) {
      await lambdaNode.hover();
      
      const hoverCard = page.locator('#hover-card');
      await expect(hoverCard).toBeVisible();
      
      // Verify lambda-specific information
      await expect(hoverCard).toContainText('lambda');
      
      // Verify AWS icon is displayed
      await expect(hoverCard.locator('img[src*="lambda.svg"]')).toBeVisible();
    }
  });

  test('should position hover card correctly relative to cursor @hover', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    const firstNode = nodes[0];
    
    // Get node position
    const nodeBox = await firstNode.boundingBox();
    
    // Hover over the node
    await firstNode.hover();
    
    const hoverCard = page.locator('#hover-card');
    await expect(hoverCard).toBeVisible();
    
    // Get hover card position
    const cardBox = await hoverCard.boundingBox();
    
    // Verify card is positioned near the node (within reasonable bounds)
    expect(Math.abs(cardBox.x - nodeBox.x)).toBeLessThan(400);
    expect(Math.abs(cardBox.y - nodeBox.y)).toBeLessThan(400);
  });

  test('should hide hover card when mouse leaves node area @hover', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    const firstNode = nodes[0];
    
    // Show hover card
    await firstNode.hover();
    await expect(page.locator('#hover-card')).toBeVisible();
    
    // Move mouse to empty area
    await page.mouse.move(50, 50);
    
    // Verify hover card disappears
    await expect(page.locator('#hover-card')).toBeHidden({ timeout: 2000 });
  });

  test('should handle rapid mouse movement across multiple nodes @hover', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    
    if (nodes.length >= 3) {
      // Rapidly hover over multiple nodes
      for (let i = 0; i < Math.min(3, nodes.length); i++) {
        await nodes[i].hover({ timeout: 500 });
        await page.waitForTimeout(100);
      }
      
      // Ensure only one hover card is visible at most
      const hoverCardCount = await page.locator('#hover-card').count();
      expect(hoverCardCount).toBeLessThanOrEqual(1);
    }
  });

  test('should not show multiple hover cards simultaneously @hover', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    
    if (nodes.length >= 2) {
      // Hover over first node
      await nodes[0].hover();
      await expect(page.locator('#hover-card')).toBeVisible();
      
      // Quickly hover over second node
      await nodes[1].hover();
      
      // Verify only one hover card exists
      const hoverCardCount = await page.locator('#hover-card').count();
      expect(hoverCardCount).toBeLessThanOrEqual(1);
    }
  });

  test('should hide hover card when clicking elsewhere @hover', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    const firstNode = nodes[0];
    
    // Show hover card
    await firstNode.hover();
    await expect(page.locator('#hover-card')).toBeVisible();
    
    // Click on empty area
    await page.click('#graph-container', { position: { x: 100, y: 100 } });
    
    // Verify hover card is hidden
    await expect(page.locator('#hover-card')).toBeHidden({ timeout: 1000 });
  });

  test('should hide hover card when pressing Escape key @hover', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    const firstNode = nodes[0];
    
    // Show hover card
    await firstNode.hover();
    await expect(page.locator('#hover-card')).toBeVisible();
    
    // Press Escape key
    await page.keyboard.press('Escape');
    
    // Verify hover card is hidden
    await expect(page.locator('#hover-card')).toBeHidden({ timeout: 1000 });
  });

  test('should work correctly during zoom operations @hover', async ({ page }) => {
    // Zoom in first
    await graphHelpers.testZoom(1.5);
    
    // Test hover functionality after zoom
    const nodes = await graphHelpers.getVisibleNodes();
    if (nodes.length > 0) {
      await nodes[0].hover();
      await expect(page.locator('#hover-card')).toBeVisible({ timeout: 1000 });
    }
  });

  test('should work correctly during pan operations @hover', async ({ page }) => {
    // Pan the graph
    await graphHelpers.testPan();
    
    // Test hover functionality after pan
    const nodes = await graphHelpers.getVisibleNodes();
    if (nodes.length > 0) {
      await nodes[0].hover();
      await expect(page.locator('#hover-card')).toBeVisible({ timeout: 1000 });
    }
  });

  test('should not be blocked by app boundary containers @hover', async ({ page }) => {
    // Test that app boundaries don't interfere with hover
    await graphHelpers.testAppBoundaryInteractions();
  });

  test('should display configuration details for different AWS resource types @hover', async ({ page }) => {
    // Test different resource types if available
    const resourceTypes = [
      'aws_lambda_function',
      'aws_api_gateway_rest_api', 
      'aws_s3_bucket',
      'aws_dynamodb_table',
      'aws_iam_role'
    ];
    
    for (const resourceType of resourceTypes) {
      const node = await graphHelpers.getNodeByIdentifier(resourceType);
      
      if (await node.count() > 0) {
        await node.hover();
        
        const hoverCard = page.locator('#hover-card');
        await expect(hoverCard).toBeVisible();
        
        // Verify resource type is mentioned in the card
        await expect(hoverCard).toContainText(resourceType.replace('aws_', '').replace(/_/g, ' '));
        
        // Move mouse away to hide card
        await page.mouse.move(50, 50);
        await expect(hoverCard).toBeHidden({ timeout: 1000 });
      }
    }
  });

  test('should handle hover during drag operations @hover', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    
    if (nodes.length > 0) {
      const firstNode = nodes[0];
      
      // Start dragging a node
      await firstNode.hover();
      await page.mouse.down();
      
      // Try to hover during drag - should not show hover card
      await page.mouse.move(200, 200);
      
      // Hover card should not appear during dragging
      const hoverCard = page.locator('#hover-card');
      await expect(hoverCard).toBeHidden({ timeout: 500 });
      
      // End drag
      await page.mouse.up();
      
      // Hover should work normally after drag ends
      await firstNode.hover();
      await expect(hoverCard).toBeVisible({ timeout: 1000 });
    }
  });

  test('should show dependency information in hover card @hover', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    
    // Find a node that likely has dependencies
    for (let i = 0; i < Math.min(3, nodes.length); i++) {
      await nodes[i].hover();
      
      const hoverCard = page.locator('#hover-card');
      await expect(hoverCard).toBeVisible();
      
      // Check if dependency information is shown
      const dependencyText = hoverCard.locator('.dependencies, .dependency-info');
      if (await dependencyText.count() > 0) {
        await expect(dependencyText).toBeVisible();
        break;
      }
      
      // Move to next node
      await page.mouse.move(50, 50);
      await page.waitForTimeout(300);
    }
  });

  test('should handle hover card positioning at screen edges @hover', async ({ page }) => {
    const nodes = await graphHelpers.getVisibleNodes();
    
    if (nodes.length > 0) {
      // Test hover near right edge
      await page.setViewportSize({ width: 800, height: 600 });
      
      const rightEdgeNode = nodes[0];
      await rightEdgeNode.hover();
      
      const hoverCard = page.locator('#hover-card');
      await expect(hoverCard).toBeVisible();
      
      // Verify hover card is within viewport bounds
      const cardBox = await hoverCard.boundingBox();
      const viewport = page.viewportSize();
      
      expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 50); // Allow small overflow
      expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(viewport.height + 50);
    }
  });

  test('should maintain hover functionality with different themes @hover', async ({ page }) => {
    // Test with different theme settings if available
    const themeToggle = page.locator('.theme-toggle, #theme-toggle');
    
    if (await themeToggle.count() > 0) {
      // Switch theme
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      // Test hover still works
      const nodes = await graphHelpers.getVisibleNodes();
      if (nodes.length > 0) {
        await nodes[0].hover();
        await expect(page.locator('#hover-card')).toBeVisible({ timeout: 1000 });
      }
    }
  });
});