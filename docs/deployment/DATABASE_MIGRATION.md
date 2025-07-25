# Database Migration: From JSON to MongoDB

This document describes the complete migration from JSON file storage to a production-ready MongoDB architecture with dedicated API services and telemetry support.

## Overview

The Overwatch application has been upgraded from a simple JSON file database to a comprehensive multi-service architecture:

- **MongoDB Database**: Persistent, scalable data storage
- **Database API Service**: Dedicated microservice for data operations
- **Telemetry System**: Real-time application monitoring and metrics
- **External API Layer**: CMDB and third-party system integration

## New Architecture

### Services

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Main Backend   │    │  Database API   │
│   Port: 5000    │◄──►│   Port: 4000    │◄──►│   Port: 5001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │    MongoDB      │
                                               │   Port: 27017   │
                                               └─────────────────┘
```

### Data Schema

The new MongoDB schema supports:

- **Application Metadata**: ID, name, description, tier, criticality
- **Team Ownership**: Contact info, department, organization hierarchy
- **Version Management**: Multi-environment version tracking with history
- **Infrastructure**: AWS resources, dependencies, cross-app relationships
- **Telemetry Data**: Real-time metrics with automated aggregation
- **External Integration**: CMDB IDs, ServiceNow references, custom fields
- **Audit Trail**: Complete change history with user attribution

## Quick Start

### 1. Start the Complete System

```bash
# Use the automated setup script
./scripts/setup-complete-system.sh
```

This script will:
- Start all Docker services (MongoDB, Database API, Main Backend, Frontend)
- Run database migration from existing JSON data
- Generate sample telemetry data
- Validate all endpoints are working

### 2. Manual Setup (Alternative)

```bash
# Start all services
docker-compose up --build -d

# Wait for services to be ready
docker-compose ps

# Run database migration
npm run db:migrate

# Access the application
open http://localhost:5000
```

## Service Details

### MongoDB Database (Port 27017)

- **Image**: `mongo:7.0`
- **Authentication**: `overwatch/overwatchpass123`
- **Database**: `overwatch`
- **Persistent Storage**: Docker volume `mongodb_data`
- **Health Check**: Built-in MongoDB ping command

### Database API Service (Port 5001)

Production-ready Express.js microservice with:

- **Authentication**: JWT tokens and API keys
- **Rate Limiting**: 1000 requests per 15 minutes per IP
- **Security**: Helmet, CORS, input validation
- **Endpoints**:
  - `GET /health` - Service health check
  - `GET /api/applications` - List applications with filtering
  - `POST /api/applications` - Create new application
  - `PUT /api/applications/:id` - Update application
  - `POST /api/applications/:id/telemetry` - Add telemetry data
  - `GET /external/api/applications` - CMDB integration endpoint

### Main Backend Service (Port 4000)

Enhanced backend with:

- **Database Integration**: Connects to Database API service
- **Telemetry Collection**: Automated metrics gathering
- **Legacy Compatibility**: Falls back to JSON if database unavailable
- **New Endpoints**:
  - `POST /api/telemetry/collect/:appId` - Collect telemetry for specific app
  - `POST /api/telemetry/collect-all` - Collect for all applications
  - `GET /api/telemetry/summary/:appId` - Get telemetry summary
  - `POST /api/migrate-database` - Migrate JSON to MongoDB

### Frontend (Port 5000)

No changes required - existing D3.js visualization works with new backend automatically.

## Database Schema Details

### Application Document Structure

```javascript
{
  applicationId: "insight-engine-demo",           // Unique identifier
  name: "Insight Engine",                        // Display name
  description: "AI-powered data processing...",   // Description
  applicationTier: "ai-ml",                      // frontend, backend, database, ai-ml, etc.
  businessCriticality: "high",                  // critical, high, medium, low
  
  // Team ownership information
  ownership: {
    teamName: "Data Science Platform",
    contactEmail: "data-platform@company.com",
    department: "Engineering",
    organization: "Technology",
    manager: {
      name: "Sarah Chen",
      email: "sarah.chen@company.com"
    }
  },
  
  // Version management (Map of environment -> version array)
  versions: {
    production: [{
      version: "2.1.0",
      deploymentDate: Date,
      gitCommit: "abc123def456",
      terraformConfig: { /* AWS resources */ },
      environment: "production",
      isActive: true
    }]
  },
  
  // Current active versions per environment
  activeVersions: {
    production: "2.1.0",
    staging: "2.2.0-beta",
    development: "2.3.0-dev"
  },
  
  // Infrastructure and dependencies
  infrastructure: {
    awsAccountId: "123456789012",
    region: "us-east-1",
    resources: { /* Terraform resources */ },
    dependencies: ["aws_lambda_function.processor"],
    crossApplicationDependencies: [{
      targetApplicationId: "engagement-hub-demo",
      dependencyType: "api",
      description: "Provides ML insights"
    }]
  },
  
  // Telemetry and monitoring
  telemetry: {
    // Raw metrics (last 1000 points per metric per environment)
    metrics: Map<string, MetricArray>,
    
    // Pre-aggregated data for performance
    aggregates: Map<string, AggregateArray>,
    
    // Current health status
    healthStatus: {
      overall: "healthy",
      environments: {
        production: "healthy",
        staging: "warning",
        development: "critical"
      }
    },
    
    // Monitoring configuration
    monitoring: {
      datadogDashboard: "https://app.datadoghq.com/dashboard/abc-123",
      cloudwatchNamespace: "InsightEngine/Production",
      alertingRules: [...]
    }
  },
  
  // External system references
  externalReferences: {
    cmdbId: "CMDB-12345",
    servicenowId: "SN-67890",
    jiraProject: "IE",
    confluenceSpace: "INSIGHT",
    customFields: Map<string, any>
  },
  
  // Complete audit trail
  auditLog: [{
    action: "created",
    timestamp: Date,
    userId: "user123",
    userEmail: "user@company.com",
    changes: { /* What changed */ },
    source: "api" // api, ui, automation, migration
  }],
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastSyncAt: Date,
  isActive: true
}
```

### Telemetry Metrics

Supported metric types:
- `cpu_utilization` (percent)
- `memory_utilization` (percent)  
- `request_count` (count)
- `error_rate` (percent)
- `response_time` (milliseconds)
- `disk_usage` (bytes)
- `network_io` (bytes)
- `custom` (any unit)

Each metric includes:
- Value and unit
- Environment (production, staging, development)
- Source (cloudwatch, datadog, prometheus, manual)
- Timestamp

## API Usage Examples

### Creating an Application

```bash
curl -X POST http://localhost:5001/api/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "applicationId": "my-new-app",
    "name": "My New Application",
    "applicationTier": "backend",
    "businessCriticality": "medium",
    "ownership": {
      "teamName": "Platform Team",
      "contactEmail": "platform@company.com",
      "department": "Engineering",
      "organization": "Technology"
    }
  }'
```

### Adding Telemetry Data

```bash
curl -X POST http://localhost:5001/api/applications/my-new-app/telemetry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "metrics": [
      {
        "metricName": "cpu_utilization",
        "value": 45.2,
        "unit": "percent",
        "environment": "production",
        "source": "cloudwatch"
      },
      {
        "metricName": "response_time",
        "value": 234,
        "unit": "milliseconds", 
        "environment": "production",
        "source": "datadog"
      }
    ]
  }'
```

### CMDB Integration

```bash
# Get applications in CMDB format
curl -X GET "http://localhost:5001/external/api/applications?format=cmdb" \
  -H "x-api-key: cmdb-api-key-123"

# Bulk update external references
curl -X POST http://localhost:5001/external/api/applications/sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: cmdb-api-key-123" \
  -d '{
    "updates": [
      {
        "applicationId": "my-app",
        "cmdbId": "CMDB-54321",
        "customFields": {
          "costCenter": "CC-1234",
          "businessOwner": "John Smith"
        }
      }
    ]
  }'
```

## Migration Process

### Automatic Migration

The system automatically migrates existing JSON data:

1. **Data Mapping**: Legacy apps mapped to new schema with sensible defaults
2. **Team Information**: Extracted from existing fields or set to defaults
3. **Version Creation**: Current state becomes "production" version 1.0.0
4. **Resource Mapping**: Terraform resources preserved in new structure
5. **Audit Trail**: Migration event recorded with timestamp

### Manual Migration

```bash
# Run migration script directly
npm run db:migrate

# Or via API endpoint
curl -X POST http://localhost:4000/api/migrate-database
```

## Telemetry System

### Automatic Collection

The system automatically collects simulated telemetry data:

- **CPU Utilization**: 10-90% randomized by environment
- **Memory Usage**: 15-85% with realistic patterns
- **Response Time**: 100-2100ms with environment variations
- **Error Rate**: 0-5% with production being lower
- **Request Count**: Scaled by environment (prod > staging > dev)

### Data Sources

Simulated sources include:
- **AWS CloudWatch**: Infrastructure metrics
- **DataDog**: Application performance monitoring
- **Prometheus**: Custom metrics
- **Manual**: User-submitted data points

### Health Status Calculation

Automatic health status based on:
- **Error Rate**: >5% = critical, >1% = warning, <1% = healthy
- **Response Time**: >5000ms = critical, >2000ms = warning, <2000ms = healthy
- **Overall Status**: Worst status across all environments

## Performance Optimizations

### Database Indexes

Optimized indexes for common queries:
- `applicationId` (unique)
- `ownership.organization` + `ownership.department`
- `applicationTier` + `businessCriticality`
- `telemetry.healthStatus.overall`
- `infrastructure.awsAccountId` + `infrastructure.region`

### Data Aggregation

Pre-computed aggregates for telemetry:
- Hourly, daily, weekly, monthly rollups
- Min, max, average, percentiles (p50, p95, p99)
- Automatic cleanup of old raw data (keeps last 1000 points)

### Caching Strategy

- Database connection pooling (max 10 connections)
- Rate limiting to prevent abuse
- Compression for large responses
- Efficient pagination for large datasets

## Troubleshooting

### Common Issues

**Service Won't Start**
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs database-api
docker-compose logs overwatch-db
```

**Database Connection Failed**
```bash
# Test MongoDB connectivity
docker-compose exec overwatch-db mongosh --eval "db.adminCommand('ping')"

# Check network connectivity
docker-compose exec database-api ping overwatch-db
```

**Migration Failed**
```bash
# Check existing JSON data
cat backend/db.json

# Run migration with debug output
DEBUG=true npm run db:migrate
```

### Health Checks

All services include health check endpoints:

```bash
# Database API health
curl http://localhost:5001/health

# MongoDB health (via database API)
curl http://localhost:5001/health | jq .database

# Main backend health
curl http://localhost:4000/api/parse?useDatabase=false
```

## Security Considerations

### Authentication

- **JWT Tokens**: For user authentication
- **API Keys**: For external system integration
- **Environment Variables**: Secrets stored securely

### Network Security

- **CORS Configuration**: Restricted origins
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Joi schema validation
- **Helmet**: Security headers

### Data Protection

- **Database Authentication**: MongoDB with username/password
- **Encrypted Connections**: TLS for production deployments
- **Audit Logging**: Complete change tracking
- **Data Retention**: Configurable cleanup policies

## Production Deployment

### Environment Variables

Required for production:

```env
# Database API
NODE_ENV=production
MONGODB_URI=mongodb://user:pass@mongodb-host:27017/overwatch
JWT_SECRET=your-super-secret-jwt-key
VALID_API_KEYS=key1,key2,key3

# Main Backend  
DATABASE_API_URL=http://database-api:5001
SESSION_SECRET=your-session-secret
```

### Scaling Considerations

- **Database API**: Horizontally scalable (multiple replicas)
- **MongoDB**: Replica sets for high availability
- **Load Balancing**: Nginx or cloud load balancer
- **Monitoring**: Prometheus, Grafana, DataDog integration

### Backup Strategy

- **MongoDB Backups**: Automated daily snapshots
- **Configuration Backup**: Infrastructure as code
- **Disaster Recovery**: Multi-region deployment capability

## Next Steps

1. **Enhanced Monitoring**: Real DataDog/CloudWatch integration
2. **Advanced Analytics**: Machine learning insights
3. **Enterprise Features**: SSO, advanced RBAC
4. **API Gateway**: Centralized API management
5. **Event Streaming**: Kafka/Kinesis for real-time updates

## Support

For issues or questions:
- Check service logs: `docker-compose logs [service-name]`
- Verify health endpoints: `/health` on all services
- Review this documentation for troubleshooting steps
- Use the automated setup script for consistent deployment