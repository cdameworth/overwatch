const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import schema (try different paths for local vs container environment)
let Application;
try {
  // Try container path first
  Application = require('../src/database/schemas/application');
} catch (err) {
  try {
    // Fallback to local development path
    Application = require('../../../apps/database-api/src/database/schemas/application');
  } catch (err2) {
    console.error('Could not find Application schema:', err2.message);
    process.exit(1);
  }
}

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/overwatch';
const JSON_DB_PATH = path.join(__dirname, '../../backend/db.json');

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

async function loadExistingData() {
  try {
    if (!fs.existsSync(JSON_DB_PATH)) {
      console.log('⚠️  No existing JSON database found, starting with empty data');
      return { maps: [], users: [], repositories: [], apps: [], analyses: [] };
    }

    const data = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
    console.log(`📂 Loaded existing data: ${data.apps?.length || 0} apps, ${data.users?.length || 0} users`);
    return data;
  } catch (error) {
    console.error('❌ Failed to load existing JSON data:', error);
    return { maps: [], users: [], repositories: [], apps: [], analyses: [] };
  }
}

function generateApplicationId(name, repository) {
  // Create a consistent application ID from name and repository
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const repoName = repository?.repo || repository?.name || 'unknown';
  const cleanRepo = repoName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${cleanName}-${cleanRepo}`;
}

function mapLegacyAppToNewSchema(legacyApp, index) {
  // Extract team information from legacy data (or set defaults)
  const ownership = {
    teamName: legacyApp.team || 'Unknown Team',
    contactEmail: legacyApp.contactEmail || 'team@company.com',
    department: legacyApp.department || 'Engineering',
    organization: legacyApp.organization || 'Company',
    manager: {
      name: legacyApp.managerName || 'Unknown Manager',
      email: legacyApp.managerEmail || 'manager@company.com'
    }
  };

  // Map legacy resources to new format
  const resources = legacyApp.resources || {};
  
  // Determine application tier based on resources
  let applicationTier = 'backend'; // default
  if (resources.aws_lambda_function) applicationTier = 'backend';
  else if (resources.aws_cloudfront_distribution || resources.aws_s3_bucket) applicationTier = 'frontend';
  else if (resources.aws_rds_cluster || resources.aws_dynamodb_table) applicationTier = 'database';
  else if (resources.aws_sagemaker_endpoint) applicationTier = 'ai-ml';

  // Create version information
  const currentVersion = {
    version: legacyApp.version || '1.0.0',
    deploymentDate: new Date(legacyApp.lastDeployment || Date.now()),
    gitCommit: legacyApp.gitCommit || 'unknown',
    gitBranch: legacyApp.gitBranch || 'main',
    repository: {
      url: legacyApp.repository?.clone_url || legacyApp.repository?.url || '',
      provider: 'github'
    },
    terraformConfig: resources,
    deployedBy: {
      name: legacyApp.deployedBy || 'System',
      email: legacyApp.deployedByEmail || 'system@company.com'
    },
    isActive: true,
    environment: 'production'
  };

  // Map versions per environment
  const versions = new Map();
  versions.set('production', [currentVersion]);
  if (legacyApp.stagingVersion) {
    versions.set('staging', [{
      ...currentVersion,
      version: legacyApp.stagingVersion,
      environment: 'staging'
    }]);
  }

  return {
    applicationId: generateApplicationId(legacyApp.name, legacyApp.repository),
    name: legacyApp.name,
    description: legacyApp.description || `Legacy application migrated from JSON database`,
    applicationTier,
    businessCriticality: legacyApp.criticality || 'medium',
    
    ownership,
    
    versions,
    activeVersions: {
      production: currentVersion.version,
      staging: legacyApp.stagingVersion || currentVersion.version,
      development: legacyApp.devVersion || currentVersion.version
    },
    
    infrastructure: {
      awsAccountId: legacyApp.awsAccountId || 'unknown',
      region: legacyApp.region || 'us-east-1',
      resources: resources,
      dependencies: legacyApp.dependencies || [],
      crossApplicationDependencies: legacyApp.crossAppDependencies || []
    },
    
    telemetry: {
      metrics: new Map(),
      aggregates: new Map(),
      healthStatus: {
        overall: 'unknown',
        environments: {
          development: 'unknown',
          staging: 'unknown',
          production: 'unknown'
        }
      },
      monitoring: {
        datadogDashboard: legacyApp.datadogDashboard || '',
        cloudwatchNamespace: legacyApp.cloudwatchNamespace || '',
        prometheusLabels: legacyApp.prometheusLabels || {},
        alertingRules: legacyApp.alertingRules || []
      }
    },
    
    externalReferences: {
      cmdbId: legacyApp.cmdbId || '',
      servicenowId: legacyApp.servicenowId || '',
      jiraProject: legacyApp.jiraProject || '',
      confluenceSpace: legacyApp.confluenceSpace || '',
      customFields: new Map()
    },
    
    auditLog: [{
      action: 'created',
      timestamp: new Date(),
      userId: 'migration_script',
      userEmail: 'migration@system.com',
      changes: { migrated: true, originalData: legacyApp },
      source: 'migration'
    }],
    
    createdAt: new Date(legacyApp.createdAt || Date.now()),
    updatedAt: new Date(),
    lastSyncAt: new Date(legacyApp.lastSync || Date.now()),
    isActive: legacyApp.isActive !== false
  };
}

async function migrateApplications(legacyData) {
  const apps = legacyData.apps || [];
  console.log(`🔄 Starting migration of ${apps.length} applications...`);
  
  let migrated = 0;
  let errors = 0;
  
  for (let i = 0; i < apps.length; i++) {
    const legacyApp = apps[i];
    
    try {
      // Check if application already exists
      const applicationId = generateApplicationId(legacyApp.name, legacyApp.repository);
      const existingApp = await Application.findOne({ applicationId });
      
      if (existingApp) {
        console.log(`⏭️  Skipping ${legacyApp.name} (already exists)`);
        continue;
      }
      
      // Map legacy app to new schema
      const newApp = mapLegacyAppToNewSchema(legacyApp, i);
      
      // Create new application
      const application = new Application(newApp);
      await application.save();
      
      migrated++;
      console.log(`✅ Migrated: ${legacyApp.name} -> ${applicationId}`);
      
    } catch (error) {
      errors++;
      console.error(`❌ Failed to migrate ${legacyApp.name}:`, error.message);
    }
  }
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successfully migrated: ${migrated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📱 Total applications in database: ${await Application.countDocuments()}`);
}

async function addSampleTelemetryData() {
  console.log('\n🔧 Adding sample telemetry data...');
  
  const applications = await Application.find({ isActive: true }).limit(5);
  
  for (const app of applications) {
    // Ensure the app has the required id field (map from applicationId if needed)
    if (!app.id && app.applicationId) {
      app.id = app.applicationId;
    }
    
    // Add sample metrics for each environment
    const environments = ['production', 'staging', 'development'];
    
    for (const env of environments) {
      // CPU Utilization
      app.addTelemetryMetric({
        metricName: 'cpu_utilization',
        value: Math.random() * 80 + 10,
        unit: 'percent',
        resourceId: `${app.applicationId}-${env}`,
        resourceType: 'application',
        tags: { environment: env, source: 'cloudwatch' }
      });
      
      // Memory Utilization
      app.addTelemetryMetric({
        metricName: 'memory_utilization',
        value: Math.random() * 70 + 15,
        unit: 'percent',
        resourceId: `${app.applicationId}-${env}`,
        resourceType: 'application',
        tags: { environment: env, source: 'cloudwatch' }
      });
      
      // Response Time
      app.addTelemetryMetric({
        metricName: 'response_time',
        value: Math.random() * 1000 + 100,
        unit: 'milliseconds',
        resourceId: `${app.applicationId}-${env}`,
        resourceType: 'application',
        tags: { environment: env, source: 'datadog' }
      });
      
      // Error Rate
      app.addTelemetryMetric({
        metricName: 'error_rate',
        value: Math.random() * 5,
        unit: 'percent',
        resourceId: `${app.applicationId}-${env}`,
        resourceType: 'application',
        tags: { environment: env, source: 'datadog' }
      });
      
      // Request Count
      app.addTelemetryMetric({
        metricName: 'request_count',
        value: Math.floor(Math.random() * 10000) + 1000,
        unit: 'count',
        resourceId: `${app.applicationId}-${env}`,
        resourceType: 'application',
        tags: { environment: env, source: 'cloudwatch' }
      });
    }
    
    // Health status is automatically updated by the schema's pre-save hook
    await app.save();
    
    console.log(`📈 Added telemetry data for: ${app.name}`);
  }
}

async function validateMigration() {
  console.log('\n🔍 Validating migration...');
  
  try {
    const totalApps = await Application.countDocuments();
    const activeApps = await Application.countDocuments({ isActive: true });
    const appsWithTelemetry = await Application.countDocuments({ 
      'telemetry.metrics': { $exists: true, $ne: {} }
    });
    
    console.log(`✅ Validation Results:`);
    console.log(`   📱 Total applications: ${totalApps}`);
    console.log(`   🟢 Active applications: ${activeApps}`);
    console.log(`   📊 Applications with telemetry: ${appsWithTelemetry}`);
    
    // Test a complex query
    const complexQuery = await Application.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$ownership.organization',
          count: { $sum: 1 },
          avgApps: { $avg: 1 }
        }
      }
    ]);
    
    console.log(`   🏢 Applications by organization:`, complexQuery);
    
    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

async function createIndexes() {
  console.log('\n📇 Creating database indexes...');
  
  try {
    await Application.createIndexes();
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Failed to create indexes:', error);
  }
}

async function main() {
  console.log('🚀 Starting Overwatch Database Migration\n');
  
  try {
    // Connect to database
    await connectToDatabase();
    
    // Load existing JSON data
    const legacyData = await loadExistingData();
    
    // Migrate applications
    await migrateApplications(legacyData);
    
    // Add sample telemetry data
    await addSampleTelemetryData();
    
    // Create indexes
    await createIndexes();
    
    // Validate migration
    const isValid = await validateMigration();
    
    if (isValid) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('💡 Tip: You can now start using the new API endpoints');
      
      // Create backup of original JSON file
      if (fs.existsSync(JSON_DB_PATH)) {
        const backupPath = JSON_DB_PATH + '.backup.' + Date.now();
        fs.copyFileSync(JSON_DB_PATH, backupPath);
        console.log(`📁 Original JSON database backed up to: ${backupPath}`);
      }
    } else {
      console.log('\n⚠️  Migration completed with validation errors');
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from database');
  }
}

// Run migration if called directly
if (require.main === module) {
  main();
}

module.exports = { main, migrateApplications, validateMigration };