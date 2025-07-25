// MongoDB initialization script
// This runs when the MongoDB container starts for the first time

db = db.getSiblingDB('overwatch');

// Create the main application collection with validation
db.createCollection('applications', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['applicationId', 'name', 'ownership'],
      properties: {
        applicationId: {
          bsonType: 'string',
          description: 'Unique application identifier is required'
        },
        name: {
          bsonType: 'string',
          description: 'Application name is required'
        },
        ownership: {
          bsonType: 'object',
          required: ['teamName', 'contactEmail', 'department', 'organization'],
          properties: {
            teamName: { bsonType: 'string' },
            contactEmail: { 
              bsonType: 'string',
              pattern: '^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$'
            },
            department: { bsonType: 'string' },
            organization: { bsonType: 'string' }
          }
        }
      }
    }
  }
});

// Create indexes for performance
db.applications.createIndex({ 'applicationId': 1 }, { unique: true });
db.applications.createIndex({ 'name': 1 });
db.applications.createIndex({ 'ownership.organization': 1 });
db.applications.createIndex({ 'ownership.department': 1 });
db.applications.createIndex({ 'applicationTier': 1 });
db.applications.createIndex({ 'businessCriticality': 1 });
db.applications.createIndex({ 'telemetry.healthStatus.overall': 1 });
db.applications.createIndex({ 'infrastructure.awsAccountId': 1 });
db.applications.createIndex({ 'createdAt': -1 });
db.applications.createIndex({ 'updatedAt': -1 });

// Compound indexes for common queries
db.applications.createIndex({ 
  'ownership.organization': 1, 
  'ownership.department': 1 
});
db.applications.createIndex({ 
  'applicationTier': 1, 
  'businessCriticality': 1 
});

// Create sample data for demonstration
db.applications.insertMany([
  {
    id: 'insight-engine-demo',
    applicationId: 'insight-engine-demo',
    name: 'Insight Engine',
    description: 'AI-powered data processing and machine learning inference platform',
    applicationTier: 'ai-ml',
    businessCriticality: 'high',
    ownership: {
      teamName: 'Data Science Platform',
      contactEmail: 'data-platform@company.com',
      department: 'Engineering',
      organization: 'Technology',
      manager: {
        name: 'Sarah Chen',
        email: 'sarah.chen@company.com'
      }
    },
    versions: {
      production: [{
        version: '2.1.0',
        deploymentDate: new Date('2024-01-15'),
        gitCommit: 'abc123def456',
        gitBranch: 'main',
        repository: {
          url: 'https://github.com/company/insight-engine',
          provider: 'github'
        },
        terraformConfig: {
          resource: {
            aws_sagemaker_endpoint: {
              insight_endpoint: {
                name: 'insight-engine-inference-endpoint',
                endpoint_config_name: 'insight-engine-endpoint-config'
              }
            },
            aws_lambda_function: {
              data_processor: {
                function_name: 'insight-engine-data-processor',
                runtime: 'python3.9'
              }
            }
          }
        },
        environment: 'production',
        isActive: true
      }]
    },
    activeVersions: {
      production: '2.1.0',
      staging: '2.2.0-beta',
      development: '2.3.0-dev'
    },
    infrastructure: {
      awsAccountId: '123456789012',
      region: 'us-east-1',
      resources: {},
      dependencies: []
    },
    telemetry: {
      healthStatus: {
        overall: 'healthy',
        environments: {
          production: 'healthy',
          staging: 'healthy',
          development: 'warning'
        }
      },
      monitoring: {
        datadogDashboard: 'https://app.datadoghq.com/dashboard/abc-123',
        cloudwatchNamespace: 'InsightEngine/Production'
      }
    },
    externalReferences: {
      cmdbId: 'CMDB-12345',
      jiraProject: 'IE',
      confluenceSpace: 'INSIGHT'
    },
    auditLog: [{
      action: 'created',
      timestamp: new Date(),
      userId: 'system',
      userEmail: 'system@company.com',
      source: 'initialization'
    }],
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date(),
    isActive: true
  },
  {
    id: 'engagement-hub-demo',
    applicationId: 'engagement-hub-demo',
    name: 'Engagement Hub',
    description: 'Customer engagement and analytics platform with real-time insights',
    applicationTier: 'frontend',
    businessCriticality: 'critical',
    ownership: {
      teamName: 'Customer Experience',
      contactEmail: 'customer-exp@company.com',
      department: 'Product',
      organization: 'Technology',
      manager: {
        name: 'Mike Johnson',
        email: 'mike.johnson@company.com'
      }
    },
    versions: {
      production: [{
        version: '1.5.2',
        deploymentDate: new Date('2024-01-20'),
        gitCommit: 'def456ghi789',
        gitBranch: 'release/1.5.2',
        repository: {
          url: 'https://github.com/company/engagement-hub',
          provider: 'github'
        },
        terraformConfig: {
          resource: {
            aws_cloudfront_distribution: {
              main: {
                enabled: true,
                default_root_object: 'index.html'
              }
            },
            aws_ecs_service: {
              user_service: {
                name: 'engagement-hub-user-service',
                cluster: 'engagement-hub-cluster'
              }
            }
          }
        },
        environment: 'production',
        isActive: true
      }]
    },
    activeVersions: {
      production: '1.5.2',
      staging: '1.6.0-rc1',
      development: '1.6.0-dev'
    },
    infrastructure: {
      awsAccountId: '123456789012',
      region: 'us-east-1',
      resources: {},
      crossApplicationDependencies: [{
        targetApplicationId: 'insight-engine-demo',
        dependencyType: 'api',
        description: 'Consumes ML insights for personalization'
      }]
    },
    telemetry: {
      healthStatus: {
        overall: 'healthy',
        environments: {
          production: 'healthy',
          staging: 'healthy',
          development: 'healthy'
        }
      },
      monitoring: {
        datadogDashboard: 'https://app.datadoghq.com/dashboard/def-456',
        cloudwatchNamespace: 'EngagementHub/Production'
      }
    },
    externalReferences: {
      cmdbId: 'CMDB-67890',
      jiraProject: 'EH',
      confluenceSpace: 'ENGAGE'
    },
    auditLog: [{
      action: 'created',
      timestamp: new Date(),
      userId: 'system',
      userEmail: 'system@company.com',
      source: 'initialization'
    }],
    createdAt: new Date('2023-08-15'),
    updatedAt: new Date(),
    isActive: true
  }
]);

print('✅ Overwatch database initialized successfully');
print('📊 Sample applications created');
print('📇 Indexes created for optimal performance');