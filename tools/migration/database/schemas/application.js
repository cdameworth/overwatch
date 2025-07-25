const mongoose = require('mongoose');

// Telemetry metrics schema for storing application performance data
const TelemetryMetricSchema = new mongoose.Schema({
  metricName: {
    type: String,
    required: true,
    enum: ['cpu_utilization', 'memory_utilization', 'request_count', 'error_rate', 'response_time', 'disk_usage', 'network_io', 'custom']
  },
  value: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true // e.g., 'percent', 'milliseconds', 'count', 'bytes'
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  source: {
    type: String,
    required: true // e.g., 'cloudwatch', 'datadog', 'prometheus', 'manual'
  },
  environment: {
    type: String,
    required: true
  }
});

// Aggregated telemetry data for performance analytics
const TelemetryAggregateSchema = new mongoose.Schema({
  metricName: String,
  environment: String,
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true
  },
  startTime: Date,
  endTime: Date,
  aggregation: {
    avg: Number,
    min: Number,
    max: Number,
    sum: Number,
    count: Number,
    p50: Number,
    p95: Number,
    p99: Number
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Team/ownership information schema
const TeamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true
  },
  contactEmail: {
    type: String,
    required: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  slackChannel: String,
  onCallRotation: String,
  department: {
    type: String,
    required: true
  },
  organization: {
    type: String,
    required: true
  },
  manager: {
    name: String,
    email: String
  }
});

// Application version schema with configuration tracking
const ApplicationVersionSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true
  },
  deploymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  gitCommit: String,
  gitBranch: String,
  repository: {
    url: String,
    provider: String // 'github', 'gitlab', 'bitbucket'
  },
  terraformConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  dependencies: [{
    type: String
  }],
  deployedBy: {
    name: String,
    email: String
  },
  rollbackVersion: String,
  isActive: {
    type: Boolean,
    default: true
  },
  environment: {
    type: String,
    required: true,
    enum: ['development', 'staging', 'production', 'testing', 'qa']
  }
});

// Main application schema
const ApplicationSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  applicationTier: {
    type: String,
    enum: ['frontend', 'backend', 'database', 'middleware', 'infrastructure', 'ai-ml', 'analytics'],
    required: true
  },
  businessCriticality: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  
  // Team and ownership information
  ownership: {
    type: TeamSchema,
    required: true
  },
  
  // Version history (keep last 10 versions per environment)
  versions: {
    type: Map,
    of: [ApplicationVersionSchema],
    default: new Map()
  },
  
  // Current active versions per environment
  activeVersions: {
    development: String,
    staging: String,
    production: String,
    testing: String,
    qa: String
  },
  
  // AWS and infrastructure metadata
  infrastructure: {
    awsAccountId: String,
    region: String,
    vpc: String,
    resources: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    dependencies: [{
      type: String
    }],
    crossApplicationDependencies: [{
      targetApplicationId: String,
      dependencyType: {
        type: String,
        enum: ['api', 'database', 'messaging', 'storage', 'network']
      },
      description: String
    }]
  },
  
  // Telemetry and monitoring
  telemetry: {
    // Raw telemetry data (last 1000 data points per metric per environment)
    metrics: {
      type: Map,
      of: [TelemetryMetricSchema],
      default: new Map()
    },
    
    // Pre-aggregated data for performance
    aggregates: {
      type: Map,
      of: [TelemetryAggregateSchema], 
      default: new Map()
    },
    
    // Current health status
    healthStatus: {
      overall: {
        type: String,
        enum: ['healthy', 'warning', 'critical', 'unknown'],
        default: 'unknown'
      },
      environments: {
        development: {
          type: String,
          enum: ['healthy', 'warning', 'critical', 'unknown'],
          default: 'unknown'
        },
        staging: {
          type: String,
          enum: ['healthy', 'warning', 'critical', 'unknown'],
          default: 'unknown'
        },
        production: {
          type: String,
          enum: ['healthy', 'warning', 'critical', 'unknown'],
          default: 'unknown'
        }
      }
    },
    
    // Monitoring configuration
    monitoring: {
      datadogDashboard: String,
      cloudwatchNamespace: String,
      prometheusLabels: mongoose.Schema.Types.Mixed,
      alertingRules: [{
        metricName: String,
        threshold: Number,
        operator: String, // 'gt', 'lt', 'eq'
        severity: String
      }]
    }
  },
  
  // CMDB and external system integration
  externalReferences: {
    cmdbId: String,
    servicenowId: String,
    jiraProject: String,
    confluenceSpace: String,
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map()
    }
  },
  
  // Audit trail
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'deployed', 'rolled_back', 'deleted', 'telemetry_updated']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: String,
    userEmail: String,
    changes: mongoose.Schema.Types.Mixed,
    source: String // 'api', 'ui', 'automation', 'migration'
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastSyncAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
});

// Indexes for performance
ApplicationSchema.index({ 'ownership.department': 1 });
ApplicationSchema.index({ 'ownership.organization': 1 });
ApplicationSchema.index({ 'activeVersions.production': 1 });
ApplicationSchema.index({ 'telemetry.healthStatus.overall': 1 });
ApplicationSchema.index({ 'infrastructure.awsAccountId': 1 });
ApplicationSchema.index({ businessCriticality: 1 });
ApplicationSchema.index({ applicationTier: 1 });
ApplicationSchema.index({ createdAt: -1 });
ApplicationSchema.index({ updatedAt: -1 });

// Compound indexes for common queries
ApplicationSchema.index({ 'ownership.organization': 1, 'ownership.department': 1 });
ApplicationSchema.index({ applicationTier: 1, businessCriticality: 1 });
ApplicationSchema.index({ 'infrastructure.awsAccountId': 1, 'infrastructure.region': 1 });

// Middleware to update updatedAt on save
ApplicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for getting current production version details
ApplicationSchema.virtual('currentProductionVersion').get(function() {
  if (this.activeVersions && this.activeVersions.production && this.versions) {
    const prodVersions = this.versions.get('production') || [];
    return prodVersions.find(v => v.version === this.activeVersions.production);
  }
  return null;
});

// Method to add telemetry data point
ApplicationSchema.methods.addTelemetryMetric = function(metricName, value, unit, environment, source = 'manual') {
  const metric = {
    metricName,
    value,
    unit,
    timestamp: new Date(),
    source,
    environment
  };
  
  const key = `${environment}_${metricName}`;
  if (!this.telemetry.metrics.has(key)) {
    this.telemetry.metrics.set(key, []);
  }
  
  const metrics = this.telemetry.metrics.get(key);
  metrics.push(metric);
  
  // Keep only last 1000 data points
  if (metrics.length > 1000) {
    metrics.splice(0, metrics.length - 1000);
  }
  
  this.telemetry.metrics.set(key, metrics);
  return this.save();
};

// Method to get aggregated telemetry data
ApplicationSchema.methods.getTelemetryAggregates = function(metricName, environment, period = 'daily') {
  const key = `${environment}_${metricName}_${period}`;
  return this.telemetry.aggregates.get(key) || [];
};

// Method to update health status based on telemetry
ApplicationSchema.methods.updateHealthStatus = function() {
  // Simple health calculation based on error rates and response times
  const environments = ['development', 'staging', 'production'];
  
  for (const env of environments) {
    const errorRateKey = `${env}_error_rate`;
    const responseTimeKey = `${env}_response_time`;
    
    const errorRateMetrics = this.telemetry.metrics.get(errorRateKey) || [];
    const responseTimeMetrics = this.telemetry.metrics.get(responseTimeKey) || [];
    
    let healthStatus = 'unknown';
    
    if (errorRateMetrics.length > 0 || responseTimeMetrics.length > 0) {
      const recentErrorRate = errorRateMetrics.slice(-10).reduce((avg, m) => avg + m.value, 0) / Math.max(errorRateMetrics.slice(-10).length, 1);
      const recentResponseTime = responseTimeMetrics.slice(-10).reduce((avg, m) => avg + m.value, 0) / Math.max(responseTimeMetrics.slice(-10).length, 1);
      
      if (recentErrorRate > 5 || recentResponseTime > 5000) {
        healthStatus = 'critical';
      } else if (recentErrorRate > 1 || recentResponseTime > 2000) {
        healthStatus = 'warning';
      } else {
        healthStatus = 'healthy';
      }
    }
    
    this.telemetry.healthStatus.environments[env] = healthStatus;
  }
  
  // Overall health is worst of all environments
  const envStatuses = Object.values(this.telemetry.healthStatus.environments);
  if (envStatuses.includes('critical')) {
    this.telemetry.healthStatus.overall = 'critical';
  } else if (envStatuses.includes('warning')) {
    this.telemetry.healthStatus.overall = 'warning';
  } else if (envStatuses.includes('healthy')) {
    this.telemetry.healthStatus.overall = 'healthy';
  } else {
    this.telemetry.healthStatus.overall = 'unknown';
  }
  
  return this.save();
};

module.exports = mongoose.model('Application', ApplicationSchema);