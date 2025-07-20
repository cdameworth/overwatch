class AwsAppVisualizer {
  constructor() {
    this.data = null;
    this.filteredData = null;
    this.svg = null;
    this.simulation = null;
    this.zoom = null;
    this.currentTransform = d3.zoomIdentity;
    
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
      
      // Storage
      'aws_s3_bucket': 'icons/s3.svg',
      
      // Database
      'aws_dynamodb_table': 'icons/dynamodb.svg',
      'aws_rds_instance': 'icons/rds.svg',
      'aws_db_instance': 'icons/rds.svg',
      
      // Networking & Content Delivery
      'aws_vpc': 'icons/vpc.svg',
      'aws_internet_gateway': 'icons/vpc.svg',
      'aws_lb': 'icons/alb.svg',
      'aws_alb': 'icons/alb.svg',
      'aws_lb_listener': 'icons/alb.svg',
      'aws_lb_target_group': 'icons/alb.svg',
      'aws_route53_zone': 'icons/route53-zone.svg',
      'aws_route53_record': 'icons/route53.svg',
      
      // Application Integration
      'aws_api_gateway_rest_api': 'icons/apigateway.svg',
      'aws_api_gateway_resource': 'icons/apigateway.svg',
      'aws_api_gateway_method': 'icons/apigateway.svg',
      'aws_api_gateway_integration': 'icons/apigateway.svg',
      'aws_api_gateway_deployment': 'icons/apigateway.svg',
      'aws_api_gateway_stage': 'icons/apigateway.svg',
      'aws_sns_topic': 'icons/sns.svg',
      
      // Security, Identity & Compliance
      'aws_iam_role': 'icons/iamrole.svg',
      'aws_iam_policy': 'icons/iamrole.svg',
      'aws_iam_user': 'icons/iamrole.svg',
      'aws_acm_certificate': 'icons/acm.svg',
      
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
      filter: ''
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupGraph();
    this.loadData();
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
        this.svg.select('.graph-group').attr('transform', event.transform);
        this.updateMinimap();
      });

    this.svg.call(this.zoom);

    // Create main group for graph elements
    this.graphGroup = this.svg.append('g').attr('class', 'graph-group');

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
      const response = await fetch('http://localhost:4000/api/parse');
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      this.data = await response.json();
      this.processData();
      this.renderGraph();
      this.populateAppList();
      this.populateResourceTypes();
      this.updateViewInfo();
      this.showToast('Data loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast(`Failed to load data: ${error.message}`, 'error');
    } finally {
      this.hideLoading();
    }
  }

  processData() {
    if (!this.data || !this.data.resources) {
      this.filteredData = { nodes: [], links: [], apps: [] };
      return;
    }

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
          repository: group?.repository
        });
      });
    });

    // Create links from dependencies
    const links = (this.data.dependencies || []).map(dep => ({
      source: dep.from,
      target: dep.to,
      id: `${dep.from}-${dep.to}`
    }));

    this.filteredData = {
      nodes,
      links,
      apps: this.data.apps || []
    };
  }

  renderGraph() {
    if (!this.filteredData) return;

    this.graphGroup.selectAll('*').remove();

    // Apply grouping forces if enabled
    if (this.uiState.groupByApp) {
      this.setupAppGrouping();
    }

    // Render app groups
    if (this.uiState.groupByApp) {
      this.renderAppGroups();
    }

    // Render links
    this.renderLinks();

    // Render nodes
    this.renderNodes();

    // Update simulation
    this.simulation
      .nodes(this.filteredData.nodes)
      .on('tick', () => this.updatePositions());

    this.simulation.force('link')
      .links(this.filteredData.links);

    this.simulation.alpha(1).restart();

    this.updateMinimap();
  }

  setupAppGrouping() {
    const apps = [...new Set(this.filteredData.nodes.map(n => n.group))];
    const appCenters = {};
    
    apps.forEach((appId, i) => {
      const angle = (i * 2 * Math.PI) / apps.length;
      const radius = 300;
      appCenters[appId] = {
        x: this.config.width / 2 + Math.cos(angle) * radius,
        y: this.config.height / 2 + Math.sin(angle) * radius
      };
    });

    this.simulation
      .force('x', d3.forceX(d => appCenters[d.group]?.x || this.config.width / 2).strength(0.3))
      .force('y', d3.forceY(d => appCenters[d.group]?.y || this.config.height / 2).strength(0.3));
  }

  renderAppGroups() {
    const apps = d3.group(this.filteredData.nodes, d => d.group);
    
    this.appGroups = this.graphGroup.selectAll('.app-group')
      .data(Array.from(apps.entries()))
      .enter()
      .append('g')
      .attr('class', 'app-group');

    this.appRects = this.appGroups.append('rect')
      .attr('class', 'app-group-rect')
      .attr('fill', (d, i) => this.config.colors(i))
      .attr('rx', 16);

    this.appLabels = this.appGroups.append('text')
      .attr('class', 'app-group-label')
      .text(d => d[1][0]?.appName || d[0]);
  }

  renderLinks() {
    this.links = this.graphGroup.selectAll('.link')
      .data(this.filteredData.links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);
  }

  renderNodes() {
    this.nodeGroups = this.graphGroup.selectAll('.node-group')
      .data(this.filteredData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .call(this.drag())
      .on('click', (event, d) => this.onNodeClick(event, d))
      .on('mouseover', (event, d) => this.onNodeMouseover(event, d))
      .on('mouseout', (event, d) => this.onNodeMouseout(event, d));

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
      .text(d => `${d.type}\n${d.name}`);
  }

  updatePositions() {
    if (this.links) {
      this.links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
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
    this.appGroups.each(function([appId, nodes]) {
      const bounds = {
        minX: d3.min(nodes, d => d.x) - 60,
        maxX: d3.max(nodes, d => d.x) + 60,
        minY: d3.min(nodes, d => d.y) - 60,
        maxY: d3.max(nodes, d => d.y) + 60
      };

      d3.select(this).select('.app-group-rect')
        .attr('x', bounds.minX)
        .attr('y', bounds.minY)
        .attr('width', bounds.maxX - bounds.minX)
        .attr('height', bounds.maxY - bounds.minY);

      d3.select(this).select('.app-group-label')
        .attr('x', (bounds.minX + bounds.maxX) / 2)
        .attr('y', bounds.minY + 20);
    });
  }

  updateGraphVisibility() {
    if (this.nodeLabels) {
      this.nodeLabels.style('display', this.uiState.showLabels ? 'block' : 'none');
    }
    
    if (this.links) {
      this.links.style('display', this.uiState.showDependencies ? 'block' : 'none');
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
    this.uiState.selectedNode = d;
    this.showResourceDetails(d);
  }

  onNodeMouseover(event, d) {
    // Highlight connected nodes
    if (this.nodeGroups) {
      this.nodeGroups.style('opacity', 0.3);
      d3.select(event.currentTarget).style('opacity', 1);
    }
  }

  onNodeMouseout(event, d) {
    if (this.nodeGroups) {
      this.nodeGroups.style('opacity', 1);
    }
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
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
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
    link.download = 'aws-architecture-diagram.svg';
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
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  window.visualizer = new AwsAppVisualizer();
});