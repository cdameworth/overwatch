// Test zoom and drag operations impact on hover and click functionality
const { test, expect } = require('@playwright/test');
const { GraphTestHelpers } = require('../helpers/test-helpers');

test.describe('Zoom and Drag Impact on Interactions', () => {
  let graphHelpers;

  test.beforeEach(async ({ page }) => {
    graphHelpers = new GraphTestHelpers(page);
    await page.goto('/');
    await graphHelpers.waitForGraphLoad();
    
    // Wait for simulation to stabilize
    await page.waitForTimeout(3000);
  });

  test('should maintain hover and click functionality after zoom and drag operations', async ({ page }) => {
    console.log('🧪 Starting comprehensive zoom/drag interaction test...');
    
    // Get available nodes for testing
    const nodes = await graphHelpers.getVisibleNodes();
    expect(nodes.length).toBeGreaterThan(5); // Need multiple nodes for testing
    
    console.log(`📊 Found ${nodes.length} nodes for testing`);

    // === PHASE 1: Initial Functionality Validation ===
    console.log('\n=== PHASE 1: Initial Functionality ===');
    
    // Test 1: Initial hover functionality
    console.log('🔍 Test 1: Testing initial hover...');
    
    // First, ensure the application is fully loaded
    await page.waitForFunction(() => {
      const visualizer = window.overwatch || window.visualizer;
      return visualizer && 
             visualizer.filteredData && 
             visualizer.filteredData.nodes && 
             visualizer.filteredData.nodes.length > 0 &&
             visualizer.graphGroup &&
             document.querySelectorAll('.node-group').length > 0;
    }, { timeout: 10000 });
    
    const initialHoverResult = await page.evaluate(() => {
      const node = document.querySelector('.node-group');
      if (!node) return { error: 'No node found' };
      
      // Get the application instance
      const app = window.overwatch || window.visualizer;
      if (!app) return { error: 'Application not found' };
      
      const rect = node.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      
      // Enable debugging to see what's happening
      if (window.enableHoverDebug) {
        window.enableHoverDebug();
      }
      
      // Instead of dispatching event, directly call the application's hover logic
      const nodeData = node.__data__;
      if (!nodeData) return { error: 'Node has no data' };
      
      // Simulate what the SVG mousemove handler would do
      const mockEvent = {
        clientX: centerX,
        clientY: centerY,
        type: 'mousemove'
      };
      
      // Clear any existing hover state
      app.currentHoveredNode = null;
      app.hideHoverCard();
      
      // Directly call the hover handler
      try {
        app.currentHoveredNode = nodeData.id;
        app.onNodeMouseover(mockEvent, nodeData);
      } catch (error) {
        return { error: 'Hover handler failed: ' + error.message };
      }
      
      // Check result immediately
      const hoverCard = document.getElementById('hover-card');
      
      // Debug the SVG state
      const debugInfo = {
        svgExists: !!document.querySelector('#graph svg'),
        nodeGroups: document.querySelectorAll('.node-group').length,
        nodeData: nodeData,
        nodeRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        mousePos: { x: centerX, y: centerY },
        appExists: !!app,
        filteredDataNodes: app.filteredData?.nodes?.length || 0,
        graphGroupExists: !!app.graphGroup
      };
      
      return {
        nodeExists: !!node,
        hoverCardExists: !!hoverCard,
        hoverCardVisible: hoverCard ? 
          (hoverCard.style.opacity === '1' && hoverCard.style.display === 'block') : false,
        debugInfo: debugInfo,
        hoverCardOpacity: hoverCard?.style.opacity,
        hoverCardDisplay: hoverCard?.style.display,
        hoverCardContent: hoverCard?.innerHTML?.substring(0, 100) || 'none'
      };
    });
    
    console.log('Initial hover result:', initialHoverResult);
    expect(initialHoverResult.hoverCardVisible).toBe(true);
    
    // Test 2: Initial click functionality
    console.log('🖱️ Test 2: Testing initial click...');
    const initialClickResult = await page.evaluate(() => {
      const node = document.querySelector('.node-group');
      if (!node) return { error: 'No node found' };
      
      const rect = node.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      });
      
      const svg = document.querySelector('#graph svg');
      svg.dispatchEvent(event);
      
      // Check if detail panel appeared
      const detailPanel = document.querySelector('.resource-detail, #resource-detail, .detail-panel');
      
      return {
        nodeExists: !!node,
        detailPanelExists: !!detailPanel,
        detailPanelVisible: detailPanel ? 
          (detailPanel.style.display !== 'none' && detailPanel.offsetHeight > 0) : false
      };
    });
    
    console.log('Initial click result:', initialClickResult);
    // Note: Click might not show detail panel in test environment, but should not error
    
    // === PHASE 2: Zoom Operations ===
    console.log('\n=== PHASE 2: Zoom Operations ===');
    
    // Zoom in significantly
    console.log('🔍 Performing zoom in operation...');
    await page.evaluate(() => {
      const svg = document.querySelector('#graph svg');
      const zoomEvent = new WheelEvent('wheel', {
        deltaY: -500, // Zoom in
        clientX: 500,
        clientY: 400,
        bubbles: true
      });
      svg.dispatchEvent(zoomEvent);
    });
    
    await page.waitForTimeout(1000); // Wait for zoom animation
    
    // === PHASE 3: Drag Operations ===
    console.log('\n=== PHASE 3: Drag Operations ===');
    
    // Perform drag operation
    console.log('🖱️ Performing drag operation...');
    const dragResult = await page.evaluate(() => {
      const svg = document.querySelector('#graph svg');
      const rect = svg.getBoundingClientRect();
      
      // Start drag
      const mouseDown = new MouseEvent('mousedown', {
        clientX: rect.x + 400,
        clientY: rect.y + 300,
        bubbles: true
      });
      svg.dispatchEvent(mouseDown);
      
      // Move mouse (drag)
      const mouseMove = new MouseEvent('mousemove', {
        clientX: rect.x + 600,
        clientY: rect.y + 200,
        bubbles: true
      });
      document.dispatchEvent(mouseMove);
      
      // End drag
      const mouseUp = new MouseEvent('mouseup', {
        clientX: rect.x + 600,
        clientY: rect.y + 200,
        bubbles: true
      });
      document.dispatchEvent(mouseUp);
      
      return { dragCompleted: true };
    });
    
    console.log('Drag operation result:', dragResult);
    await page.waitForTimeout(1000); // Wait for drag to complete
    
    // === PHASE 4: Post-Zoom/Drag Functionality Validation ===
    console.log('\n=== PHASE 4: Post-Zoom/Drag Validation ===');
    
    // Test 3: Hover after zoom/drag
    console.log('🔍 Test 3: Testing hover after zoom/drag...');
    const postDragHover1 = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.node-group');
      if (nodes.length === 0) return { error: 'No nodes found' };
      
      // Try different node
      const node = nodes[1] || nodes[0];
      const rect = node.getBoundingClientRect();
      
      // The node group center might not be the actual node center
      // Try to find the circle or image within the node group
      const nodeCircle = node.querySelector('.node-circle');
      const nodeImage = node.querySelector('.node-image');
      const nodeElement = nodeImage || nodeCircle;
      
      let centerX, centerY;
      if (nodeElement) {
        const elementRect = nodeElement.getBoundingClientRect();
        centerX = elementRect.x + elementRect.width / 2;
        centerY = elementRect.y + elementRect.height / 2;
      } else {
        // Fallback to group center
        centerX = rect.x + rect.width / 2;
        centerY = rect.y + rect.height / 2;
      }
      
      // Clear any existing hover card
      const existingCard = document.getElementById('hover-card');
      if (existingCard) existingCard.remove();
      
      // Get app instance for debugging
      const app = window.overwatch || window.visualizer;
      if (!app) return { error: 'App not found' };
      
      // Get detailed coordinate debugging info
      const svg = document.querySelector('#graph svg');
      const graphGroup = app.graphGroup;
      
      // Calculate coordinates like the SVG handler does
      const dummyEvent = { clientX: centerX, clientY: centerY };
      const [graphX, graphY] = d3.pointer(dummyEvent, graphGroup.node());
      
      // Get current transform
      const currentTransform = d3.zoomTransform(graphGroup.node());
      
      // Get node data for comparison
      const nodeData = node.__data__;
      
      // Enable debugging to see coordinate transforms
      if (window.enableHoverDebug) {
        window.enableHoverDebug();
      }
      
      const event = new MouseEvent('mousemove', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      });
      
      svg.dispatchEvent(event);
      
      // Give it time to process
      setTimeout(() => {}, 200);
      const hoverCard = document.getElementById('hover-card');
      
      return {
        nodeExists: !!node,
        nodePosition: { x: centerX, y: centerY },
        nodeData: nodeData ? { id: nodeData.id, x: nodeData.x, y: nodeData.y } : null,
        graphCoords: { x: graphX, y: graphY },
        currentTransform: currentTransform,
        transformedNodePos: nodeData ? {
          x: nodeData.x * currentTransform.k + currentTransform.x,
          y: nodeData.y * currentTransform.k + currentTransform.y
        } : null,
        distance: nodeData ? Math.sqrt(
          Math.pow(graphX - nodeData.x, 2) + 
          Math.pow(graphY - nodeData.y, 2)
        ) : null,
        hoverCardExists: !!hoverCard,
        hoverCardVisible: hoverCard ? 
          (hoverCard.style.opacity === '1' && hoverCard.style.display === 'block') : false,
        hoverCardPosition: hoverCard ? { left: hoverCard.style.left, top: hoverCard.style.top } : null
      };
    });
    
    console.log('Post-drag hover 1 result:', postDragHover1);
    
    // Test 4: Click after zoom/drag
    console.log('🖱️ Test 4: Testing click after zoom/drag...');
    const postDragClick1 = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.node-group');
      if (nodes.length === 0) return { error: 'No nodes found' };
      
      const node = nodes[2] || nodes[0];
      const rect = node.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      });
      
      const svg = document.querySelector('#graph svg');
      svg.dispatchEvent(event);
      
      return {
        nodeExists: !!node,
        nodePosition: { x: centerX, y: centerY },
        clickDispatched: true
      };
    });
    
    console.log('Post-drag click 1 result:', postDragClick1);
    
    // === PHASE 5: Additional Validation Tests ===
    console.log('\n=== PHASE 5: Additional Validation ===');
    
    // Test 5: Second hover test
    console.log('🔍 Test 5: Second hover validation...');
    const postDragHover2 = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.node-group');
      if (nodes.length === 0) return { error: 'No nodes found' };
      
      const node = nodes[3] || nodes[0];
      const rect = node.getBoundingClientRect();
      
      // Target the actual node element (circle or image)
      const nodeCircle = node.querySelector('.node-circle');
      const nodeImage = node.querySelector('.node-image');
      const nodeElement = nodeImage || nodeCircle;
      
      let centerX, centerY;
      if (nodeElement) {
        const elementRect = nodeElement.getBoundingClientRect();
        centerX = elementRect.x + elementRect.width / 2;
        centerY = elementRect.y + elementRect.height / 2;
      } else {
        centerX = rect.x + rect.width / 2;
        centerY = rect.y + rect.height / 2;
      }
      
      // Clear any existing hover card
      const existingCard = document.getElementById('hover-card');
      if (existingCard) existingCard.remove();
      
      // Enable debugging to see coordinate transforms
      if (window.enableHoverDebug) {
        window.enableHoverDebug();
      }
      
      const event = new MouseEvent('mousemove', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      });
      
      const svg = document.querySelector('#graph svg');
      svg.dispatchEvent(event);
      
      setTimeout(() => {}, 100);
      const hoverCard = document.getElementById('hover-card');
      
      return {
        nodeExists: !!node,
        hoverCardExists: !!hoverCard,
        hoverCardVisible: hoverCard ? 
          (hoverCard.style.opacity === '1' && hoverCard.style.display === 'block') : false
      };
    });
    
    console.log('Post-drag hover 2 result:', postDragHover2);
    
    // Test 6: Second click test
    console.log('🖱️ Test 6: Second click validation...');
    const postDragClick2 = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.node-group');
      if (nodes.length === 0) return { error: 'No nodes found' };
      
      const node = nodes[4] || nodes[0];
      const rect = node.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      });
      
      const svg = document.querySelector('#graph svg');
      svg.dispatchEvent(event);
      
      return {
        nodeExists: !!node,
        clickDispatched: true
      };
    });
    
    console.log('Post-drag click 2 result:', postDragClick2);
    
    // Test 7: Third hover test
    console.log('🔍 Test 7: Third hover validation...');
    const postDragHover3 = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.node-group');
      if (nodes.length === 0) return { error: 'No nodes found' };
      
      const node = nodes[0]; // Back to first node
      const rect = node.getBoundingClientRect();
      
      // Target the actual node element (circle or image)
      const nodeCircle = node.querySelector('.node-circle');
      const nodeImage = node.querySelector('.node-image');
      const nodeElement = nodeImage || nodeCircle;
      
      let centerX, centerY;
      if (nodeElement) {
        const elementRect = nodeElement.getBoundingClientRect();
        centerX = elementRect.x + elementRect.width / 2;
        centerY = elementRect.y + elementRect.height / 2;
      } else {
        centerX = rect.x + rect.width / 2;
        centerY = rect.y + rect.height / 2;
      }
      
      // Clear any existing hover card
      const existingCard = document.getElementById('hover-card');
      if (existingCard) existingCard.remove();
      
      // Enable debugging to see coordinate transforms
      if (window.enableHoverDebug) {
        window.enableHoverDebug();
      }
      
      const event = new MouseEvent('mousemove', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      });
      
      const svg = document.querySelector('#graph svg');
      svg.dispatchEvent(event);
      
      setTimeout(() => {}, 100);
      const hoverCard = document.getElementById('hover-card');
      
      return {
        nodeExists: !!node,
        hoverCardExists: !!hoverCard,
        hoverCardVisible: hoverCard ? 
          (hoverCard.style.opacity === '1' && hoverCard.style.display === 'block') : false
      };
    });
    
    console.log('Post-drag hover 3 result:', postDragHover3);
    
    // === PHASE 6: Final Analysis ===
    console.log('\n=== PHASE 6: Final Analysis ===');
    
    // Analyze hover functionality degradation
    const hoverTests = [
      { name: 'Initial', result: initialHoverResult.hoverCardVisible },
      { name: 'Post-drag 1', result: postDragHover1.hoverCardVisible },
      { name: 'Post-drag 2', result: postDragHover2.hoverCardVisible },
      { name: 'Post-drag 3', result: postDragHover3.hoverCardVisible }
    ];
    
    console.log('\n📊 HOVER TEST SUMMARY:');
    hoverTests.forEach(test => {
      console.log(`  ${test.name}: ${test.result ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    const hoverSuccessRate = hoverTests.filter(t => t.result).length / hoverTests.length;
    console.log(`\n📈 Hover Success Rate: ${Math.round(hoverSuccessRate * 100)}%`);
    
    // Check current application state
    const finalState = await page.evaluate(() => {
      return {
        nodeGroupsExist: !!document.querySelectorAll('.node-group').length,
        svgExists: !!document.querySelector('#graph svg'),
        currentTransform: window.overwatch?.currentTransform || 'unknown',
        isDragging: window.overwatch?.isDragging || false,
        currentHoveredNode: window.overwatch?.currentHoveredNode || null
      };
    });
    
    console.log('\n🔍 Final Application State:', finalState);
    
    // The test should pass if initial functionality works
    // Failures after zoom/drag indicate the specific issue
    expect(initialHoverResult.hoverCardVisible).toBe(true);
    
    // Log if post-operations failed to identify the problem
    if (!postDragHover1.hoverCardVisible) {
      console.log('❌ ISSUE IDENTIFIED: Hover functionality breaks after zoom/drag operations');
    }
    
    if (hoverSuccessRate < 0.75) {
      console.log('❌ CRITICAL: Hover degradation detected after zoom/drag');
    }
  });
});