class OverwatchVisualizer {
  constructor() {
    this.data = null;
    this.filteredData = null;
    this.svg = null;
    this.simulation = null;
    this.zoom = null;
    this.currentTransform = d3.zoomIdentity;
    this.enterpriseMode = false;
    this.currentAnalysis = null;
    
    // Configuration
    this.config = {
      nodeRadius: 25,
      linkDistance: 150,
      chargeStrength: -400,
      width: 2000,
      height: 1500,
      colors: d3.scaleOrdinal(d3.schemeCategory10)
    };

    // Map AWS resource types to icon filenames
    this.awsIconMap = {
      // Compute
      'aws_lambda_function': 'icons/lambda.svg',
      'aws_lambda_permission': 'icons/lambda.svg',
      'aws_instance': 'icons/ec2.svg',
      'aws_ec2_instance': 'icons/ec2.svg',
      
      // Containers & Orchestration
      'aws_eks_cluster': 'icons/eks.svg',
      'aws_eks_node_group': 'icons/eks.svg',
      'aws_ecs_cluster': 'icons/ecs.svg',
      'aws_ecs_service': 'icons/ecs.svg',
      'aws_ecs_task_definition': 'icons/ecs.svg',
      
      // Storage
      'aws_s3_bucket': 'icons/s3.svg',
      
      // Database
      'aws_dynamodb_table': 'icons/dynamodb.svg',
      'aws_rds_instance': 'icons/rds.svg',
      'aws_rds_cluster': 'icons/rds.svg',
      'aws_db_instance': 'icons/rds.svg',
      'aws_elasticache_replication_group': 'icons/elasticache.svg',
      'aws_elasticache_cluster': 'icons/elasticache.svg',
      'aws_opensearch_domain': 'icons/opensearch.svg',
      'aws_elasticsearch_domain': 'icons/opensearch.svg',
      
      // Networking & Content Delivery
      'aws_vpc': 'icons/vpc.svg',
      'aws_internet_gateway': 'icons/vpc.svg',
      'aws_lb': 'icons/alb.svg',
      'aws_alb': 'icons/alb.svg',
      'aws_lb_listener': 'icons/alb.svg',
      'aws_lb_target_group': 'icons/alb.svg',
      'aws_route53_zone': 'icons/route53-zone.svg',
      'aws_route53_record': 'icons/route53.svg',
      'aws_cloudfront_distribution': 'icons/cloudfront.svg',
      
      // Application Integration
      'aws_api_gateway_rest_api': 'icons/apigateway.svg',
      'aws_api_gateway_resource': 'icons/apigateway.svg',
      'aws_api_gateway_method': 'icons/apigateway.svg',
      'aws_api_gateway_integration': 'icons/apigateway.svg',
      'aws_api_gateway_deployment': 'icons/apigateway.svg',
      'aws_api_gateway_stage': 'icons/apigateway.svg',
      'aws_sns_topic': 'icons/sns.svg',
      'aws_sns_topic_subscription': 'icons/sns.svg',
      'aws_sqs_queue': 'icons/sqs.svg',
      
      // Machine Learning
      'aws_sagemaker_endpoint': 'icons/sagemaker.svg',
      'aws_sagemaker_model': 'icons/sagemaker.svg',
      'aws_sagemaker_endpoint_configuration': 'icons/sagemaker.svg',
      
      // Security, Identity & Compliance
      'aws_iam_role': 'icons/iamrole.svg',
      'aws_iam_policy': 'icons/iamrole.svg',
      'aws_iam_user': 'icons/iamrole.svg',
      'aws_acm_certificate': 'icons/acm.svg',
      'aws_cognito_user_pool': 'icons/cognito.svg',
      'aws_cognito_user_pool_client': 'icons/cognito.svg',
      
      // Management & Governance
      'aws_cloudwatch_metric_alarm': 'icons/cloudwatch.svg',
      'aws_cloudwatch_log_group': 'icons/cloudwatch.svg',
      'aws_cloudwatch_dashboard': 'icons/cloudwatch.svg'
    };

    // UI state
    this.uiState = {
      showLabels: true,
      showDependencies: true,
      groupByApp: true,
      selectedApp: null,
      selectedNode: null,
      filter: '',
      viewMode: 'resources', // 'resources' | 'modules' | 'hybrid'
      enterpriseMode: false,
      selectedEnvironment: 'prod'
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupGraph();
    this.loadData();
    this.setupGlobalEventListeners();
    
  }

  setupEventListeners() {
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.loadData();
    });

    // View controls
    document.getElementById('show-labels').addEventListener('change', (e) => {
      this.uiState.showLabels = e.target.checked;
      this.updateGraphVisibility();
    });

    document.getElementById('show-dependencies').addEventListener('change', (e) => {
      this.uiState.showDependencies = e.target.checked;
      this.updateGraphVisibility();
    });

    document.getElementById('group-by-app').addEventListener('change', (e) => {
      this.uiState.groupByApp = e.target.checked;
      this.renderGraph();
    });

    // Filter
    document.getElementById('resource-filter').addEventListener('input', (e) => {
      this.uiState.filter = e.target.value.toLowerCase();
      this.applyFilters();
    });

    // Graph controls
    document.getElementById('zoom-in-btn').addEventListener('click', () => {
      this.svg.transition().call(this.zoom.scaleBy, 1.5);
    });

    document.getElementById('zoom-out-btn').addEventListener('click', () => {
      this.svg.transition().call(this.zoom.scaleBy, 1 / 1.5);
    });

    document.getElementById('reset-zoom-btn').addEventListener('click', () => {
      this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
    });

    document.getElementById('fullscreen-btn').addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Detail panel
    document.getElementById('detail-close').addEventListener('click', () => {
      this.closeDetailPanel();
    });

    // Export
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportGraph();
    });

    // View mode toggle
    document.getElementById('view-mode-toggle')?.addEventListener('change', (e) => {
      this.uiState.viewMode = e.target.value;
      this.renderGraph();
    });

    // Enterprise mode toggle  
    document.getElementById('enterprise-mode-toggle')?.addEventListener('change', (e) => {
      this.uiState.enterpriseMode = e.target.checked;
      this.loadData();
    });

    // Environment selector
    document.getElementById('environment-selector')?.addEventListener('change', (e) => {
      this.uiState.selectedEnvironment = e.target.value;
      if (this.uiState.enterpriseMode) {
        this.loadData();
      }
    });
  }

  setupGlobalEventListeners() {
    // Temporarily disable to debug
    console.log('Setting up global event listeners');
    
    // Hide hover card when clicking anywhere outside the graph
    document.addEventListener('click', (event) => {
      // Don't hide if clicking on the hover card itself or within the graph area
      if (!event.target.closest('#hover-card') && !event.target.closest('#graph')) {
        this.hideHoverCard();
        // Reset hover state
        this.currentHoveredNode = null;
      }
    });

    // Hide hover card when scrolling
    document.addEventListener('scroll', () => {
      this.hideHoverCard();
    });

    // Hide hover card when pressing escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hideHoverCard();
        this.closeDetailPanel();
      }
    });
  }

  setupGraph() {
    const container = document.getElementById('graph');
    const containerRect = container.getBoundingClientRect();

    this.svg = d3.select('#graph')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`);

    // Setup zoom
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.currentTransform = event.transform;
        this.svg.select('.background-group').attr('transform', event.transform);
        this.svg.select('.graph-group').attr('transform', event.transform);
        this.updateMinimap();
      });

    // Create separate layers to ensure proper z-ordering
    this.backgroundGroup = this.svg.append('g').attr('class', 'background-group');
    this.graphGroup = this.svg.append('g').attr('class', 'graph-group');
    
    // Add SVG-level mouse event listeners for node hover detection
    this.svg.on('mousemove', (event) => {
      // Get pointer coordinates relative to the transformed graph group
      const [x, y] = d3.pointer(event, this.graphGroup.node());
      
      // Temporary debug
      if (window.debugHover) {
        console.log('Mouse at graph coords:', { x, y });
        console.log('Available nodes:', this.filteredData?.nodes?.length || 0);
        if (this.filteredData?.nodes?.length > 0) {
          console.log('First node position:', this.filteredData.nodes[0]);
        }
        
        // Debug current transform
        const currentTransform = d3.zoomTransform(this.graphGroup.node());
        console.log('Current transform:', currentTransform);
      }
      
      const nodeElement = this.findNodeAtPosition(x, y);
      
      if (nodeElement) {
        const nodeData = d3.select(nodeElement).datum();
        if (nodeData && this.currentHoveredNode !== nodeData.id) {
          console.log('🎯 Hover detected on:', nodeData.name);
          this.currentHoveredNode = nodeData.id;
          this.onNodeMouseover(event, nodeData);
        }
      } else {
        if (this.currentHoveredNode) {
          this.currentHoveredNode = null;
          this.hideHoverCard();
          // Reset node opacity when mouse leaves
          if (this.nodeGroups) {
            this.nodeGroups.style('opacity', 1);
          }
        }
      }
    });
    
    this.svg.on('mouseleave', () => {
      if (this.currentHoveredNode) {
        this.currentHoveredNode = null;
        this.hideHoverCard();
        // Reset node opacity when leaving SVG area
        if (this.nodeGroups) {
          this.nodeGroups.style('opacity', 1);
        }
      }
    });
    
    // Add SVG click handler to prevent interference with hover state
    this.svg.on('click', (event) => {
      // Prevent the click from bubbling up to document and interfering with hover
      event.stopPropagation();
      
      // Check if we clicked on a node area using graph group coordinates
      const [x, y] = d3.pointer(event, this.graphGroup.node());
      const nodeElement = this.findNodeAtPosition(x, y);
      
      if (nodeElement) {
        const nodeData = d3.select(nodeElement).datum();
        if (nodeData) {
          console.log('Node clicked:', nodeData.name);
          this.onNodeClick(event, nodeData);
        }
      }
      // If no node clicked, just prevent document click handler but don't reset hover state
    });
    
    // Initialize hover tracking
    this.currentHoveredNode = null;
    
    // Add debug function
    window.debugHover = false;
    window.enableHoverDebug = () => {
      window.debugHover = true;
      console.log('🔍 Hover debugging enabled. Move mouse over graph.');
    };
    
    // Add zoom behavior to the main container, but with filter to avoid node interference
    this.svg.call(this.zoom.filter(event => {
      // Allow zoom on background areas, but not on nodes
      return !event.target.closest('.node-group');
    }));

    // Setup simulation
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(this.config.linkDistance))
      .force('charge', d3.forceManyBody().strength(this.config.chargeStrength))
      .force('center', d3.forceCenter(this.config.width / 2, this.config.height / 2))
      .force('collision', d3.forceCollide().radius(this.config.nodeRadius + 10));

    this.setupMinimap();
  }

  setupMinimap() {
    const minimap = d3.select('#minimap');
    const minimapSvg = minimap.append('svg')
      .attr('width', '100%')
      .attr('height', '100%');

    this.minimapGroup = minimapSvg.append('g');
    this.minimapViewport = d3.select('#minimap-viewport');
  }

  async loadData() {
    this.showLoading();
    
    try {
      // Determine API endpoint based on enterprise mode
      const useEnterprise = this.uiState.enterpriseMode;
      const environment = this.uiState.selectedEnvironment;
      
      // Detect if running in Docker (port 5000) vs local development  
      const isDocker = window.location.port === '5000';
      const backendPort = isDocker ? '4000' : '4001';
      const backendUrl = `http://localhost:${backendPort}`;
      
      const apiUrl = useEnterprise 
        ? `${backendUrl}/api/parse?useEnterprise=true&environment=${environment}`
        : `${backendUrl}/api/parse`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      this.data = await response.json();
      
      // Handle enterprise analysis response
      if (this.data.isEnterprise) {
        this.enterpriseMode = true;
        this.currentAnalysis = this.data.analysis;
        this.showToast(`Enterprise analysis complete - ${this.data.summary?.moduleCount || 0} modules analyzed`, 'success');
      } else {
        this.enterpriseMode = false;
        this.currentAnalysis = null;
        this.showToast('Infrastructure scan complete', 'success');
      }
      
      this.processData();
      this.renderGraph();
      this.populateAppList();
      this.populateResourceTypes();
      this.updateViewInfo();
      this.updateEnterpriseUI();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast(`Infrastructure scan failed: ${error.message}`, 'error');
    } finally {
      this.hideLoading();
    }
  }

  processData() {
    if (!this.data || !this.data.resources) {
      this.filteredData = { nodes: [], links: [], apps: [], modules: [] };
      return;
    }

    if (this.enterpriseMode && this.currentAnalysis?.visualization) {
      // Process enterprise analysis data
      this.processEnterpriseData();
    } else {
      // Process legacy data
      this.processLegacyData();
    }
  }

  processLegacyData() {
    // Create nodes from resources
    const nodes = [];
    Object.entries(this.data.resources.resource || {}).forEach(([type, resources]) => {
      Object.entries(resources).forEach(([name, config]) => {
        const nodeId = `${type}.${name}`;
        const group = this.data.groups[nodeId];
        
        nodes.push({
          id: nodeId,
          type: type,
          name: name,
          config: config,
          group: group?.appId || 'default',
          appName: group?.appName || 'Default',
          repository: group?.repository,
          category: 'resource'
        });
      });
    });

    // Create links from dependencies
    const links = (this.data.dependencies || []).map(dep => ({
      source: dep.from,
      target: dep.to,
      id: `${dep.from}-${dep.to}`,
      type: 'dependency'
    }));

    this.filteredData = {
      nodes,
      links,
      apps: this.data.apps || [],
      modules: []
    };
  }

  processEnterpriseData() {
    const visualization = this.currentAnalysis.visualization;
    const nodes = [];
    const links = [];
    const modules = [];

    // Process based on view mode
    if (this.uiState.viewMode === 'modules') {
      // Module-level view
      modules.push(...visualization.modules);
      nodes.push(...visualization.modules);
      
      // Add module-to-module links
      links.push(...visualization.links.map(link => ({
        source: link.source,
        target: link.target,
        id: link.id || `${link.source}-${link.target}`,
        type: link.type,
        metadata: link.metadata
      })));
    } else if (this.uiState.viewMode === 'resources') {
      // Resource-level view
      const resourceNodes = visualization.nodes.filter(n => n.category !== 'module');
      nodes.push(...resourceNodes);
      
      // Create resource-level dependencies (simplified)
      const resourceLinks = [];
      for (const link of visualization.links) {
        // Find resources in source and target modules
        const sourceResources = resourceNodes.filter(n => n.group === link.source.replace('module_', ''));
        const targetResources = resourceNodes.filter(n => n.group === link.target.replace('module_', ''));
        
        // Create cross-module resource links (simplified - connect first resource of each)
        if (sourceResources.length > 0 && targetResources.length > 0) {
          resourceLinks.push({
            source: sourceResources[0].id,
            target: targetResources[0].id,
            id: `${sourceResources[0].id}-${targetResources[0].id}`,
            type: link.type,
            metadata: link.metadata
          });
        }
      }
      links.push(...resourceLinks);
    } else {
      // Hybrid view - show both modules and resources
      nodes.push(...visualization.nodes);
      links.push(...visualization.links.map(link => ({
        source: link.source,
        target: link.target,
        id: link.id || `${link.source}-${link.target}`,
        type: link.type,
        metadata: link.metadata
      })));
    }

    this.filteredData = {
      nodes,
      links,
      apps: this.data.apps || [],
      modules: visualization.modules || [],
      analysis: this.currentAnalysis
    };
  }

  renderGraph() {
    if (!this.filteredData) return;
    
    console.log('Rendering graph with data:', {
      nodes: this.filteredData.nodes.length,
      links: this.filteredData.links.length,
      apps: this.filteredData.apps.length
    });

    this.backgroundGroup.selectAll('*').remove();
    this.graphGroup.selectAll('*').remove();

    // Apply grouping forces if enabled
    if (this.uiState.groupByApp) {
      this.setupAppGrouping();
    }

    // Render app groups in background layer (guaranteed to be behind nodes)
    if (this.uiState.groupByApp) {
      this.renderAppGroups();
    }

    // Render links
    this.renderLinks();

    // Render nodes LAST (so they're on top and can receive events)
    this.renderNodes();

    // Update simulation
    // Filter links to only include those with valid source and target nodes
    const validLinks = this.filteredData.links.filter(link => {
      const sourceExists = this.filteredData.nodes.some(node => node.id === link.source || (typeof link.source === 'object' && node.id === link.source.id));
      const targetExists = this.filteredData.nodes.some(node => node.id === link.target || (typeof link.target === 'object' && node.id === link.target.id));
      
      if (!sourceExists || !targetExists) {
        console.warn(`Filtered out invalid link: ${link.from || link.source} -> ${link.to || link.target} (source: ${sourceExists}, target: ${targetExists})`);
        return false;
      }
      return true;
    });

    this.simulation
      .nodes(this.filteredData.nodes)
      .on('tick', () => this.updatePositions());

    this.simulation.force('link')
      .links(validLinks);

    this.simulation.alpha(1).restart();

    // Stop simulation after elements settle to make them stable for testing
    setTimeout(() => {
      this.simulation.stop();
      console.log('Simulation stopped - elements are now stable for interaction');
    }, 3000);

    this.updateMinimap();
  }

  setupAppGrouping() {
    const apps = [...new Set(this.filteredData.nodes.map(n => n.group))];
    const appCenters = {};
    
    // Count nodes per app to determine appropriate spacing
    const appNodeCounts = {};
    apps.forEach(appId => {
      appNodeCounts[appId] = this.filteredData.nodes.filter(n => n.group === appId).length;
    });
    
    // Calculate dynamic radius based on app size
    const baseRadius = 200;
    const maxNodes = Math.max(...Object.values(appNodeCounts));
    const radiusScale = d3.scaleLinear()
      .domain([1, maxNodes])
      .range([baseRadius, baseRadius * 2]);
    
    // Position apps with varying separation based on their size
    apps.forEach((appId, i) => {
      const angle = (i * 2 * Math.PI) / apps.length;
      const appRadius = radiusScale(appNodeCounts[appId]);
      const separation = Math.max(400, appRadius + 100); // Dynamic separation
      
      appCenters[appId] = {
        x: this.config.width / 2 + Math.cos(angle) * separation,
        y: this.config.height / 2 + Math.sin(angle) * separation,
        radius: appRadius,
        nodeCount: appNodeCounts[appId]
      };
    });

    // Store app centers for use in other methods
    this.appCenters = appCenters;

    this.simulation
      .force('x', d3.forceX(d => appCenters[d.group]?.x || this.config.width / 2).strength(0.4))
      .force('y', d3.forceY(d => appCenters[d.group]?.y || this.config.height / 2).strength(0.4))
      .force('collision', d3.forceCollide().radius(d => {
        const appCenter = appCenters[d.group];
        return appCenter ? Math.max(this.config.nodeRadius + 5, appCenter.radius / appCenter.nodeCount * 2) : this.config.nodeRadius + 10;
      }));
  }

  renderAppGroups() {
    const apps = d3.group(this.filteredData.nodes, d => d.group);
    console.log('Rendering app groups in background layer:', apps.size);
    
    // Render app groups in the background layer (guaranteed to be behind nodes)
    this.appGroups = this.backgroundGroup.selectAll('.app-group')
      .data(Array.from(apps.entries()), d => d[0])
      .join('g')
      .attr('class', 'app-group');

    // Add rectangles for app groups
    this.appRects = this.appGroups.append('rect')
      .attr('class', 'app-group-rect')
      .attr('fill', 'none') // No fill to prevent blocking events
      .attr('rx', 16)
      .attr('stroke', (d, i) => this.config.colors(i))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8)
      .attr('stroke-dasharray', '5,5') // Dashed border for visibility
      .style('pointer-events', 'none'); // Keep non-interactive

    // Add labels for app groups
    this.appLabels = this.appGroups.append('text')
      .attr('class', 'app-group-label')
      .attr('fill', '#333')
      .attr('font-weight', 'bold')
      .attr('font-size', '14px')
      .attr('text-anchor', 'middle')
      .text(d => d[1][0]?.appName || d[0]);
      
    console.log('App groups rendered in background layer - should not interfere with node events');
  }

  renderLinks() {
    // Filter to only valid links (with existing source and target nodes)
    const validLinks = this.filteredData.links.filter(link => {
      const sourceExists = this.filteredData.nodes.some(node => 
        node.id === link.source || 
        (typeof link.source === 'object' && node.id === link.source.id) ||
        node.id === link.from
      );
      const targetExists = this.filteredData.nodes.some(node => 
        node.id === link.target || 
        (typeof link.target === 'object' && node.id === link.target.id) ||
        node.id === link.to
      );
      return sourceExists && targetExists;
    });

    this.links = this.graphGroup.selectAll('.link')
      .data(validLinks, d => d.id)
      .join('line')
      .attr('class', d => `link ${d.crossApplication ? 'cross-app-link' : 'standard-link'}`)
      .attr('stroke', d => this.getLinkColor(d))
      .attr('stroke-width', d => d.crossApplication ? 3 : 2)
      .attr('stroke-opacity', d => d.crossApplication ? 0.8 : 0.6)
      .attr('stroke-dasharray', d => d.crossApplication ? '8,4' : 'none')
      .on('mouseover', (event, d) => this.onLinkMouseover(event, d))
      .on('mouseout', (event, d) => this.onLinkMouseout(event, d));

    // Add link labels for cross-application dependencies
    this.linkLabels = this.graphGroup.selectAll('.link-label')
      .data(validLinks.filter(d => d.crossApplication), d => d.id)
      .join('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => this.getLinkLabel(d));
  }

  renderNodes() {
    console.log('Rendering nodes:', this.filteredData.nodes.length);
    
    this.nodeGroups = this.graphGroup.selectAll('.node-group')
      .data(this.filteredData.nodes, d => d.id)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(this.drag())
      .on('click', (event, d) => {
        console.log('Node clicked:', d);
        this.onNodeClick(event, d);
      })
      .on('mouseover', (event, d) => {
        console.log('Node mouseover:', d);
        this.onNodeMouseover(event, d);
      })
      .on('mouseout', (event, d) => {
        console.log('Node mouseout:', d);
        this.onNodeMouseout(event, d);
      });

    // Add circles for nodes without icons
    this.nodeGroups
      .filter(d => !this.awsIconMap[d.type])
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', this.config.nodeRadius)
      .attr('fill', d => this.config.colors(d.group));

    // Add images for nodes with icons
    this.nodeGroups
      .filter(d => this.awsIconMap[d.type])
      .append('image')
      .attr('class', 'node-image')
      .attr('href', d => this.awsIconMap[d.type])
      .attr('width', this.config.nodeRadius * 2)
      .attr('height', this.config.nodeRadius * 2)
      .attr('x', -this.config.nodeRadius)
      .attr('y', -this.config.nodeRadius)
      .on('error', function(event, d) {
        // Fallback to circle if image fails to load
        d3.select(this.parentNode)
          .append('circle')
          .attr('class', 'node-circle fallback')
          .attr('r', 20)
          .attr('fill', '#6c757d');
        d3.select(this).remove();
      });

    // Add labels
    this.nodeLabels = this.nodeGroups.append('text')
      .attr('class', 'node-label')
      .attr('x', this.config.nodeRadius + 8)
      .attr('y', 4)
      .text(d => d.name)
      .style('display', this.uiState.showLabels ? 'block' : 'none');

    // Add tooltips
    this.nodeGroups.append('title')
      .text(d => this.getNodeTooltip(d));
  }

  getNodeTooltip(node) {
    if (node.category === 'module' || node.type === 'module') {
      const resourceCount = node.metadata?.resourceCount || 0;
      const outputCount = node.metadata?.outputCount || 0;
      return `Module: ${node.name}\nType: ${node.moduleType}\nResources: ${resourceCount}\nOutputs: ${outputCount}`;
    } else {
      return `${node.type || node.resourceType}\n${node.name}`;
    }
  }

  updatePositions() {
    if (this.links) {
      this.links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
    }

    if (this.linkLabels) {
      this.linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);
    }

    if (this.nodeGroups) {
      this.nodeGroups
        .attr('transform', d => `translate(${d.x},${d.y})`);
    }

    if (this.uiState.groupByApp && this.appRects) {
      this.updateAppGroupBounds();
    }
  }

  updateAppGroupBounds() {
    const self = this;
    this.appGroups.each(function([appId, nodes]) {
      const nodeCount = nodes.length;
      
      // Dynamic padding based on app size
      const basePadding = 40;
      const dynamicPadding = Math.max(basePadding, basePadding + (nodeCount * 3));
      
      // Calculate bounds with dynamic padding
      const bounds = {
        minX: d3.min(nodes, d => d.x) - dynamicPadding,
        maxX: d3.max(nodes, d => d.x) + dynamicPadding,
        minY: d3.min(nodes, d => d.y) - (dynamicPadding + 20), // Extra space for label
        maxY: d3.max(nodes, d => d.y) + dynamicPadding
      };

      // Ensure minimum size for readability
      const minWidth = 200;
      const minHeight = 150;
      const currentWidth = bounds.maxX - bounds.minX;
      const currentHeight = bounds.maxY - bounds.minY;
      
      if (currentWidth < minWidth) {
        const expand = (minWidth - currentWidth) / 2;
        bounds.minX -= expand;
        bounds.maxX += expand;
      }
      
      if (currentHeight < minHeight) {
        const expand = (minHeight - currentHeight) / 2;
        bounds.minY -= expand;
        bounds.maxY += expand;
      }

      const rect = d3.select(this).select('.app-group-rect')
        .attr('x', bounds.minX)
        .attr('y', bounds.minY)
        .attr('width', bounds.maxX - bounds.minX)
        .attr('height', bounds.maxY - bounds.minY);

      const label = d3.select(this).select('.app-group-label')
        .attr('x', (bounds.minX + bounds.maxX) / 2)
        .attr('y', bounds.minY + 18)
        .style('font-size', nodeCount > 10 ? '14px' : '12px')
        .style('font-weight', 'bold');
        
      // Add node count indicator
      let countLabel = d3.select(this).select('.app-node-count');
      if (countLabel.empty()) {
        countLabel = d3.select(this).append('text')
          .attr('class', 'app-node-count')
          .style('font-size', '10px')
          .style('fill', '#666')
          .style('text-anchor', 'middle')
          .style('pointer-events', 'none');
      }
      
      countLabel
        .attr('x', (bounds.minX + bounds.maxX) / 2)
        .attr('y', bounds.minY + 35)
        .text(`${nodeCount} resource${nodeCount !== 1 ? 's' : ''}`);
    });
  }

  updateGraphVisibility() {
    if (this.nodeLabels) {
      this.nodeLabels.style('display', this.uiState.showLabels ? 'block' : 'none');
    }
    
    if (this.links) {
      this.links.style('display', this.uiState.showDependencies ? 'block' : 'none');
    }

    if (this.linkLabels) {
      this.linkLabels.style('display', this.uiState.showDependencies && this.uiState.showLabels ? 'block' : 'none');
    }
  }

  applyFilters() {
    // Filter implementation
    this.processData();
    
    if (this.uiState.filter) {
      this.filteredData.nodes = this.filteredData.nodes.filter(node =>
        node.name.toLowerCase().includes(this.uiState.filter) ||
        node.type.toLowerCase().includes(this.uiState.filter)
      );
    }

    this.renderGraph();
    this.updateViewInfo();
  }

  populateAppList() {
    const appList = document.getElementById('app-list');
    
    if (!this.filteredData.apps.length) {
      appList.innerHTML = `
        <div class="app-item">
          <div class="app-icon">
            <i class="fas fa-cube"></i>
          </div>
          <div class="app-info">
            <div class="app-name">Local Demo</div>
            <div class="app-meta">2 resources</div>
          </div>
        </div>
      `;
      return;
    }

    const appHtml = this.filteredData.apps.map(app => `
      <div class="app-item" data-app-id="${app.id}">
        <div class="app-icon">
          <i class="fab fa-aws"></i>
        </div>
        <div class="app-info">
          <div class="app-name">${app.name}</div>
          <div class="app-meta">${app.repository ? `${app.repository.repo}` : 'Local'}</div>
        </div>
      </div>
    `).join('');

    appList.innerHTML = appHtml;

    // Add click handlers
    appList.querySelectorAll('.app-item').forEach(item => {
      item.addEventListener('click', () => {
        const appId = item.dataset.appId;
        this.selectApp(appId);
      });
    });
  }

  populateResourceTypes() {
    const resourceTypes = {};
    
    this.filteredData.nodes.forEach(node => {
      const type = node.type.replace('aws_', '').replace(/_/g, ' ');
      resourceTypes[type] = (resourceTypes[type] || 0) + 1;
    });

    const container = document.getElementById('resource-types');
    const typesHtml = Object.entries(resourceTypes).map(([type, count]) => `
      <div class="resource-type-filter" data-type="${type}">
        <span>${type}</span>
        <span class="resource-type-count">${count}</span>
      </div>
    `).join('');

    container.innerHTML = typesHtml;
  }

  updateViewInfo() {
    document.getElementById('resource-count').textContent = 
      `${this.filteredData.nodes.length} resource${this.filteredData.nodes.length !== 1 ? 's' : ''}`;
    
    document.getElementById('app-count').textContent = 
      `${this.filteredData.apps.length} application${this.filteredData.apps.length !== 1 ? 's' : ''}`;

    // Update cross-application statistics
    const crossAppLinks = this.filteredData.links.filter(link => link.crossApplication);
    if (crossAppLinks.length > 0) {
      const statsElement = document.getElementById('cross-app-stats');
      if (statsElement) {
        const apiIntegrations = crossAppLinks.filter(link => link.type === 'api_integration').length;
        const messagingIntegrations = crossAppLinks.filter(link => link.type === 'messaging_integration').length;
        const dataIntegrations = crossAppLinks.filter(link => link.type === 'data_integration').length;
        
        statsElement.innerHTML = `
          <div class="cross-app-summary">
            <strong>Cross-Application Integrations: ${crossAppLinks.length}</strong>
            ${apiIntegrations > 0 ? `<div>📡 API Integrations: ${apiIntegrations}</div>` : ''}
            ${messagingIntegrations > 0 ? `<div>💬 Messaging: ${messagingIntegrations}</div>` : ''}
            ${dataIntegrations > 0 ? `<div>📊 Data Sharing: ${dataIntegrations}</div>` : ''}
          </div>
        `;
      } else {
        // Create the element if it doesn't exist
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          const statsDiv = document.createElement('div');
          statsDiv.id = 'cross-app-stats';
          statsDiv.className = 'sidebar-section';
          sidebar.appendChild(statsDiv);
          this.updateViewInfo(); // Recursively call to populate
        }
      }
    }
  }

  updateMinimap() {
    // Minimap implementation
    const scale = 0.1;
    const minimapData = this.filteredData.nodes.map(node => ({
      x: node.x * scale,
      y: node.y * scale
    }));

    this.minimapGroup.selectAll('circle')
      .data(minimapData)
      .join('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 2)
      .attr('fill', '#007bff');
  }

  onNodeClick(event, d) {
    // Don't handle clicks if we're dragging
    if (this.isDragging) {
      console.log('Ignoring click during drag');
      return;
    }
    
    console.log('Processing node click:', d);
    this.uiState.selectedNode = d;
    this.showResourceDetails(d);
    
    // Hide hover card when clicking
    this.hideHoverCard();
    
    // Prevent event bubbling
    event.stopPropagation();
  }

  onNodeMouseover(event, d) {
    // Don't show hover effects during dragging
    if (this.isDragging) {
      return;
    }
    
    // Highlight connected nodes
    if (this.nodeGroups) {
      this.nodeGroups.style('opacity', 0.3);
      // Find the specific node element to highlight
      this.nodeGroups.filter(nodeData => nodeData.id === d.id).style('opacity', 1);
    }
    
    // Show hover card with configuration details
    this.showHoverCard(event, d);
  }

  onNodeMouseout(event, d) {
    if (this.nodeGroups) {
      this.nodeGroups.style('opacity', 1);
    }
    
    // Hide hover card immediately - no delay
    this.hideHoverCard();
  }

  // Cross-application link methods
  getLinkColor(link) {
    if (link.crossApplication) {
      switch (link.type) {
        case 'api_integration':
          return '#ff6b35'; // Orange for API calls
        case 'messaging_integration':
          return '#4ecdc4'; // Teal for messaging
        case 'data_integration':
          return '#95a5a6'; // Gray for data sharing
        default:
          return '#e74c3c'; // Red for other cross-app
      }
    }
    return '#999'; // Default gray for standard links
  }

  getLinkLabel(link) {
    if (link.metadata) {
      switch (link.type) {
        case 'api_integration':
          return `API (${link.metadata.protocol})`;
        case 'messaging_integration':
          return `MSG (${link.metadata.protocol})`;
        case 'data_integration':
          return `DATA (${link.metadata.protocol})`;
        default:
          return link.type.toUpperCase();
      }
    }
    return link.type?.toUpperCase() || 'CROSS-APP';
  }

  onLinkMouseover(event, link) {
    if (link.crossApplication) {
      // Highlight the link
      d3.select(event.currentTarget)
        .attr('stroke-width', 5)
        .attr('stroke-opacity', 1);
      
      // Show integration details
      this.showLinkTooltip(event, link);
    }
  }

  onLinkMouseout(event, link) {
    if (link.crossApplication) {
      // Reset link styling
      d3.select(event.currentTarget)
        .attr('stroke-width', 3)
        .attr('stroke-opacity', 0.8);
      
      // Hide tooltip
      this.hideLinkTooltip();
    }
  }

  showLinkTooltip(event, link) {
    // Create or update tooltip
    let tooltip = document.getElementById('link-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'link-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        max-width: 250px;
      `;
      document.body.appendChild(tooltip);
    }

    const metadata = link.metadata || {};
    tooltip.innerHTML = `
      <div><strong>Cross-Application Integration</strong></div>
      <div><strong>Type:</strong> ${link.type.replace('_', ' ').toUpperCase()}</div>
      ${metadata.protocol ? `<div><strong>Protocol:</strong> ${metadata.protocol}</div>` : ''}
      ${metadata.integration_type ? `<div><strong>Integration:</strong> ${metadata.integration_type}</div>` : ''}
      ${metadata.endpoint ? `<div><strong>Endpoint:</strong> ${metadata.endpoint}</div>` : ''}
      ${metadata.environment_variable ? `<div><strong>Env Var:</strong> ${metadata.environment_variable}</div>` : ''}
    `;

    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
    tooltip.style.display = 'block';
  }

  hideLinkTooltip() {
    const tooltip = document.getElementById('link-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  showHoverCard(event, node) {
    // Create or update hover card
    let hoverCard = document.getElementById('hover-card');
    if (!hoverCard) {
      hoverCard = document.createElement('div');
      hoverCard.id = 'hover-card';
      hoverCard.style.cssText = `
        position: fixed;
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10000;
        max-width: 320px;
        min-width: 200px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        display: none;
        opacity: 0;
        transform: scale(0.9);
        white-space: normal;
      `;
      document.body.appendChild(hoverCard);
    }

    // Get resource type and configuration details
    const resourceType = this.getResourceTypeDisplay(node.type);
    const config = node.config || {};
    const iconHtml = this.awsIconMap[node.type] 
      ? `<img src="${this.awsIconMap[node.type]}" alt="${node.type}" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;">`
      : `<div style="width: 20px; height: 20px; background: #666; border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 8px;"></div>`;

    // Build configuration summary
    const configSummary = this.buildConfigurationSummary(node.type, config);
    
    hoverCard.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        ${iconHtml}
        <div>
          <div style="font-weight: bold; font-size: 13px; color: #fff;">${node.name}</div>
          <div style="font-size: 10px; color: #ccc; opacity: 0.9;">${resourceType}</div>
        </div>
      </div>
      
      <div style="margin-bottom: 8px;">
        <div style="font-size: 10px; color: #ddd; margin-bottom: 4px;">
          <strong>Application:</strong> ${node.appName || node.group}
        </div>
        ${node.repository ? `
        <div style="font-size: 10px; color: #ddd; margin-bottom: 4px;">
          <strong>Repository:</strong> ${node.repository.repo || 'Unknown'}
        </div>
        ` : ''}
      </div>
      
      ${configSummary ? `
      <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px;">
        <div style="font-size: 10px; color: #ddd; margin-bottom: 4px;">
          <strong>Configuration:</strong>
        </div>
        <div style="font-size: 10px; color: #eee; line-height: 1.4;">
          ${configSummary}
        </div>
      </div>
      ` : ''}
    `;

    // Position the hover card using fixed positioning
    const cardWidth = 320;
    const cardHeight = hoverCard.offsetHeight || 100; // fallback height
    
    let left = event.clientX + 15;
    let top = event.clientY - 10;
    
    // Adjust position if card would go off screen
    if (left + cardWidth > window.innerWidth) {
      left = event.clientX - cardWidth - 15;
    }
    
    if (top + cardHeight > window.innerHeight) {
      top = event.clientY - cardHeight + 10;
    }
    
    hoverCard.style.left = left + 'px';
    hoverCard.style.top = top + 'px';
    
    // Show immediately - no delays or animations
    hoverCard.style.opacity = '1';
    hoverCard.style.transform = 'scale(1)';
    hoverCard.style.display = 'block';
  }

  hideHoverCard() {
    const hoverCard = document.getElementById('hover-card');
    if (hoverCard) {
      hoverCard.style.opacity = '0';
      hoverCard.style.transform = 'scale(0.9)';
      hoverCard.style.display = 'none';
    }
  }

  findNodeAtPosition(x, y) {
    if (!this.filteredData || !this.filteredData.nodes) return null;
    
    // x, y are mouse coordinates from d3.pointer(event, this.graphGroup.node())
    // These coordinates are already in the untransformed simulation coordinate space
    // node.x, node.y are also in the same simulation coordinate space
    // So we can compare them directly without applying transforms
    
    for (const node of this.filteredData.nodes) {
      if (node.x && node.y) {
        const distance = Math.sqrt(
          Math.pow(x - node.x, 2) + 
          Math.pow(y - node.y, 2)
        );
        
        // Check if mouse is within node radius
        const nodeRadius = this.config.nodeRadius;
        if (distance <= nodeRadius) {
          const nodeElement = this.graphGroup.selectAll('.node-group')
            .filter(d => d.id === node.id)
            .node();
          return nodeElement;
        }
      }
    }
    
    return null;
  }


  getResourceTypeDisplay(type) {
    const typeMap = {
      'aws_lambda_function': 'Lambda Function',
      'aws_api_gateway_rest_api': 'API Gateway',
      'aws_dynamodb_table': 'DynamoDB Table',
      'aws_s3_bucket': 'S3 Bucket',
      'aws_rds_cluster': 'RDS Aurora Cluster',
      'aws_rds_instance': 'RDS Instance',
      'aws_ecs_service': 'ECS Service',
      'aws_ecs_task_definition': 'ECS Task Definition',
      'aws_ecs_cluster': 'ECS Cluster',
      'aws_elasticache_replication_group': 'ElastiCache Redis',
      'aws_opensearch_domain': 'OpenSearch Domain',
      'aws_cloudfront_distribution': 'CloudFront Distribution',
      'aws_sagemaker_endpoint': 'SageMaker Endpoint',
      'aws_sns_topic': 'SNS Topic',
      'aws_sns_topic_subscription': 'SNS Subscription',
      'aws_sqs_queue': 'SQS Queue',
      'aws_iam_role': 'IAM Role',
      'aws_cognito_user_pool': 'Cognito User Pool',
      'aws_cognito_user_pool_client': 'Cognito Client',
      'aws_cloudwatch_log_group': 'CloudWatch Logs'
    };
    
    return typeMap[type] || type.replace(/^aws_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  buildConfigurationSummary(type, config) {
    const summaries = {
      'aws_lambda_function': () => {
        const parts = [];
        if (config.runtime) parts.push(`Runtime: ${config.runtime}`);
        if (config.memory_size) parts.push(`Memory: ${config.memory_size}MB`);
        if (config.timeout) parts.push(`Timeout: ${config.timeout}s`);
        if (config.handler) parts.push(`Handler: ${config.handler}`);
        return parts.join('<br>');
      },
      'aws_dynamodb_table': () => {
        const parts = [];
        if (config.hash_key) parts.push(`Hash Key: ${config.hash_key}`);
        if (config.range_key) parts.push(`Range Key: ${config.range_key}`);
        if (config.billing_mode) parts.push(`Billing: ${config.billing_mode}`);
        return parts.join('<br>');
      },
      'aws_s3_bucket': () => {
        const parts = [];
        if (config.bucket) parts.push(`Bucket: ${config.bucket}`);
        if (config.versioning) parts.push(`Versioning: Enabled`);
        if (config.encryption) parts.push(`Encrypted: Yes`);
        return parts.join('<br>');
      },
      'aws_rds_cluster': () => {
        const parts = [];
        if (config.engine) parts.push(`Engine: ${config.engine}`);
        if (config.engine_version) parts.push(`Version: ${config.engine_version}`);
        if (config.database_name) parts.push(`Database: ${config.database_name}`);
        if (config.backup_retention_period) parts.push(`Backup Retention: ${config.backup_retention_period} days`);
        return parts.join('<br>');
      },
      'aws_ecs_service': () => {
        const parts = [];
        if (config.desired_count) parts.push(`Desired Count: ${config.desired_count}`);
        if (config.cluster) parts.push(`Cluster: ${config.cluster}`);
        if (config.launch_type) parts.push(`Launch Type: ${config.launch_type}`);
        return parts.join('<br>');
      },
      'aws_ecs_task_definition': () => {
        const parts = [];
        if (config.family) parts.push(`Family: ${config.family}`);
        if (config.cpu) parts.push(`CPU: ${config.cpu}`);
        if (config.memory) parts.push(`Memory: ${config.memory}`);
        if (config.network_mode) parts.push(`Network: ${config.network_mode}`);
        return parts.join('<br>');
      },
      'aws_elasticache_replication_group': () => {
        const parts = [];
        if (config.node_type) parts.push(`Node Type: ${config.node_type}`);
        if (config.num_cache_clusters) parts.push(`Nodes: ${config.num_cache_clusters}`);
        if (config.engine) parts.push(`Engine: ${config.engine || 'Redis'}`);
        return parts.join('<br>');
      },
      'aws_opensearch_domain': () => {
        const parts = [];
        if (config.engine_version) parts.push(`Version: ${config.engine_version}`);
        if (config.instance_type) parts.push(`Instance: ${config.instance_type}`);
        if (config.instance_count) parts.push(`Count: ${config.instance_count}`);
        return parts.join('<br>');
      },
      'aws_sagemaker_endpoint': () => {
        const parts = [];
        if (config.name) parts.push(`Endpoint: ${config.name}`);
        if (config.endpoint_config_name) parts.push(`Config: ${config.endpoint_config_name}`);
        return parts.join('<br>');
      },
      'aws_api_gateway_rest_api': () => {
        const parts = [];
        if (config.name) parts.push(`API Name: ${config.name}`);
        if (config.description) parts.push(`Description: ${config.description}`);
        return parts.join('<br>');
      }
    };

    const summaryFn = summaries[type];
    if (summaryFn) {
      const summary = summaryFn();
      return summary || 'No configuration details available';
    }

    // Generic configuration summary
    const importantKeys = ['name', 'description', 'type', 'size', 'instance_type', 'engine', 'version'];
    const parts = [];
    
    importantKeys.forEach(key => {
      if (config[key] && typeof config[key] === 'string') {
        const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        parts.push(`${displayKey}: ${config[key]}`);
      }
    });
    
    return parts.length > 0 ? parts.join('<br>') : 'Configuration available in detail panel';
  }

  showResourceDetails(node) {
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');
    
    const iconHtml = this.awsIconMap[node.type] 
      ? `<img src="${this.awsIconMap[node.type]}" alt="${node.type}">`
      : `<i class="fas fa-cube"></i>`;

    content.innerHTML = `
      <div class="resource-detail">
        <div class="resource-header">
          <div class="resource-icon">${iconHtml}</div>
          <div class="resource-header-info">
            <div class="resource-name">${node.name}</div>
            <div class="resource-type">${node.type}</div>
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-section-title">Basic Information</div>
          <div class="detail-property">
            <span class="property-label">Resource ID</span>
            <span class="property-value">${node.id}</span>
          </div>
          <div class="detail-property">
            <span class="property-label">Type</span>
            <span class="property-value">${node.type}</span>
          </div>
          <div class="detail-property">
            <span class="property-label">Application</span>
            <span class="property-value">${node.appName}</span>
          </div>
          ${node.repository ? `
          <div class="detail-property">
            <span class="property-label">Repository</span>
            <span class="property-value">${node.repository.repo}</span>
          </div>
          ` : ''}
        </div>

        <div class="detail-section">
          <div class="detail-section-title">Configuration</div>
          ${Object.entries(node.config || {}).map(([key, value]) => `
            <div class="detail-property">
              <span class="property-label">${key}</span>
              <span class="property-value">${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    panel.classList.add('open');
  }

  closeDetailPanel() {
    document.getElementById('detail-panel').classList.remove('open');
    this.uiState.selectedNode = null;
  }

  selectApp(appId) {
    this.uiState.selectedApp = appId;
    
    // Update UI
    document.querySelectorAll('.app-item').forEach(item => {
      item.classList.toggle('active', item.dataset.appId === appId);
    });

    // Filter graph to show only selected app
    if (appId) {
      this.filteredData.nodes = this.filteredData.nodes.filter(node => node.group === appId);
    } else {
      this.processData();
    }

    this.renderGraph();
  }

  drag() {
    return d3.drag()
      .on('start', (event, d) => {
        console.log('Drag start:', d);
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        this.isDragging = true;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
        this.isDragging = true;
      })
      .on('end', (event, d) => {
        console.log('Drag end:', d);
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        // Add a small delay before allowing clicks again
        setTimeout(() => {
          this.isDragging = false;
        }, 100);
      });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  exportGraph() {
    const svgElement = this.svg.node();
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'overwatch-infrastructure-diagram.svg';
    link.click();
    
    URL.revokeObjectURL(url);
  }

  showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
        <p>${message}</p>
      </div>
    `;

    container.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove toast
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
  }

  updateEnterpriseUI() {
    if (this.enterpriseMode && this.currentAnalysis) {
      this.showEnterpriseInfo();
    } else {
      this.hideEnterpriseInfo();
    }
  }

  showEnterpriseInfo() {
    // Update breadcrumb
    const currentView = document.getElementById('current-view');
    if (currentView) {
      currentView.textContent = `Enterprise Analysis - ${this.uiState.selectedEnvironment.toUpperCase()}`;
    }

    // Show analysis summary
    if (this.currentAnalysis?.summary) {
      this.showAnalysisSummary(this.currentAnalysis.summary);
    }

    // Show recommendations if any
    if (this.currentAnalysis?.recommendations?.length > 0) {
      this.showRecommendations(this.currentAnalysis.recommendations);
    }
  }

  hideEnterpriseInfo() {
    const currentView = document.getElementById('current-view');
    if (currentView) {
      currentView.textContent = 'Infrastructure Overview';
    }
  }

  showAnalysisSummary(summary) {
    const summaryHtml = `
      <div class="analysis-summary">
        <h4>Analysis Summary</h4>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-label">Modules</span>
            <span class="stat-value">${summary.moduleCount || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Resources</span>
            <span class="stat-value">${summary.resourceCount || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Dependencies</span>
            <span class="stat-value">${summary.dependencyCount || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Issues</span>
            <span class="stat-value ${summary.criticalIssues > 0 ? 'critical' : ''}">${summary.criticalIssues || 0}</span>
          </div>
        </div>
      </div>
    `;

    // Add to sidebar if not already present
    let summaryContainer = document.getElementById('analysis-summary');
    if (!summaryContainer) {
      summaryContainer = document.createElement('div');
      summaryContainer.id = 'analysis-summary';
      summaryContainer.className = 'sidebar-section';
      document.querySelector('.sidebar').appendChild(summaryContainer);
    }
    summaryContainer.innerHTML = summaryHtml;
  }

  showRecommendations(recommendations) {
    const criticalRecommendations = recommendations.filter(r => r.priority === 'critical');
    
    if (criticalRecommendations.length > 0) {
      criticalRecommendations.forEach(rec => {
        this.showToast(`${rec.title}: ${rec.description}`, 'error');
      });
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new OverwatchVisualizer();
  window.visualizer = app;
  window.overwatch = app; // Expose for tests
});