function inferDependencies(parsedResources, applicationContext = null) {
  const deps = [];
  
  // Iterate over all resources
  for (const [type, resources] of Object.entries(parsedResources.resource || {})) {
    for (const [name, configs] of Object.entries(resources)) {
      // configs may be an array (from hcl2json)
      const configArray = Array.isArray(configs) ? configs : [configs];
      configArray.forEach((config, idx) => {
        const fromId = `${type}.${name}`;
        
        // Check for explicit depends_on
        if (config.depends_on) {
          (Array.isArray(config.depends_on) ? config.depends_on : [config.depends_on]).forEach(dep => {
            deps.push({ from: fromId, to: dep, type: 'explicit' });
          });
        }
        
        // Check for implicit references in all string attributes
        for (const [attr, value] of Object.entries(config)) {
          if (typeof value === 'string') {
            const matches = value.match(/aws_[a-z_]+\.[a-zA-Z0-9_]+/g);
            if (matches) {
              matches.forEach(ref => {
                deps.push({ from: fromId, to: ref, type: 'reference' });
              });
            }
          }
          
          // Also check inside arrays of strings
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (typeof v === 'string') {
                const matches = v.match(/aws_[a-z_]+\.[a-zA-Z0-9_]+/g);
                if (matches) {
                  matches.forEach(ref => {
                    deps.push({ from: fromId, to: ref, type: 'reference' });
                  });
                }
              }
            });
          }
        }
      });
    }
  }
  
  return deps;
}

function inferCrossApplicationDependencies(applications) {
  const crossAppDeps = [];
  
  if (!applications || applications.length < 2) {
    return crossAppDeps;
  }
  
  // Find cross-application dependencies
  for (let i = 0; i < applications.length; i++) {
    for (let j = 0; j < applications.length; j++) {
      if (i === j) continue;
      
      const sourceApp = applications[i];
      const targetApp = applications[j];
      
      // Detect API integrations
      const apiDeps = detectApiIntegrations(sourceApp, targetApp);
      crossAppDeps.push(...apiDeps);
      
      // Detect messaging integrations (SNS/SQS)
      const messagingDeps = detectMessagingIntegrations(sourceApp, targetApp);
      crossAppDeps.push(...messagingDeps);
      
      // Detect data sharing patterns
      const dataDeps = detectDataSharingPatterns(sourceApp, targetApp);
      crossAppDeps.push(...dataDeps);
    }
  }
  
  return crossAppDeps;
}

function detectApiIntegrations(sourceApp, targetApp) {
  const apiDeps = [];
  
  if (!sourceApp.resources || !targetApp.resources) return apiDeps;
  
  // Look for environment variables that reference other app's APIs
  for (const [type, resources] of Object.entries(sourceApp.resources.resource || {})) {
    for (const [name, configs] of Object.entries(resources)) {
      const configArray = Array.isArray(configs) ? configs : [configs];
      
      configArray.forEach(config => {
        // Check environment variables in ECS task definitions
        if (type === 'aws_ecs_task_definition' && config.container_definitions) {
          try {
            const containerDefs = typeof config.container_definitions === 'string' 
              ? JSON.parse(config.container_definitions) 
              : config.container_definitions;
            
            if (Array.isArray(containerDefs)) {
              containerDefs.forEach(container => {
                if (container.environment) {
                  container.environment.forEach(envVar => {
                    // Look for API URLs pointing to other applications
                    if (envVar.name && envVar.name.includes('API_URL') && envVar.value) {
                      if (isTargetAppReference(envVar.value, targetApp)) {
                        apiDeps.push({
                          from: `${sourceApp.name}.${type}.${name}`,
                          to: `${targetApp.name}.api_gateway`,
                          type: 'api_integration',
                          metadata: {
                            protocol: 'HTTPS',
                            integration_type: 'REST_API',
                            environment_variable: envVar.name,
                            endpoint: envVar.value
                          }
                        });
                      }
                    }
                  });
                }
              });
            }
          } catch (e) {
            console.warn('Error parsing container definitions for cross-app analysis:', e);
          }
        }
        
        // Check Lambda function environment variables
        if (type === 'aws_lambda_function' && config.environment && config.environment.variables) {
          for (const [envName, envValue] of Object.entries(config.environment.variables)) {
            if (envName.includes('API_URL') || envName.includes('ENDPOINT')) {
              if (isTargetAppReference(envValue, targetApp)) {
                apiDeps.push({
                  from: `${sourceApp.name}.${type}.${name}`,
                  to: `${targetApp.name}.api_gateway`,
                  type: 'api_integration',
                  metadata: {
                    protocol: 'HTTPS',
                    integration_type: 'LAMBDA_INVOKE',
                    environment_variable: envName,
                    endpoint: envValue
                  }
                });
              }
            }
          }
        }
      });
    }
  }
  
  return apiDeps;
}

function detectMessagingIntegrations(sourceApp, targetApp) {
  const messagingDeps = [];
  
  if (!sourceApp.resources || !targetApp.resources) return messagingDeps;
  
  // Look for SNS topics in target app that source app might subscribe to
  const targetTopics = extractSnsTopics(targetApp);
  const sourceSubscriptions = extractSnsSubscriptions(sourceApp);
  
  // Check if source app subscribes to target app's topics
  sourceSubscriptions.forEach(sub => {
    targetTopics.forEach(topic => {
      // Match by topic name patterns or ARN references
      if (isTopicSubscription(sub, topic, targetApp)) {
        messagingDeps.push({
          from: `${targetApp.name}.${topic.type}.${topic.name}`,
          to: `${sourceApp.name}.${sub.type}.${sub.name}`,
          type: 'messaging_integration',
          metadata: {
            protocol: 'SNS',
            integration_type: 'PUB_SUB',
            topic_name: topic.topicName,
            subscription_type: sub.subscriptionType
          }
        });
      }
    });
  });
  
  return messagingDeps;
}

function detectDataSharingPatterns(sourceApp, targetApp) {
  const dataDeps = [];
  
  if (!sourceApp.resources || !targetApp.resources) return dataDeps;
  
  // Look for S3 buckets in target app that source app accesses
  const targetBuckets = extractS3Buckets(targetApp);
  const sourceS3Access = extractS3AccessPatterns(sourceApp);
  
  sourceS3Access.forEach(access => {
    targetBuckets.forEach(bucket => {
      if (isBucketAccess(access, bucket, targetApp)) {
        dataDeps.push({
          from: `${sourceApp.name}.${access.type}.${access.name}`,
          to: `${targetApp.name}.${bucket.type}.${bucket.name}`,
          type: 'data_integration',
          metadata: {
            protocol: 'S3',
            integration_type: 'DATA_ACCESS',
            bucket_name: bucket.bucketName,
            access_pattern: access.accessType
          }
        });
      }
    });
  });
  
  return dataDeps;
}

function isTargetAppReference(value, targetApp) {
  if (!value || typeof value !== 'string') return false;
  
  // Look for domain names, app names, or service references
  const appNamePattern = new RegExp(targetApp.name, 'i');
  const insightEnginePattern = /insight.*engine|sagemaker|ml.*inference/i;
  const engagementHubPattern = /engagement.*hub|analytics.*service/i;
  
  return appNamePattern.test(value) || 
         (targetApp.name.includes('insight') && insightEnginePattern.test(value)) ||
         (targetApp.name.includes('engagement') && engagementHubPattern.test(value));
}

function extractSnsTopics(app) {
  const topics = [];
  
  if (!app.resources?.resource) return topics;
  
  for (const [type, resources] of Object.entries(app.resources.resource)) {
    if (type === 'aws_sns_topic') {
      for (const [name, configs] of Object.entries(resources)) {
        const configArray = Array.isArray(configs) ? configs : [configs];
        configArray.forEach(config => {
          topics.push({
            type,
            name,
            topicName: config.name || name,
            config
          });
        });
      }
    }
  }
  
  return topics;
}

function extractSnsSubscriptions(app) {
  const subscriptions = [];
  
  if (!app.resources?.resource) return subscriptions;
  
  for (const [type, resources] of Object.entries(app.resources.resource)) {
    if (type === 'aws_sns_topic_subscription') {
      for (const [name, configs] of Object.entries(resources)) {
        const configArray = Array.isArray(configs) ? configs : [configs];
        configArray.forEach(config => {
          subscriptions.push({
            type,
            name,
            subscriptionType: config.protocol || 'unknown',
            topicArn: config.topic_arn,
            config
          });
        });
      }
    }
    
    // Also check SQS queues that might be targets
    if (type === 'aws_sqs_queue') {
      for (const [name, configs] of Object.entries(resources)) {
        const configArray = Array.isArray(configs) ? configs : [configs];
        configArray.forEach(config => {
          subscriptions.push({
            type,
            name,
            subscriptionType: 'sqs',
            queueName: config.name || name,
            config
          });
        });
      }
    }
  }
  
  return subscriptions;
}

function extractS3Buckets(app) {
  const buckets = [];
  
  if (!app.resources?.resource) return buckets;
  
  for (const [type, resources] of Object.entries(app.resources.resource)) {
    if (type === 'aws_s3_bucket') {
      for (const [name, configs] of Object.entries(resources)) {
        const configArray = Array.isArray(configs) ? configs : [configs];
        configArray.forEach(config => {
          buckets.push({
            type,
            name,
            bucketName: config.bucket || name,
            config
          });
        });
      }
    }
  }
  
  return buckets;
}

function extractS3AccessPatterns(app) {
  const accessPatterns = [];
  
  if (!app.resources?.resource) return accessPatterns;
  
  // Look for IAM policies that reference S3 buckets
  for (const [type, resources] of Object.entries(app.resources.resource)) {
    if (type === 'aws_iam_role_policy' || type === 'aws_iam_policy') {
      for (const [name, configs] of Object.entries(resources)) {
        const configArray = Array.isArray(configs) ? configs : [configs];
        configArray.forEach(config => {
          if (config.policy) {
            try {
              const policy = typeof config.policy === 'string' ? JSON.parse(config.policy) : config.policy;
              if (policy.Statement) {
                policy.Statement.forEach(statement => {
                  if (statement.Action && statement.Resource) {
                    const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
                    const resources = Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource];
                    
                    const s3Actions = actions.filter(action => action.startsWith('s3:'));
                    const s3Resources = resources.filter(resource => resource.includes('s3:'));
                    
                    if (s3Actions.length > 0 && s3Resources.length > 0) {
                      accessPatterns.push({
                        type,
                        name,
                        accessType: s3Actions.join(','),
                        resources: s3Resources,
                        config
                      });
                    }
                  }
                });
              }
            } catch (e) {
              console.warn('Error parsing IAM policy for S3 access:', e);
            }
          }
        });
      }
    }
  }
  
  return accessPatterns;
}

function isTopicSubscription(subscription, topic, targetApp) {
  // Check if subscription references the topic by name or ARN pattern
  if (subscription.topicArn && subscription.topicArn.includes(topic.topicName)) {
    return true;
  }
  
  // Check naming patterns that suggest cross-app integration
  const integrationNames = ['insight', 'event', 'notification', 'alert'];
  return integrationNames.some(pattern => 
    topic.topicName.toLowerCase().includes(pattern) && 
    subscription.queueName && subscription.queueName.toLowerCase().includes(pattern)
  );
}

function isBucketAccess(access, bucket, targetApp) {
  // Check if the access pattern references the target bucket
  return access.resources.some(resource => 
    resource.includes(bucket.bucketName) || 
    resource.includes(targetApp.name)
  );
}

module.exports = { 
  inferDependencies, 
  inferCrossApplicationDependencies,
  detectApiIntegrations,
  detectMessagingIntegrations,
  detectDataSharingPatterns
};
