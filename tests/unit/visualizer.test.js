// Unit tests for OverwatchVisualizer class
const fs = require('fs');
const path = require('path');

// Mock D3 is already set up in jest.setup.js

describe('OverwatchVisualizer', () => {
  let visualizer;
  let mockContainer;

  beforeEach(() => {
    // Setup DOM for tests
    document.body.innerHTML = `
      <div id="graph-container">
        <div class="graph-wrapper">
          <div id="graph" class="graph"></div>
          <div class="loading-overlay" id="loading-overlay"></div>
        </div>
      </div>
      <div id="detail-panel" style="display: none;"></div>
    `;

    // Load the OverwatchVisualizer class
    const appJsPath = path.join(__dirname, '../../frontend/app.js');
    const appJs = fs.readFileSync(appJsPath, 'utf8');
    
    // Execute the code to make OverwatchVisualizer available
    eval(appJs);
    
    visualizer = new OverwatchVisualizer();
    mockContainer = document.getElementById('graph');
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    visualizer = null;
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(visualizer.config).toBeDefined();
      expect(visualizer.config.nodeRadius).toBe(25);
      expect(visualizer.config.linkDistance).toBe(150);
      expect(visualizer.config.width).toBe(2000);
      expect(visualizer.config.height).toBe(1500);
    });

    test('should initialize AWS icon mapping', () => {
      expect(visualizer.awsIconMap).toBeDefined();
      expect(visualizer.awsIconMap['aws_lambda_function']).toBe('icons/lambda.svg');
      expect(visualizer.awsIconMap['aws_s3_bucket']).toBe('icons/s3.svg');
      expect(visualizer.awsIconMap['aws_dynamodb_table']).toBe('icons/dynamodb.svg');
    });

    test('should initialize UI state', () => {
      expect(visualizer.uiState).toBeDefined();
      expect(visualizer.uiState.showLabels).toBe(true);
      expect(visualizer.uiState.showDependencies).toBe(true);
      expect(visualizer.uiState.groupByApp).toBe(true);
      expect(visualizer.uiState.viewMode).toBe('resources');
    });
  });

  describe('Icon Mapping', () => {
    test('should return correct icon for AWS Lambda', () => {
      const icon = visualizer.awsIconMap['aws_lambda_function'];
      expect(icon).toBe('icons/lambda.svg');
    });

    test('should return correct icon for API Gateway', () => {
      const icon = visualizer.awsIconMap['aws_api_gateway_rest_api'];
      expect(icon).toBe('icons/apigateway.svg');
    });

    test('should return correct icon for S3 bucket', () => {
      const icon = visualizer.awsIconMap['aws_s3_bucket'];
      expect(icon).toBe('icons/s3.svg');
    });

    test('should handle unknown resource types gracefully', () => {
      const icon = visualizer.awsIconMap['unknown_resource_type'];
      expect(icon).toBeUndefined();
    });
  });

  describe('Hover Card Functionality', () => {
    test('should show hover card with correct content', () => {
      const mockNode = {
        id: 'test-lambda',
        name: 'test-lambda',
        type: 'aws_lambda_function',
        configuration: {
          runtime: 'nodejs18.x',
          memory_size: 128,
        },
      };

      const mockEvent = {
        target: mockContainer,
        pageX: 100,
        pageY: 100,
        currentTarget: mockContainer,
      };

      visualizer.showHoverCard(mockEvent, mockNode);

      const hoverCard = document.getElementById('hover-card');
      expect(hoverCard).toBeTruthy();
      expect(hoverCard.innerHTML).toContain('test-lambda');
      expect(hoverCard.innerHTML).toContain('lambda');
    });

    test('should position hover card correctly', () => {
      const mockNode = {
        id: 'test-node',
        name: 'test-node',
        type: 'aws_s3_bucket',
        configuration: {},
      };

      const mockEvent = {
        target: mockContainer,
        pageX: 200,
        pageY: 150,
        currentTarget: mockContainer,
      };

      visualizer.showHoverCard(mockEvent, mockNode);

      const hoverCard = document.getElementById('hover-card');
      expect(hoverCard).toBeTruthy();
      
      // Check positioning (should be near the cursor)
      const left = parseInt(hoverCard.style.left);
      const top = parseInt(hoverCard.style.top);
      
      expect(left).toBeGreaterThan(200); // Should be offset from cursor
      expect(top).toBeGreaterThan(140);
      expect(top).toBeLessThan(160);
    });

    test('should hide hover card', () => {
      // First show a hover card
      const mockNode = {
        id: 'test-node',
        name: 'test-node',
        type: 'aws_lambda_function',
        configuration: {},
      };

      const mockEvent = {
        target: mockContainer,
        pageX: 100,
        pageY: 100,
        currentTarget: mockContainer,
      };

      visualizer.showHoverCard(mockEvent, mockNode);
      
      let hoverCard = document.getElementById('hover-card');
      expect(hoverCard).toBeTruthy();
      expect(hoverCard.style.opacity).toBe('1');

      // Now hide it
      visualizer.hideHoverCard();
      
      hoverCard = document.getElementById('hover-card');
      expect(hoverCard.style.opacity).toBe('0');
    });

    test('should handle edge positioning for hover card', () => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

      const mockNode = {
        id: 'edge-node',
        name: 'edge-node',
        type: 'aws_lambda_function',
        configuration: {},
      };

      // Position near right edge
      const mockEvent = {
        target: mockContainer,
        pageX: 950, // Near right edge
        pageY: 100,
        currentTarget: mockContainer,
      };

      visualizer.showHoverCard(mockEvent, mockNode);

      const hoverCard = document.getElementById('hover-card');
      const left = parseInt(hoverCard.style.left);
      
      // Should not exceed viewport width
      expect(left + 320).toBeLessThanOrEqual(1024 + 50); // Allow some tolerance
    });
  });

  describe('Configuration Summary Building', () => {
    test('should build Lambda configuration summary', () => {
      const config = {
        runtime: 'nodejs18.x',
        memory_size: 128,
        timeout: 30,
        handler: 'index.handler',
      };

      const summary = visualizer.buildConfigurationSummary('aws_lambda_function', config);
      
      expect(summary).toContain('Runtime: nodejs18.x');
      expect(summary).toContain('Memory: 128 MB');
      expect(summary).toContain('Timeout: 30s');
      expect(summary).toContain('Handler: index.handler');
    });

    test('should build S3 configuration summary', () => {
      const config = {
        bucket: 'my-test-bucket',
        versioning: { enabled: true },
        server_side_encryption_configuration: {
          rule: { apply_server_side_encryption_by_default: { sse_algorithm: 'AES256' } }
        },
      };

      const summary = visualizer.buildConfigurationSummary('aws_s3_bucket', config);
      
      expect(summary).toContain('Bucket: my-test-bucket');
      expect(summary).toContain('Versioning: Enabled');
      expect(summary).toContain('Encryption: AES256');
    });

    test('should build DynamoDB configuration summary', () => {
      const config = {
        name: 'my-table',
        billing_mode: 'PAY_PER_REQUEST',
        hash_key: 'id',
        range_key: 'sort_key',
      };

      const summary = visualizer.buildConfigurationSummary('aws_dynamodb_table', config);
      
      expect(summary).toContain('Table: my-table');
      expect(summary).toContain('Billing: PAY_PER_REQUEST');
      expect(summary).toContain('Hash Key: id');
      expect(summary).toContain('Range Key: sort_key');
    });

    test('should handle empty configuration', () => {
      const summary = visualizer.buildConfigurationSummary('aws_lambda_function', {});
      
      expect(summary).toBe('No configuration details available');
    });

    test('should handle unknown resource type', () => {
      const config = { some_field: 'some_value' };
      const summary = visualizer.buildConfigurationSummary('unknown_resource', config);
      
      expect(summary).toContain('some_field: some_value');
    });
  });

  describe('Event Handling', () => {
    test('should handle node mouseover correctly', () => {
      const mockNode = {
        id: 'test-node',
        name: 'test-node',
        type: 'aws_lambda_function',
        configuration: {},
      };

      const mockEvent = {
        target: mockContainer,
        pageX: 100,
        pageY: 100,
        currentTarget: mockContainer,
      };

      // Spy on showHoverCard method
      const showHoverCardSpy = jest.spyOn(visualizer, 'showHoverCard');
      
      visualizer.onNodeMouseover(mockEvent, mockNode);

      expect(showHoverCardSpy).toHaveBeenCalledWith(mockEvent, mockNode);
    });

    test('should handle node mouseout correctly', () => {
      const mockEvent = {
        target: mockContainer,
        currentTarget: mockContainer,
      };

      const mockNode = {
        id: 'test-node',
        name: 'test-node',
        type: 'aws_lambda_function',
      };

      // Spy on hideHoverCard method
      const hideHoverCardSpy = jest.spyOn(visualizer, 'hideHoverCard');
      
      visualizer.onNodeMouseout(mockEvent, mockNode);

      // hideHoverCard should be called after timeout
      setTimeout(() => {
        expect(hideHoverCardSpy).toHaveBeenCalled();
      }, 350);
    });

    test('should not show hover card during dragging', () => {
      visualizer.isDragging = true;

      const mockNode = {
        id: 'test-node',
        name: 'test-node',
        type: 'aws_lambda_function',
        configuration: {},
      };

      const mockEvent = {
        target: mockContainer,
        pageX: 100,
        pageY: 100,
        currentTarget: mockContainer,
      };

      const showHoverCardSpy = jest.spyOn(visualizer, 'showHoverCard');
      
      visualizer.onNodeMouseover(mockEvent, mockNode);

      expect(showHoverCardSpy).not.toHaveBeenCalled();
    });

    test('should handle node click correctly', () => {
      const mockNode = {
        id: 'test-node',
        name: 'test-node',
        type: 'aws_lambda_function',
        configuration: {},
      };

      const mockEvent = {
        target: mockContainer,
        currentTarget: mockContainer,
        stopPropagation: jest.fn(),
      };

      const showResourceDetailsSpy = jest.spyOn(visualizer, 'showResourceDetails').mockImplementation(() => {});
      const hideHoverCardSpy = jest.spyOn(visualizer, 'hideHoverCard');
      
      visualizer.onNodeClick(mockEvent, mockNode);

      expect(visualizer.uiState.selectedNode).toBe(mockNode);
      expect(showResourceDetailsSpy).toHaveBeenCalledWith(mockNode);
      expect(hideHoverCardSpy).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Data Processing', () => {
    test('should process application data correctly', () => {
      const mockData = {
        applications: [
          {
            id: 'app1',
            name: 'Test App',
            resources: [
              {
                id: 'lambda1',
                name: 'test-lambda',
                type: 'aws_lambda_function',
                configuration: { runtime: 'nodejs18.x' },
                dependencies: [],
              },
            ],
          },
        ],
      };

      visualizer.data = mockData;
      visualizer.filteredData = mockData;

      expect(visualizer.data.applications).toHaveLength(1);
      expect(visualizer.data.applications[0].resources).toHaveLength(1);
      expect(visualizer.data.applications[0].resources[0].type).toBe('aws_lambda_function');
    });
  });

  describe('UI State Management', () => {
    test('should update UI state correctly', () => {
      expect(visualizer.uiState.showLabels).toBe(true);
      
      // Simulate toggling labels
      visualizer.uiState.showLabels = false;
      expect(visualizer.uiState.showLabels).toBe(false);
    });

    test('should manage selected node state', () => {
      const mockNode = {
        id: 'test-node',
        name: 'test-node',
        type: 'aws_lambda_function',
      };

      visualizer.uiState.selectedNode = mockNode;
      expect(visualizer.uiState.selectedNode).toBe(mockNode);
    });

    test('should manage view mode state', () => {
      expect(visualizer.uiState.viewMode).toBe('resources');
      
      visualizer.uiState.viewMode = 'modules';
      expect(visualizer.uiState.viewMode).toBe('modules');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      // Remove required DOM elements
      document.body.innerHTML = '';

      expect(() => {
        const newVisualizer = new OverwatchVisualizer();
      }).not.toThrow();
    });

    test('should handle malformed data gracefully', () => {
      const malformedData = {
        applications: [
          {
            // Missing required fields
            resources: null,
          },
        ],
      };

      expect(() => {
        visualizer.data = malformedData;
      }).not.toThrow();
    });

    test('should handle missing configuration in hover card', () => {
      const mockNode = {
        id: 'test-node',
        name: 'test-node',
        type: 'aws_lambda_function',
        // Missing configuration
      };

      const mockEvent = {
        target: mockContainer,
        pageX: 100,
        pageY: 100,
        currentTarget: mockContainer,
      };

      expect(() => {
        visualizer.showHoverCard(mockEvent, mockNode);
      }).not.toThrow();

      const hoverCard = document.getElementById('hover-card');
      expect(hoverCard).toBeTruthy();
    });
  });
});