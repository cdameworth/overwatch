const mongoose = require('mongoose');

// Telemetry metrics sub-schema
const telemetryMetricSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, index: true },
  metricName: { type: String, required: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  resourceId: { type: String, index: true },
  resourceType: { type: String, index: true },
  tags: { type: Map, of: String },
  unit: String,
  region: { type: String, index: true }
}, { _id: false });

// AWS Resource sub-schema
const resourceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true, index: true },
  name: String,
  region: { type: String, index: true },
  configuration: { type: mongoose.Schema.Types.Mixed },
  dependencies: [String],
  tags: { type: Map, of: String },
  status: { type: String, enum: ['active', 'inactive', 'error'], default: 'active' },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

// Configuration History sub-schema
const configurationHistorySchema = new mongoose.Schema({
  version: { type: Number, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  changeLog: String,
  author: String,
  commitHash: String,
  
  // Snapshot of configuration at this version
  resources: {
    resource: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  dependencies: [mongoose.Schema.Types.Mixed],
  groups: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  // GitHub context
  repositoryOwner: String,
  repositoryName: String,
  branch: String,
  
  // Change metrics
  resourcesAdded: { type: Number, default: 0 },
  resourcesModified: { type: Number, default: 0 },
  resourcesRemoved: { type: Number, default: 0 },
  
  // Configuration size for storage optimization
  configurationSize: { type: Number, default: 0 }
}, { _id: false });

// Application main schema
const applicationSchema = new mongoose.Schema({
  // Basic application info
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  description: String,
  
  // GitHub integration
  repositoryOwner: { type: String, index: true },
  repositoryName: { type: String, index: true },
  branch: { type: String, default: 'main' },
  lastSync: { type: Date, index: true },
  
  // Infrastructure configuration
  resources: {
    resource: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  dependencies: [mongoose.Schema.Types.Mixed],
  groups: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  // Telemetry data
  telemetryMetrics: [telemetryMetricSchema],
  healthStatus: { 
    type: String, 
    enum: ['healthy', 'warning', 'critical', 'unknown'], 
    default: 'unknown',
    index: true
  },
  
  // Cross-application analysis
  crossApplicationDependencies: [mongoose.Schema.Types.Mixed],
  
  // Configuration History
  currentVersion: { type: Number, default: 1, index: true },
  configurationHistory: [configurationHistorySchema],
  
  // Metadata
  environment: { type: String, enum: ['dev', 'staging', 'prod'], default: 'prod', index: true },
  version: String,
  tags: { type: Map, of: String },
  
  // Audit fields
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now, index: true },
  createdBy: String,
  updatedBy: String
}, {
  timestamps: true,
  collection: 'applications'
});

// ================================
// PERFORMANCE INDEXES
// ================================

// Primary query indexes
applicationSchema.index({ id: 1 }); // Primary key lookup
applicationSchema.index({ name: 1 }); // Application name searches
applicationSchema.index({ repositoryOwner: 1, repositoryName: 1 }); // GitHub repository queries

// Time-based queries
applicationSchema.index({ lastSync: -1 }); // Recent sync queries
applicationSchema.index({ createdAt: -1 }); // Recent applications
applicationSchema.index({ updatedAt: -1 }); // Recently modified

// Status and health monitoring
applicationSchema.index({ healthStatus: 1, environment: 1 }); // Health dashboards
applicationSchema.index({ environment: 1, healthStatus: 1 }); // Environment-specific health

// Telemetry performance indexes
applicationSchema.index({ 'telemetryMetrics.timestamp': -1 }); // Time-series queries
applicationSchema.index({ 'telemetryMetrics.metricName': 1, 'telemetryMetrics.timestamp': -1 }); // Metric-specific time-series
applicationSchema.index({ 'telemetryMetrics.resourceId': 1, 'telemetryMetrics.timestamp': -1 }); // Resource-specific metrics
applicationSchema.index({ 'telemetryMetrics.resourceType': 1, 'telemetryMetrics.metricName': 1 }); // Resource type analytics

// Configuration history performance indexes
applicationSchema.index({ currentVersion: -1 }); // Latest version queries
applicationSchema.index({ 'configurationHistory.version': -1 }); // Version-specific queries
applicationSchema.index({ 'configurationHistory.timestamp': -1 }); // Time-based history queries
applicationSchema.index({ 'configurationHistory.author': 1, 'configurationHistory.timestamp': -1 }); // Author-based history
applicationSchema.index({ id: 1, 'configurationHistory.version': -1 }); // App-specific version queries

// Multi-field performance indexes
applicationSchema.index({ 
  environment: 1, 
  repositoryOwner: 1, 
  repositoryName: 1,
  lastSync: -1 
}); // Complex filtering queries

applicationSchema.index({
  healthStatus: 1,
  'telemetryMetrics.timestamp': -1
}); // Health status with recent metrics

// Text search index for application discovery
applicationSchema.index({
  name: 'text',
  description: 'text',
  repositoryName: 'text'
}, {
  weights: {
    name: 3,
    repositoryName: 2,
    description: 1
  },
  name: 'application_text_search'
});

// Sparse indexes for optional fields
applicationSchema.index({ repositoryOwner: 1 }, { sparse: true });
applicationSchema.index({ branch: 1 }, { sparse: true });

// ================================
// SCHEMA METHODS
// ================================

// Instance method to add telemetry data
applicationSchema.methods.addTelemetryMetric = function(metric) {
  this.telemetryMetrics.push({
    timestamp: metric.timestamp || new Date(),
    metricName: metric.metricName,
    value: metric.value,
    resourceId: metric.resourceId,
    resourceType: metric.resourceType,
    tags: metric.tags,
    unit: metric.unit,
    region: metric.region
  });
  
  // Keep only the last 1000 metrics per application to manage size
  if (this.telemetryMetrics.length > 1000) {
    this.telemetryMetrics = this.telemetryMetrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 1000);
  }
};

// Instance method to add configuration snapshot to history
applicationSchema.methods.addConfigurationSnapshot = function(options = {}) {
  const {
    changeLog = 'Configuration updated',
    author = 'system',
    commitHash = null
  } = options;

  // Calculate change metrics by comparing with previous version
  let resourcesAdded = 0, resourcesModified = 0, resourcesRemoved = 0;
  
  if (this.configurationHistory.length > 0) {
    const previousConfig = this.configurationHistory[this.configurationHistory.length - 1];
    const currentResources = this.resources?.resource || {};
    const previousResources = previousConfig.resources?.resource || {};
    
    // Calculate changes
    const currentKeys = Object.keys(currentResources);
    const previousKeys = Object.keys(previousResources);
    
    resourcesAdded = currentKeys.filter(key => !previousKeys.includes(key)).length;
    resourcesRemoved = previousKeys.filter(key => !currentKeys.includes(key)).length;
    resourcesModified = currentKeys.filter(key => 
      previousKeys.includes(key) && 
      JSON.stringify(currentResources[key]) !== JSON.stringify(previousResources[key])
    ).length;
  } else {
    // First version - all resources are "added"
    resourcesAdded = Object.keys(this.resources?.resource || {}).length;
  }

  // Create configuration snapshot
  const snapshot = {
    version: this.currentVersion,
    timestamp: new Date(),
    changeLog,
    author,
    commitHash,
    
    // Deep copy of current configuration
    resources: JSON.parse(JSON.stringify(this.resources || {})),
    dependencies: JSON.parse(JSON.stringify(this.dependencies || [])),
    groups: JSON.parse(JSON.stringify(this.groups || {})),
    
    // GitHub context
    repositoryOwner: this.repositoryOwner,
    repositoryName: this.repositoryName,
    branch: this.branch,
    
    // Change metrics
    resourcesAdded,
    resourcesModified,
    resourcesRemoved,
    
    // Configuration size for storage tracking
    configurationSize: JSON.stringify(this.resources || {}).length
  };

  // Add to history
  this.configurationHistory.push(snapshot);
  
  // Keep only the last 5 versions to manage storage
  if (this.configurationHistory.length > 5) {
    this.configurationHistory = this.configurationHistory
      .sort((a, b) => b.version - a.version)
      .slice(0, 5);
  }
  
  // Increment version for next update
  this.currentVersion += 1;
};

// Instance method to get configuration diff between versions
applicationSchema.methods.getConfigurationDiff = function(fromVersion, toVersion = null) {
  if (!toVersion) toVersion = this.currentVersion - 1; // Current version
  
  // Find the configurations
  const fromConfig = this.configurationHistory.find(h => h.version === fromVersion);
  const toConfig = toVersion === this.currentVersion - 1 ? 
    { // Current version data
      version: this.currentVersion - 1,
      timestamp: this.updatedAt,
      changeLog: 'Current version',
      author: 'current',
      resourcesAdded: 0,
      resourcesModified: 0, 
      resourcesRemoved: 0
    } : this.configurationHistory.find(h => h.version === toVersion);
    
  if (!fromConfig || !toConfig) {
    return { 
      error: 'Version not found',
      availableVersions: this.configurationHistory.map(h => h.version).sort((a, b) => b - a),
      currentVersion: this.currentVersion - 1
    };
  }
  
  return {
    fromVersion,
    toVersion,
    fromTimestamp: fromConfig.timestamp,
    toTimestamp: toConfig.timestamp,
    resourcesAdded: toConfig.resourcesAdded || 0,
    resourcesModified: toConfig.resourcesModified || 0,
    resourcesRemoved: toConfig.resourcesRemoved || 0,
    changeLog: toConfig.changeLog || 'No change log available',
    author: toConfig.author || 'unknown'
  };
};

// Instance method to rollback to a previous version
applicationSchema.methods.rollbackToVersion = function(targetVersion, options = {}) {
  const targetConfig = this.configurationHistory.find(h => h.version === targetVersion);
  if (!targetConfig) {
    throw new Error(`Version ${targetVersion} not found in configuration history`);
  }
  
  // Save current state to history before rollback
  this.addConfigurationSnapshot({
    changeLog: `Pre-rollback snapshot (rolling back to v${targetVersion})`,
    author: options.author || 'system'
  });
  
  // Restore configuration from target version
  this.resources = JSON.parse(JSON.stringify(targetConfig.resources));
  this.dependencies = JSON.parse(JSON.stringify(targetConfig.dependencies));
  this.groups = JSON.parse(JSON.stringify(targetConfig.groups));
  
  // Add rollback snapshot
  this.addConfigurationSnapshot({
    changeLog: `Rolled back to version ${targetVersion}: ${targetConfig.changeLog}`,
    author: options.author || 'system'
  });
  
  return {
    success: true,
    message: `Successfully rolled back to version ${targetVersion}`,
    targetVersion,
    currentVersion: this.currentVersion - 1
  };
};

// Static method to find applications by health status
applicationSchema.statics.findByHealthStatus = function(status, environment = null) {
  const query = { healthStatus: status };
  if (environment) {
    query.environment = environment;
  }
  return this.find(query).sort({ updatedAt: -1 });
};

// Static method to find applications needing sync
applicationSchema.statics.findStaleApplications = function(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
  const cutoff = new Date(Date.now() - maxAge);
  return this.find({
    $or: [
      { lastSync: { $lt: cutoff } },
      { lastSync: { $exists: false } }
    ]
  }).sort({ lastSync: 1 });
};

// Virtual for latest telemetry
applicationSchema.virtual('latestTelemetry').get(function() {
  if (!this.telemetryMetrics || this.telemetryMetrics.length === 0) {
    return null;
  }
  return this.telemetryMetrics
    .sort((a, b) => b.timestamp - a.timestamp)[0];
});

// ================================
// MIDDLEWARE
// ================================

// Pre-save middleware to update timestamps
applicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to update health status based on telemetry
applicationSchema.pre('save', function(next) {
  if (this.telemetryMetrics && this.telemetryMetrics.length > 0) {
    const recentMetrics = this.telemetryMetrics.filter(
      metric => (Date.now() - metric.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
    );
    
    if (recentMetrics.length === 0) {
      this.healthStatus = 'unknown';
    } else {
      // Simple health logic - can be enhanced
      const errorMetrics = recentMetrics.filter(
        metric => metric.metricName.includes('error') || metric.value > 100
      );
      
      if (errorMetrics.length > 0) {
        this.healthStatus = 'critical';
      } else {
        this.healthStatus = 'healthy';
      }
    }
  }
  next();
});

module.exports = mongoose.model('Application', applicationSchema);