const express = require('express');
const { parseTerraform, parseMultipleTerraform } = require('./terraform-parser');
const { parseMultipleTerraformFromGitHub } = require('./terraform-github-parser');
const { inferDependencies, inferCrossApplicationDependencies } = require('./dependency-engine');
const GitHubService = require('./github-service');
const AuthService = require('./auth-service');
const EnterpriseRepositoryService = require('./enterprise-repository-service');
const low = require('lowdb');
const path = require('path');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
require('dotenv').config();

// Debug: log before requiring FileSync
console.log('About to require lowdb/adapters/FileSync');
let FileSync;
try {
  FileSync = require('lowdb/adapters/FileSync');
  console.log('FileSync after require:', FileSync);
} catch (e) {
  console.error('Error requiring lowdb/adapters/FileSync:', e);
}

// Debug logging
const dbPath = path.join(__dirname, 'db.json');
console.log('dbPath:', dbPath);
const adapter = new FileSync(dbPath);
const db = low(adapter);
db.defaults({ maps: [], users: [], repositories: [], apps: [], analyses: [] }).write();

// Initialize auth service
const authService = new AuthService(db);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Authentication Routes (only if auth is enabled)
if (authService.authEnabled) {
  app.get('/auth/github', passport.authenticate('github', { scope: ['repo', 'user:email'] }));

  app.get('/auth/github/callback', 
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
      const token = authService.generateJWT(req.user);
      res.redirect(`http://localhost:3000?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: req.user.id,
        username: req.user.profile.username,
        displayName: req.user.profile.displayName,
        avatarUrl: req.user.profile.avatarUrl
      }))}`);
    }
  );

  app.post('/auth/login', async (req, res) => {
    const { githubToken } = req.body;
    
    if (!githubToken) {
      return res.status(400).json({ error: 'GitHub token is required' });
    }

    try {
      const githubUser = await authService.validateGitHubToken(githubToken);
      const user = await authService.findOrCreateUser({
        id: githubUser.id,
        username: githubUser.login,
        displayName: githubUser.name,
        emails: githubUser.email ? [{ value: githubUser.email }] : [],
        photos: githubUser.avatar_url ? [{ value: githubUser.avatar_url }] : []
      }, githubToken);

      const token = authService.generateJWT(user);
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.profile.username,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: 'Invalid GitHub token' });
    }
  });

  app.get('/auth/me', authService.requireAuth.bind(authService), (req, res) => {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.profile.username,
        displayName: req.user.profile.displayName,
        avatarUrl: req.user.profile.avatarUrl
      }
    });
  });

  app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
} else {
  console.log('Authentication disabled - GitHub OAuth credentials not provided');
}

// GitHub Integration Endpoints (Protected)
app.post('/api/github/repositories', authService.requireAuth.bind(authService), async (req, res) => {
  const userId = req.user.id;
  const accessToken = req.user.accessToken;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }
  
  try {
    const githubService = new GitHubService(accessToken);
    const repositories = await githubService.getRepositories(userId);
    
    // Store user and repositories in database
    const user = db.get('users').find({ id: userId }).value();
    if (!user) {
      db.get('users').push({ 
        id: userId, 
        accessToken, 
        repositories: repositories.map(r => r.id),
        createdAt: new Date().toISOString() 
      }).write();
    } else {
      db.get('users').find({ id: userId }).assign({ 
        accessToken, 
        repositories: repositories.map(r => r.id),
        updatedAt: new Date().toISOString() 
      }).write();
    }
    
    // Store repositories
    repositories.forEach(repo => {
      const existingRepo = db.get('repositories').find({ id: repo.id }).value();
      if (!existingRepo) {
        db.get('repositories').push({ ...repo, userId, syncedAt: null }).write();
      } else {
        db.get('repositories').find({ id: repo.id }).assign({ ...repo, userId }).write();
      }
    });
    
    res.json({ repositories });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories', details: error.message });
  }
});

app.post('/api/github/sync', authService.requireAuth.bind(authService), async (req, res) => {
  const { repositoryId, owner, repo, branch = 'main' } = req.body;
  const userId = req.user.id;
  const accessToken = req.user.accessToken;
  
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }
  
  try {
    const githubService = new GitHubService(accessToken);
    const syncResult = await githubService.syncRepository(userId, owner, repo, branch);
    
    if (!syncResult.success) {
      return res.status(400).json({ error: syncResult.message });
    }
    
    // Parse Terraform files from GitHub
    const parsedApps = await parseMultipleTerraformFromGitHub(syncResult);
    
    // Store apps in database
    parsedApps.forEach(app => {
      const existingApp = db.get('apps').find({ id: app.id }).value();
      if (!existingApp) {
        db.get('apps').push({ ...app, userId }).write();
      } else {
        db.get('apps').find({ id: app.id }).assign({ ...app, userId }).write();
      }
    });
    
    // Update repository sync status
    db.get('repositories').find({ id: repositoryId }).assign({ 
      syncedAt: new Date().toISOString(),
      appCount: parsedApps.length 
    }).write();
    
    res.json({ 
      success: true, 
      apps: parsedApps,
      repository: syncResult.repository 
    });
  } catch (error) {
    console.error('Error syncing repository:', error);
    res.status(500).json({ error: 'Failed to sync repository', details: error.message });
  }
});

// Enterprise Repository Analysis Endpoints
app.post('/api/enterprise/analyze', authService.requireAuth.bind(authService), async (req, res) => {
  const userId = req.user.id;
  const accessToken = req.user.accessToken;
  const { repositoryId, environment = 'prod', analysisType = 'full' } = req.body;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }
  
  try {
    const githubService = new GitHubService(accessToken);
    const enterpriseService = new EnterpriseRepositoryService(githubService);
    
    // Get repository details
    const repository = db.get('repositories').find({ id: repositoryId, userId }).value();
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    const [owner, repoName] = repository.fullName.split('/');
    
    console.log(`Starting enterprise analysis for ${owner}/${repoName} (${environment})`);
    
    // Perform enterprise analysis
    const analysis = await enterpriseService.analyzeRepository(
      owner, 
      repoName, 
      repository.defaultBranch || 'main', 
      environment
    );
    
    // Store analysis results
    const analysisRecord = {
      id: `${repositoryId}_${environment}_${Date.now()}`,
      repositoryId,
      userId,
      environment,
      analysisType,
      analysis,
      createdAt: new Date().toISOString()
    };
    
    db.get('analyses').push(analysisRecord).write();
    
    res.json({
      success: true,
      analysis: analysis,
      analysisId: analysisRecord.id,
      summary: enterpriseService.generateSummaryReport(analysis)
    });
  } catch (error) {
    console.error('Enterprise analysis error:', error);
    res.status(500).json({ 
      error: 'Enterprise analysis failed', 
      details: error.message 
    });
  }
});

app.get('/api/enterprise/analysis/:analysisId', authService.requireAuth.bind(authService), async (req, res) => {
  const userId = req.user.id;
  const { analysisId } = req.params;
  
  try {
    const analysis = db.get('analyses').find({ id: analysisId, userId }).value();
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    res.json({ analysis: analysis.analysis });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

app.get('/api/enterprise/repositories/:repositoryId/analyses', authService.requireAuth.bind(authService), async (req, res) => {
  const userId = req.user.id;
  const { repositoryId } = req.params;
  
  try {
    const analyses = db.get('analyses')
      .filter({ repositoryId, userId })
      .orderBy('createdAt', 'desc')
      .take(10)
      .value();
    
    const summaries = analyses.map(a => ({
      id: a.id,
      environment: a.environment,
      analysisType: a.analysisType,
      createdAt: a.createdAt,
      moduleCount: a.analysis?.structure?.modules?.length || 0,
      dependencyCount: a.analysis?.dependencies?.dependencies?.length || 0,
      recommendationCount: a.analysis?.recommendations?.length || 0
    }));
    
    res.json({ analyses: summaries });
  } catch (error) {
    console.error('Error fetching repository analyses:', error);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

app.get('/api/github/apps', authService.requireAuth.bind(authService), async (req, res) => {
  const userId = req.user.id;
  
  try {
    const apps = db.get('apps').filter({ userId }).value();
    
    // Prepare data for visualization
    const mergedResources = { resource: {} };
    const resourceGroupMap = {};
    const appList = [];
    
    apps.forEach(app => {
      if (app.error) return;
      
      appList.push({ id: app.id, name: app.name, repository: app.repository });
      
      for (const [type, resources] of Object.entries(app.resources)) {
        if (!mergedResources.resource[type]) mergedResources.resource[type] = {};
        for (const [name, config] of Object.entries(resources)) {
          mergedResources.resource[type][name] = config;
          resourceGroupMap[`${type}.${name}`] = { 
            appId: app.id, 
            appName: app.name,
            repository: app.repository 
          };
        }
      }
    });
    
    const dependencies = inferDependencies(mergedResources);
    
    res.json({
      resources: mergedResources,
      dependencies,
      groups: resourceGroupMap,
      apps: appList
    });
  } catch (error) {
    console.error('Error fetching user apps:', error);
    res.status(500).json({ error: 'Failed to fetch user apps', details: error.message });
  }
});

// Enhanced parse endpoint that supports both legacy and enterprise analysis
app.get('/api/parse', async (req, res) => {
  const { useEnterprise = false, environment = 'prod' } = req.query;
  
  // Legacy mode - demonstrate cross-application architecture
  if (!useEnterprise) {
    console.log('Legacy mode - demonstrating cross-application dependencies');
    try {
      // Load and parse the two example applications
      const fs = require('fs');
      const path = require('path');
      
      const insightEngineFile = path.join(__dirname, 'data', 'example-ai-platform.tf');
      const engagementHubFile = path.join(__dirname, 'data', 'example-engagement-hub.tf');
      
      let allResources = { resource: {} };
      let allDependencies = [];
      let allGroups = {};
      let applications = [];
      
      // Check if the files exist and try to parse them
      if (fs.existsSync(insightEngineFile) && fs.existsSync(engagementHubFile)) {
        try {
          // For demo purposes, create mock parsed data representing the structure
          const insightEngineApp = {
            name: "insight-engine",
            id: "insight-engine",
            resources: createMockInsightEngineResources()
          };
          
          const engagementHubApp = {
            name: "engagement-hub", 
            id: "engagement-hub",
            resources: createMockEngagementHubResources()
          };
          
          applications = [insightEngineApp, engagementHubApp];
          
          // Merge resources from both applications
          [insightEngineApp, engagementHubApp].forEach(app => {
            for (const [type, resources] of Object.entries(app.resources.resource || {})) {
              if (!allResources.resource[type]) allResources.resource[type] = {};
              for (const [name, config] of Object.entries(resources)) {
                const prefixedName = `${app.name}_${name}`;
                allResources.resource[type][prefixedName] = config;
                allGroups[`${type}.${prefixedName}`] = {
                  appId: app.id,
                  appName: app.name
                };
              }
            }
          });
          
          // Compute intra-application dependencies
          applications.forEach(app => {
            const appDeps = inferDependencies(app.resources);
            appDeps.forEach(dep => {
              allDependencies.push({
                from: `${dep.from.split('.')[0]}.${app.name}_${dep.from.split('.')[1]}`,
                to: `${dep.to.split('.')[0]}.${app.name}_${dep.to.split('.')[1]}`,
                type: dep.type || 'reference'
              });
            });
          });
          
          // Compute cross-application dependencies
          const crossAppDeps = inferCrossApplicationDependencies(applications);
          crossAppDeps.forEach(dep => {
            // Convert cross-app dependency references to match actual node IDs
            const fromParts = dep.from.split('.');
            const toParts = dep.to.split('.');
            
            // For cross-app deps, create simplified representative links
            let fromNode, toNode;
            
            if (fromParts.length >= 3) {
              // Format: app.resource_type.resource_name -> resource_type.app_resource_name
              const appName = fromParts[0];
              const resourceType = fromParts[1];
              const resourceName = fromParts[2];
              fromNode = `${resourceType}.${appName}_${resourceName}`;
            } else {
              fromNode = dep.from;
            }
            
            if (toParts.length >= 3) {
              // Format: app.resource_type.resource_name -> resource_type.app_resource_name  
              const appName = toParts[0];
              const resourceType = toParts[1];
              const resourceName = toParts[2];
              toNode = `${resourceType}.${appName}_${resourceName}`;
            } else {
              // For special cases like "insight-engine.api_gateway", create a representative node
              if (dep.to.includes('api_gateway')) {
                toNode = 'aws_api_gateway_rest_api.insight-engine_data_ingestion_api';
              } else {
                toNode = dep.to;
              }
            }
            
            allDependencies.push({
              from: fromNode,
              to: toNode,
              type: dep.type,
              metadata: dep.metadata,
              crossApplication: true
            });
          });
          
          console.log(`Cross-application analysis: Found ${crossAppDeps.length} cross-app dependencies`);
          
        } catch (parseError) {
          console.log('Could not parse Terraform files, using simplified mock data');
          // Fall back to simple mock data
          ({ allResources, allDependencies, allGroups, applications } = createSimpleMockData());
        }
      } else {
        console.log('Terraform files not found, using simplified mock data');
        ({ allResources, allDependencies, allGroups, applications } = createSimpleMockData());
      }

      res.json({
        resources: allResources,
        dependencies: allDependencies,
        groups: allGroups,
        apps: applications,
        crossApplicationAnalysis: true
      });
    } catch (err) {
      console.error('Error in /api/parse:', err);
      res.status(500).json({ error: 'Failed to parse Terraform files', details: err.message });
    }
  } else {
    // Enterprise mode - analyze local repository structure for demo
    try {
      const enterpriseService = new EnterpriseRepositoryService();
      const repoPath = path.join(__dirname, '..'); // Use current project as demo
      
      console.log(`Enterprise analysis mode - analyzing local repository at ${repoPath}`);
      const analysis = await enterpriseService.analyzeLocalRepository(repoPath, environment);
      
      // Convert enterprise analysis to legacy format for compatibility
      const legacyFormat = convertAnalysisToLegacyFormat(analysis);
      
      res.json({
        ...legacyFormat,
        isEnterprise: true,
        analysis: analysis,
        summary: enterpriseService.generateSummaryReport(analysis)
      });
    } catch (err) {
      console.error('Error in enterprise analysis:', err);
      res.status(500).json({ error: 'Enterprise analysis failed', details: err.message });
    }
  }
});

// Helper function to convert enterprise analysis to legacy format
function convertAnalysisToLegacyFormat(analysis) {
  const resources = { resource: {} };
  const groups = {};
  const apps = [];
  const dependencies = [];

  if (analysis.visualization) {
    // Convert nodes to resources
    for (const node of analysis.visualization.nodes) {
      if (node.category === 'managed_resource') {
        const [, resourceType, resourceName] = node.id.split('.');
        if (!resources.resource[resourceType]) {
          resources.resource[resourceType] = {};
        }
        resources.resource[resourceType][resourceName] = node.config || {};
        groups[`${resourceType}.${resourceName}`] = {
          appId: node.group,
          appName: node.group,
          repository: { repo: 'local-analysis' }
        };
      }
    }

    // Convert modules to apps
    for (const module of analysis.visualization.modules) {
      apps.push({
        id: module.id,
        name: module.name,
        type: module.moduleType
      });
    }

    // Convert links to dependencies
    for (const link of analysis.visualization.links) {
      dependencies.push({
        from: link.source.replace('module_', ''),
        to: link.target.replace('module_', ''),
        type: link.type
      });
    }
  }

  return { resources, dependencies, groups, apps };
}

// Helper functions for cross-application mock data
function createMockInsightEngineResources() {
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

function createMockEngagementHubResources() {
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

function createSimpleMockData() {
  const allResources = {
    resource: {
      aws_sagemaker_endpoint: {
        "insight-engine_insight_endpoint": {
          name: "insight-engine-inference-endpoint"
        }
      },
      aws_lambda_function: {
        "insight-engine_data_processor": {
          function_name: "insight-engine-data-processor",
          runtime: "python3.9"
        },
        "engagement-hub_insight_processor": {
          function_name: "engagement-hub-insight-processor", 
          runtime: "nodejs18.x"
        }
      },
      aws_ecs_service: {
        "engagement-hub_analytics_service": {
          name: "engagement-hub-analytics-service"
        }
      },
      aws_sns_topic: {
        "insight-engine_insights_alerts": {
          name: "insight-engine-insights-alerts"
        }
      },
      aws_sqs_queue: {
        "engagement-hub_insight_processing": {
          name: "engagement-hub-insight-processing"
        }
      }
    }
  };

  const allDependencies = [
    // Intra-app dependencies
    { from: "aws_lambda_function.insight-engine_data_processor", to: "aws_sagemaker_endpoint.insight-engine_insight_endpoint", type: "reference" },
    
    // Cross-app dependencies
    { from: "engagement-hub.aws_ecs_service.analytics_service", to: "insight-engine.api_gateway", type: "api_integration", crossApplication: true,
      metadata: { protocol: "HTTPS", integration_type: "REST_API" }},
    { from: "insight-engine.aws_sns_topic.insights_alerts", to: "engagement-hub.aws_sqs_queue.insight_processing", type: "messaging_integration", crossApplication: true,
      metadata: { protocol: "SNS", integration_type: "PUB_SUB" }}
  ];

  const allGroups = {
    "aws_sagemaker_endpoint.insight-engine_insight_endpoint": { appId: "insight-engine", appName: "Insight Engine" },
    "aws_lambda_function.insight-engine_data_processor": { appId: "insight-engine", appName: "Insight Engine" },
    "aws_sns_topic.insight-engine_insights_alerts": { appId: "insight-engine", appName: "Insight Engine" },
    "aws_lambda_function.engagement-hub_insight_processor": { appId: "engagement-hub", appName: "Engagement Hub" },
    "aws_ecs_service.engagement-hub_analytics_service": { appId: "engagement-hub", appName: "Engagement Hub" },
    "aws_sqs_queue.engagement-hub_insight_processing": { appId: "engagement-hub", appName: "Engagement Hub" }
  };

  const applications = [
    { id: "insight-engine", name: "Insight Engine", type: "ai-data-platform" },
    { id: "engagement-hub", name: "Engagement Hub", type: "3-tier-consumer-app" }
  ];

  return { allResources, allDependencies, allGroups, applications };
}

const port = process.env.PORT || 4001;
app.listen(port, () => console.log(`Backend running at http://localhost:${port}`));
