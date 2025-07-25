const axios = require('axios');

class DatabaseClient {
  constructor(baseURL = process.env.DATABASE_API_URL || 'http://localhost:5001') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('Database API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.response?.data?.error || error.message
        });
        return Promise.reject(error);
      }
    );
  }

  // Set authentication token for requests
  setAuthToken(token) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Set API key for external access
  setApiKey(apiKey) {
    this.client.defaults.headers.common['x-api-key'] = apiKey;
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Database API health check failed: ${error.message}`);
    }
  }

  // ======================
  // APPLICATION METHODS
  // ======================

  async getApplications(options = {}) {
    try {
      // Use external API directly since it works reliably with API keys
      const response = await this.client.get('/external/api/applications', { params: options });
      return { applications: response.data.applications };
    } catch (error) {
      throw new Error(`Failed to fetch applications: ${error.response?.data?.error || error.message}`);
    }
  }

  async getApplication(applicationId, includeTelemetry = false) {
    try {
      // Use external API and find the specific application
      const response = await this.client.get('/external/api/applications');
      const application = response.data.applications.find(app => app.applicationId === applicationId);
      return application || null;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch application: ${error.response?.data?.error || error.message}`);
    }
  }

  async createApplication(applicationData) {
    try {
      const response = await this.client.post('/api/applications', applicationData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create application: ${error.response?.data?.error || error.message}`);
    }
  }

  async updateApplication(applicationId, updateData) {
    try {
      const response = await this.client.put(`/api/applications/${applicationId}`, updateData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update application: ${error.response?.data?.error || error.message}`);
    }
  }

  // ======================
  // CONFIGURATION HISTORY METHODS
  // ======================

  async getConfigurationHistory(applicationId, options = {}) {
    try {
      const { limit = 5, offset = 0 } = options;
      const response = await this.client.get(`/api/applications/${applicationId}/history`, {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get configuration history: ${error.response?.data?.error || error.message}`);
    }
  }

  async getConfigurationVersion(applicationId, version) {
    try {
      const response = await this.client.get(`/api/applications/${applicationId}/history/${version}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get configuration version: ${error.response?.data?.error || error.message}`);
    }
  }

  async getConfigurationDiff(applicationId, fromVersion, toVersion) {
    try {
      const response = await this.client.get(`/api/applications/${applicationId}/diff/${fromVersion}/${toVersion}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get configuration diff: ${error.response?.data?.error || error.message}`);
    }
  }

  async rollbackApplication(applicationId, version, options = {}) {
    try {
      const response = await this.client.post(`/api/applications/${applicationId}/rollback/${version}`, {
        reason: options.reason || 'Rollback via API'
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to rollback application: ${error.response?.data?.error || error.message}`);
    }
  }

  // ======================
  // TELEMETRY METHODS
  // ======================

  async addTelemetryData(applicationId, metrics) {
    try {
      const response = await this.client.post(`/api/applications/${applicationId}/telemetry`, {
        metrics: Array.isArray(metrics) ? metrics : [metrics]
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to add telemetry data: ${error.response?.data?.error || error.message}`);
    }
  }

  async getTelemetryData(applicationId, options = {}) {
    try {
      const response = await this.client.get(`/api/applications/${applicationId}/telemetry`, {
        params: options
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch telemetry data: ${error.response?.data?.error || error.message}`);
    }
  }

  // ======================
  // LEGACY COMPATIBILITY METHODS
  // ======================

  // Convert applications to legacy format for existing visualization
  async getApplicationsForVisualization() {
    try {
      const response = await this.getApplications({
        limit: 100,
        sortBy: 'updatedAt',
        sortOrder: -1,
        format: 'visualization'
      });

      const applications = response.applications || [];
      
      // Convert to legacy format expected by visualization
      const mergedResources = { resource: {} };
      const resourceGroupMap = {};
      const appList = [];
      
      applications.forEach(app => {
        appList.push({
          id: app.applicationId,
          name: app.name,
          repository: {
            repo: app.infrastructure?.repository || app.name,
            url: app.versions?.get?.('production')?.[0]?.repository?.url || ''
          }
        });
        
        // Extract resources from latest production version
        const prodVersions = app.versions?.production || [];
        const latestVersion = prodVersions[prodVersions.length - 1];
        const resources = latestVersion?.terraformConfig?.resource || app.infrastructure?.resources?.resource || {};
        
        for (const [type, resourcesOfType] of Object.entries(resources)) {
          if (!mergedResources.resource[type]) {
            mergedResources.resource[type] = {};
          }
          
          for (const [name, config] of Object.entries(resourcesOfType)) {
            const prefixedName = `${app.applicationId}_${name}`;
            mergedResources.resource[type][prefixedName] = config;
            resourceGroupMap[`${type}.${prefixedName}`] = {
              appId: app.applicationId,
              appName: app.name,
              repository: {
                repo: app.infrastructure?.repository || app.name
              }
            };
          }
        }
      });

      // Convert dependencies
      const dependencies = [];
      applications.forEach(app => {
        // Intra-app dependencies from infrastructure
        const appDependencies = app.infrastructure?.dependencies || [];
        appDependencies.forEach(dep => {
          if (typeof dep === 'string' && dep.includes('.')) {
            dependencies.push({
              from: `${dep.split('.')[0]}.${app.applicationId}_${dep.split('.')[1]}`,
              to: `${dep.split('.')[0]}.${app.applicationId}_${dep.split('.')[1]}`,
              type: 'reference'
            });
          }
        });
        
        // Cross-app dependencies
        const crossAppDeps = app.infrastructure?.crossApplicationDependencies || [];
        crossAppDeps.forEach(dep => {
          dependencies.push({
            from: `${app.applicationId}.${dep.dependencyType}`,
            to: `${dep.targetApplicationId}.api`,
            type: dep.dependencyType,
            crossApplication: true,
            metadata: { description: dep.description }
          });
        });
      });

      return {
        resources: mergedResources,
        dependencies,
        groups: resourceGroupMap,
        apps: appList,
        crossApplicationAnalysis: true
      };

    } catch (error) {
      console.error('Error converting applications for visualization:', error);
      
      // Fallback to empty structure if database is unavailable
      return {
        resources: { resource: {} },
        dependencies: [],
        groups: {},
        apps: [],
        crossApplicationAnalysis: false,
        error: error.message
      };
    }
  }

  // Migrate existing JSON data to new database
  async migrateFromJSON(jsonData) {
    try {
      const apps = jsonData.apps || [];
      const results = [];
      
      for (const legacyApp of apps) {
        try {
          // Convert legacy app format to new schema
          const applicationData = {
            applicationId: this.generateApplicationId(legacyApp.name, legacyApp.repository),
            name: legacyApp.name,
            description: legacyApp.description || 'Migrated from JSON database',
            applicationTier: this.determineApplicationTier(legacyApp.resources),
            businessCriticality: legacyApp.criticality || 'medium',
            
            ownership: {
              teamName: legacyApp.team || 'Unknown Team',
              contactEmail: legacyApp.contactEmail || 'team@company.com',
              department: legacyApp.department || 'Engineering',
              organization: legacyApp.organization || 'Company'
            },
            
            versions: {
              production: [{
                version: legacyApp.version || '1.0.0',
                deploymentDate: new Date(legacyApp.lastDeployment || Date.now()),
                terraformConfig: { resource: legacyApp.resources || {} },
                environment: 'production'
              }]
            },
            
            activeVersions: {
              production: legacyApp.version || '1.0.0'
            },
            
            infrastructure: {
              resources: { resource: legacyApp.resources || {} },
              dependencies: legacyApp.dependencies || []
            }
          };
          
          const result = await this.createApplication(applicationData);
          results.push({ success: true, applicationId: applicationData.applicationId, ...result });
          
        } catch (error) {
          results.push({ 
            success: false, 
            applicationName: legacyApp.name, 
            error: error.message 
          });
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  // Helper methods
  generateApplicationId(name, repository) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const repoName = repository?.repo || repository?.name || 'unknown';
    const cleanRepo = repoName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${cleanName}-${cleanRepo}`;
  }

  determineApplicationTier(resources) {
    if (!resources) return 'backend';
    
    if (resources.aws_lambda_function) return 'backend';
    if (resources.aws_cloudfront_distribution || resources.aws_s3_bucket) return 'frontend';
    if (resources.aws_rds_cluster || resources.aws_dynamodb_table) return 'database';
    if (resources.aws_sagemaker_endpoint) return 'ai-ml';
    
    return 'backend';
  }

  // ======================
  // ANALYTICS METHODS
  // ======================

  async getAnalytics(organization = null) {
    try {
      const params = organization ? { organization } : {};
      const response = await this.client.get('/api/analytics/overview', { params });
      return response.data.analytics;
    } catch (error) {
      throw new Error(`Failed to fetch analytics: ${error.response?.data?.error || error.message}`);
    }
  }
}

module.exports = DatabaseClient;