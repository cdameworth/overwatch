const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import schemas
const Application = require('./database/schemas/application');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://overwatch-db:27017/overwatch';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// API key authentication for external systems
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // In production, store API keys in database with proper hashing
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  req.apiAccess = true;
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// ======================
// APPLICATION ENDPOINTS
// ======================

// Get all applications with optional filtering
app.get('/api/applications', authenticateToken, async (req, res) => {
  try {
    const {
      organization,
      department,
      tier,
      criticality,
      environment,
      healthStatus,
      page = 1,
      limit = 50,
      sortBy = 'updatedAt',
      sortOrder = -1
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (organization) filter['ownership.organization'] = organization;
    if (department) filter['ownership.department'] = department;
    if (tier) filter.applicationTier = tier;
    if (criticality) filter.businessCriticality = criticality;
    if (healthStatus) filter['telemetry.healthStatus.overall'] = healthStatus;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const applications = await Application
      .find(filter)
      .select('-telemetry.metrics -auditLog') // Exclude large fields for list view
      .sort({ [sortBy]: parseInt(sortOrder) })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Application.countDocuments(filter);

    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
  }
});

// Get single application by ID
app.get('/api/applications/:applicationId', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { includeTelemetry = 'false' } = req.query;
    
    let selectFields = '-auditLog';
    if (includeTelemetry === 'false') {
      selectFields += ' -telemetry.metrics';
    }
    
    const application = await Application
      .findOne({ applicationId, isActive: true })
      .select(selectFields);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ application });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application', details: error.message });
  }
});

// Create new application
app.post('/api/applications', authenticateToken, async (req, res) => {
  try {
    const applicationData = req.body;
    
    // Add audit log entry
    applicationData.auditLog = [{
      action: 'created',
      userId: req.user.id,
      userEmail: req.user.email,
      source: 'api',
      changes: applicationData
    }];

    const application = new Application(applicationData);
    
    // Add initial configuration snapshot to history
    application.addConfigurationSnapshot({
      changeLog: 'Initial application configuration',
      author: req.user?.email || 'system'
    });
    
    await application.save();

    res.status(201).json({ 
      message: 'Application created successfully',
      applicationId: application.applicationId 
    });
  } catch (error) {
    console.error('Error creating application:', error);
    if (error.code === 11000) {
      res.status(409).json({ error: 'Application ID already exists' });
    } else {
      res.status(400).json({ error: 'Failed to create application', details: error.message });
    }
  }
});

// Update application
app.put('/api/applications/:applicationId', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const updateData = req.body;
    
    const application = await Application.findOne({ applicationId, isActive: true });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Track changes for audit log
    const changes = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (JSON.stringify(application[key]) !== JSON.stringify(value)) {
        changes[key] = { from: application[key], to: value };
      }
    }

    // Add audit log entry
    application.auditLog.push({
      action: 'updated',
      userId: req.user.id,
      userEmail: req.user.email,
      source: 'api',
      changes
    });

    // Check if infrastructure configuration changed
    const infrastructureChanged = updateData.resources || updateData.dependencies || updateData.groups;
    
    // Apply updates
    Object.assign(application, updateData);
    
    // Add configuration snapshot if infrastructure changed
    if (infrastructureChanged) {
      application.addConfigurationSnapshot({
        changeLog: updateData.changeLog || `Updated: ${Object.keys(changes).join(', ')}`,
        author: req.user?.email || 'system',
        commitHash: updateData.commitHash || null
      });
    }
    
    await application.save();

    res.json({ message: 'Application updated successfully' });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(400).json({ error: 'Failed to update application', details: error.message });
  }
});

// =========================
// CONFIGURATION HISTORY ENDPOINTS
// =========================

// Get configuration history for an application
app.get('/api/applications/:applicationId/history', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { limit = 5, offset = 0 } = req.query;

    const application = await Application.findOne({ applicationId, isActive: true })
      .select('applicationId name configurationHistory currentVersion')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Sort history by version descending and apply pagination
    const history = application.configurationHistory
      .sort((a, b) => b.version - a.version)
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      applicationId: application.applicationId,
      applicationName: application.name,
      currentVersion: application.currentVersion,
      totalVersions: application.configurationHistory.length,
      history
    });
  } catch (error) {
    console.error('Error fetching configuration history:', error);
    res.status(500).json({ error: 'Failed to fetch configuration history', details: error.message });
  }
});

// Get specific version of application configuration
app.get('/api/applications/:applicationId/history/:version', authenticateToken, async (req, res) => {
  try {
    const { applicationId, version } = req.params;

    const application = await Application.findOne({ applicationId, isActive: true })
      .select('applicationId name configurationHistory currentVersion resources dependencies groups')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const targetVersion = parseInt(version);
    let versionData;

    if (targetVersion === application.currentVersion - 1) {
      // Current version
      versionData = {
        version: application.currentVersion - 1,
        timestamp: new Date(),
        changeLog: 'Current version',
        author: 'current',
        resources: application.resources,
        dependencies: application.dependencies,
        groups: application.groups,
        isCurrent: true
      };
    } else {
      // Historical version
      versionData = application.configurationHistory.find(h => h.version === targetVersion);
    }

    if (!versionData) {
      return res.status(404).json({ error: `Version ${version} not found` });
    }

    res.json({
      applicationId: application.applicationId,
      applicationName: application.name,
      versionData
    });
  } catch (error) {
    console.error('Error fetching version:', error);
    res.status(500).json({ error: 'Failed to fetch version', details: error.message });
  }
});

// Compare two versions of application configuration
app.get('/api/applications/:applicationId/diff/:fromVersion/:toVersion', authenticateToken, async (req, res) => {
  try {
    const { applicationId, fromVersion, toVersion } = req.params;

    const application = await Application.findOne({ applicationId, isActive: true });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const diff = application.getConfigurationDiff(parseInt(fromVersion), parseInt(toVersion));
    
    if (diff.error) {
      return res.status(404).json(diff);
    }

    res.json({
      applicationId: application.applicationId,
      applicationName: application.name,
      diff
    });
  } catch (error) {
    console.error('Error generating diff:', error);
    res.status(500).json({ error: 'Failed to generate diff', details: error.message });
  }
});

// Rollback application to a previous version
app.post('/api/applications/:applicationId/rollback/:version', authenticateToken, async (req, res) => {
  try {
    const { applicationId, version } = req.params;
    const { reason = 'Manual rollback via API' } = req.body;

    const application = await Application.findOne({ applicationId, isActive: true });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const rollbackResult = application.rollbackToVersion(parseInt(version), {
      author: req.user?.email || 'api-user',
      reason
    });

    // Add audit log entry
    application.auditLog.push({
      action: 'rollback',
      userId: req.user.id,
      userEmail: req.user.email,
      source: 'api',
      changes: {
        targetVersion: parseInt(version),
        reason
      }
    });

    await application.save();

    res.json({
      message: rollbackResult.message,
      applicationId: application.applicationId,
      rollbackResult
    });
  } catch (error) {
    console.error('Error rolling back application:', error);
    res.status(400).json({ error: 'Failed to rollback application', details: error.message });
  }
});

// =========================
// TELEMETRY ENDPOINTS
// =========================

// Add telemetry data
app.post('/api/applications/:applicationId/telemetry', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { metrics } = req.body;

    const application = await Application.findOne({ applicationId, isActive: true });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Add multiple metrics
    for (const metric of metrics) {
      await application.addTelemetryMetric(
        metric.metricName,
        metric.value,
        metric.unit,
        metric.environment,
        metric.source
      );
    }

    // Update health status based on new metrics
    await application.updateHealthStatus();

    res.json({ message: 'Telemetry data added successfully' });
  } catch (error) {
    console.error('Error adding telemetry:', error);
    res.status(400).json({ error: 'Failed to add telemetry data', details: error.message });
  }
});

// Get telemetry data for application
app.get('/api/applications/:applicationId/telemetry', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { 
      metricName, 
      environment, 
      startTime, 
      endTime, 
      aggregation = 'raw',
      limit = 100 
    } = req.query;

    const application = await Application.findOne({ applicationId, isActive: true });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (aggregation === 'raw') {
      // Return raw telemetry data
      const key = `${environment}_${metricName}`;
      let metrics = application.telemetry.metrics.get(key) || [];
      
      // Filter by time range if provided
      if (startTime || endTime) {
        metrics = metrics.filter(m => {
          const timestamp = new Date(m.timestamp);
          if (startTime && timestamp < new Date(startTime)) return false;
          if (endTime && timestamp > new Date(endTime)) return false;
          return true;
        });
      }
      
      // Limit results
      metrics = metrics.slice(-parseInt(limit));
      
      res.json({ metrics });
    } else {
      // Return aggregated data
      const aggregates = application.getTelemetryAggregates(metricName, environment, aggregation);
      res.json({ aggregates });
    }
  } catch (error) {
    console.error('Error fetching telemetry:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry data', details: error.message });
  }
});

// ==========================
// EXTERNAL API ENDPOINTS (CMDB Integration)
// ==========================

// Get applications for external systems (CMDB, ServiceNow, etc.)
app.get('/external/api/applications', authenticateApiKey, async (req, res) => {
  try {
    const {
      organization,
      department,
      format = 'standard',
      includeInactive = 'false'
    } = req.query;

    const filter = {};
    if (includeInactive === 'false') filter.isActive = true;
    if (organization) filter['ownership.organization'] = organization;
    if (department) filter['ownership.department'] = department;

    // Select fields based on format
    let selectFields = 'applicationId name description applicationTier businessCriticality ownership activeVersions infrastructure.awsAccountId infrastructure.region telemetry.healthStatus externalReferences createdAt updatedAt';
    
    if (format === 'visualization') {
      // Include full infrastructure and versions data for visualization
      selectFields = 'applicationId name description applicationTier businessCriticality ownership activeVersions infrastructure versions telemetry.healthStatus externalReferences createdAt updatedAt';
    }

    let applications;
    if (format === 'visualization') {
      // For visualization, get all fields except sensitive ones
      applications = await Application
        .find(filter)
        .select('-telemetry.metrics -auditLog')
        .lean();
    } else {
      applications = await Application
        .find(filter)
        .select(selectFields)
        .lean();
    }

    // Transform data based on requested format
    let responseData = applications;
    if (format === 'cmdb') {
      responseData = applications.map(app => ({
        ci_name: app.name,
        ci_id: app.applicationId,
        business_service: app.applicationTier,
        criticality: app.businessCriticality,
        owner_group: app.ownership.teamName,
        owner_email: app.ownership.contactEmail,
        department: app.ownership.department,
        organization: app.ownership.organization,
        environment_prod: app.activeVersions?.production || 'none',
        environment_stage: app.activeVersions?.staging || 'none',
        aws_account: app.infrastructure?.awsAccountId,
        aws_region: app.infrastructure?.region,
        health_status: app.telemetry?.healthStatus?.overall || 'unknown',
        external_cmdb_id: app.externalReferences?.cmdbId,
        last_updated: app.updatedAt
      }));
    }

    // Debug logging for visualization format
    if (format === 'visualization') {
      console.log('DEBUG: Returning visualization data');
      console.log('DEBUG: Applications count:', responseData.length);
      if (responseData.length > 0) {
        console.log('DEBUG: First app infrastructure keys:', responseData[0].infrastructure ? Object.keys(responseData[0].infrastructure) : 'none');
        console.log('DEBUG: First app has versions:', !!responseData[0].versions);
        console.log('DEBUG: First app has infrastructure.resources:', !!(responseData[0].infrastructure && responseData[0].infrastructure.resources));
      }
    }

    res.json({
      applications: responseData,
      count: responseData.length,
      format,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in external API:', error);
    res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
  }
});

// Bulk update external references (for CMDB sync)
app.post('/external/api/applications/sync', authenticateApiKey, async (req, res) => {
  try {
    const { updates } = req.body;
    const results = [];

    for (const update of updates) {
      try {
        const application = await Application.findOne({ 
          applicationId: update.applicationId,
          isActive: true 
        });

        if (application) {
          if (update.cmdbId) {
            application.externalReferences.cmdbId = update.cmdbId;
          }
          if (update.servicenowId) {
            application.externalReferences.servicenowId = update.servicenowId;
          }
          if (update.customFields) {
            for (const [key, value] of Object.entries(update.customFields)) {
              application.externalReferences.customFields.set(key, value);
            }
          }

          application.auditLog.push({
            action: 'updated',
            userId: 'external_api',
            userEmail: req.headers['x-api-source'] || 'unknown',
            source: 'external_api',
            changes: { externalReferences: update }
          });

          await application.save();
          results.push({ applicationId: update.applicationId, status: 'updated' });
        } else {
          results.push({ applicationId: update.applicationId, status: 'not_found' });
        }
      } catch (error) {
        results.push({ 
          applicationId: update.applicationId, 
          status: 'error', 
          error: error.message 
        });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Error in bulk sync:', error);
    res.status(500).json({ error: 'Bulk sync failed', details: error.message });
  }
});

// =========================
// ANALYTICS ENDPOINTS
// =========================

// Get organization-wide analytics
app.get('/api/analytics/overview', authenticateToken, async (req, res) => {
  try {
    const { organization } = req.query;
    const filter = { isActive: true };
    if (organization) filter['ownership.organization'] = organization;

    const analytics = await Application.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          byTier: {
            $push: {
              tier: '$applicationTier',
              criticality: '$businessCriticality'
            }
          },
          byOrganization: {
            $push: {
              organization: '$ownership.organization',
              department: '$ownership.department'
            }
          },
          byHealth: {
            $push: '$telemetry.healthStatus.overall'
          },
          avgResponseTime: {
            $avg: {
              $let: {
                vars: {
                  prodMetrics: {
                    $arrayElemAt: [
                      {
                        $objectToArray: {
                          $ifNull: ['$telemetry.metrics', {}]
                        }
                      },
                      0
                    ]
                  }
                },
                in: { $avg: '$$prodMetrics.v.value' }
              }
            }
          }
        }
      }
    ]);

    res.json({ analytics: analytics[0] || {} });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Database API server running on port ${port}`);
  console.log(`MongoDB URI: ${MONGODB_URI}`);
});

module.exports = app;