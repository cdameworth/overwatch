const mongoose = require('mongoose');
require('dotenv').config();

// Import schema
const Application = require('../schemas/application');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/overwatch';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Sample resource data from backend mock functions
function createInsightEngineResources() {
  return {
    resource: {
      aws_sagemaker_endpoint: {
        insight_endpoint: {
          name: "insight-engine-inference-endpoint",
          endpoint_config_name: "insight-engine-endpoint-config"
        }
      },
      aws_api_gateway_rest_api: {
        data_ingestion_api: {
          name: "insight-engine-ingestion-api",
          description: "API for external data ingestion into Insight Engine"
        }
      },
      aws_lambda_function: {
        data_processor: {
          function_name: "insight-engine-data-processor",
          runtime: "python3.9",
          handler: "index.handler",
          environment: {
            variables: {
              SAGEMAKER_ENDPOINT: "insight-engine-inference-endpoint"
            }
          }
        },
        ml_inference_processor: {
          function_name: "insight-engine-ml-inference",
          runtime: "python3.9", 
          handler: "inference.handler",
          environment: {
            variables: {
              SAGEMAKER_ENDPOINT: "insight-engine-inference-endpoint",
              RESULTS_TABLE: "insight-engine-inference-results"
            }
          }
        }
      },
      aws_dynamodb_table: {
        inference_results: {
          name: "insight-engine-inference-results",
          hash_key: "user_id",
          range_key: "timestamp"
        }
      },
      aws_sns_topic: {
        insights_alerts: {
          name: "insight-engine-insights-alerts"
        }
      },
      aws_s3_bucket: {
        data_lake: {
          bucket: "insight-engine-data-lake"
        },
        ml_artifacts: {
          bucket: "insight-engine-ml-artifacts"
        }
      },
      aws_elasticache_replication_group: {
        insights_cache: {
          replication_group_id: "insight-engine-insights-cache",
          description: "Redis cache for frequent insight queries"
        }
      }
    }
  };
}

function createEngagementHubResources() {
  return {
    resource: {
      aws_cloudfront_distribution: {
        main: {
          enabled: true,
          default_root_object: "index.html"
        }
      },
      aws_ecs_service: {
        user_service: {
          name: "engagement-hub-user-service",
          cluster: "engagement-hub-cluster",
          desired_count: 2
        },
        analytics_service: {
          name: "engagement-hub-analytics-service",
          cluster: "engagement-hub-cluster",
          desired_count: 3
        }
      },
      aws_ecs_task_definition: {
        analytics_service: {
          family: "engagement-hub-analytics-service",
          container_definitions: JSON.stringify([{
            name: "analytics-service",
            environment: [
              {
                name: "INSIGHT_ENGINE_API_URL",
                value: "https://insight-engine.example.com/api"
              },
              {
                name: "INSIGHT_ENGINE_API_KEY", 
                value: "secret-api-key"
              }
            ]
          }])
        }
      },
      aws_lambda_function: {
        insight_processor: {
          function_name: "engagement-hub-insight-processor",
          runtime: "nodejs18.x",
          handler: "index.handler",
          environment: {
            variables: {
              OPENSEARCH_ENDPOINT: "https://engagement-hub-analytics.es.amazonaws.com"
            }
          }
        }
      },
      aws_sns_topic_subscription: {
        insight_events_sqs: {
          topic_arn: "arn:aws:sns:us-east-1:123456789012:insight-engine-insights-alerts",
          protocol: "sqs",
          endpoint: "arn:aws:sqs:us-east-1:123456789012:engagement-hub-insight-processing"
        }
      },
      aws_sqs_queue: {
        insight_processing: {
          name: "engagement-hub-insight-processing",
          visibility_timeout_seconds: 300
        }
      },
      aws_rds_cluster: {
        main: {
          cluster_identifier: "engagement-hub-aurora-cluster",
          engine: "aurora-postgresql",
          database_name: "engagement_hub"
        }
      },
      aws_s3_bucket: {
        static_assets: {
          bucket: "engagement-hub-static-assets"
        },
        content_storage: {
          bucket: "engagement-hub-content-storage"
        }
      },
      aws_opensearch_domain: {
        analytics: {
          domain_name: "engagement-hub-analytics"
        }
      }
    }
  };
}

async function addResourceDataToApplications() {
  try {
    console.log('🔧 Adding Terraform resource data to sample applications...\n');

    // Find the two sample applications
    const insightEngine = await Application.findOne({ applicationId: 'insight-engine-demo' });
    const engagementHub = await Application.findOne({ applicationId: 'engagement-hub-demo' });

    if (!insightEngine) {
      console.log('⚠️  Insight Engine application not found');
      return;
    }

    if (!engagementHub) {
      console.log('⚠️  Engagement Hub application not found');
      return;
    }

    // Update Insight Engine with resource data
    const insightResources = createInsightEngineResources();
    
    // Create version with resource data
    const insightVersion = {
      version: '2.1.0',
      deploymentDate: new Date(),
      gitCommit: 'abc123',
      gitBranch: 'main',
      repository: {
        url: 'https://github.com/company/insight-engine',
        provider: 'github'
      },
      terraformConfig: insightResources,
      deployedBy: {
        name: 'CI/CD Pipeline',
        email: 'cicd@company.com'
      },
      isActive: true,
      environment: 'production'
    };

    // Update versions map and infrastructure
    const insightVersionsMap = new Map();
    insightVersionsMap.set('production', [insightVersion]);
    
    insightEngine.versions = insightVersionsMap;
    insightEngine.infrastructure.resources = insightResources;
    insightEngine.infrastructure.dependencies = [
      'aws_lambda_function.data_processor.environment.variables.SAGEMAKER_ENDPOINT',
      'aws_lambda_function.ml_inference_processor.environment.variables.RESULTS_TABLE'
    ];

    await insightEngine.save();
    console.log('✅ Updated Insight Engine with resource data');

    // Update Engagement Hub with resource data
    const hubResources = createEngagementHubResources();
    
    const hubVersion = {
      version: '1.5.2',
      deploymentDate: new Date(),
      gitCommit: 'def456',
      gitBranch: 'main',
      repository: {
        url: 'https://github.com/company/engagement-hub',
        provider: 'github'
      },
      terraformConfig: hubResources,
      deployedBy: {
        name: 'CI/CD Pipeline',
        email: 'cicd@company.com'
      },
      isActive: true,
      environment: 'production'
    };

    const hubVersionsMap = new Map();
    hubVersionsMap.set('production', [hubVersion]);
    
    engagementHub.versions = hubVersionsMap; 
    engagementHub.infrastructure.resources = hubResources;
    engagementHub.infrastructure.dependencies = [
      'aws_ecs_task_definition.analytics_service.container_definitions',
      'aws_sns_topic_subscription.insight_events_sqs.topic_arn'
    ];
    engagementHub.infrastructure.crossApplicationDependencies = [
      {
        targetApplicationId: 'insight-engine-demo',
        dependencyType: 'api',
        description: 'Consumes ML insights from Insight Engine API'
      },
      {
        targetApplicationId: 'insight-engine-demo', 
        dependencyType: 'messaging',
        description: 'Subscribes to insight alerts via SNS/SQS'
      }
    ];

    await engagementHub.save();
    console.log('✅ Updated Engagement Hub with resource data');

    console.log('\n📊 Validation:');
    const updatedInsight = await Application.findOne({ applicationId: 'insight-engine-demo' });
    const updatedHub = await Application.findOne({ applicationId: 'engagement-hub-demo' });
    
    const insightResourceCount = countResources(updatedInsight.infrastructure.resources);
    const hubResourceCount = countResources(updatedHub.infrastructure.resources);
    
    console.log(`   📱 Insight Engine resources: ${insightResourceCount}`);
    console.log(`   📱 Engagement Hub resources: ${hubResourceCount}`);
    console.log(`   🔗 Cross-app dependencies: ${updatedHub.infrastructure.crossApplicationDependencies?.length || 0}`);

    console.log('\n🎉 Resource data added successfully!');
    
  } catch (error) {
    console.error('❌ Failed to add resource data:', error);
    throw error;
  }
}

function countResources(resources) {
  if (!resources || !resources.resource) return 0;
  
  let total = 0;
  for (const [type, resourcesOfType] of Object.entries(resources.resource)) {
    total += Object.keys(resourcesOfType).length;
  }
  return total;
}

async function main() {
  console.log('🚀 Adding Sample Resource Data to Applications\n');
  
  try {
    await connectToDatabase();
    await addResourceDataToApplications();
  } catch (error) {
    console.error('\n💥 Failed to add resource data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from database');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, addResourceDataToApplications };