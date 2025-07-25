const DatabaseClient = require('./database-client');

class TelemetryService {
  constructor(dbClient = null) {
    this.dbClient = dbClient || new DatabaseClient();
  }

  // Simulate telemetry data collection from various sources
  async collectTelemetryData(applicationId) {
    try {
      const metrics = [];
      const timestamp = new Date();

      // Simulate AWS CloudWatch metrics
      metrics.push({
        metricName: 'cpu_utilization',
        value: Math.random() * 80 + 10, // 10-90%
        unit: 'percent',
        environment: 'production',
        source: 'cloudwatch'
      });

      metrics.push({
        metricName: 'memory_utilization', 
        value: Math.random() * 70 + 15, // 15-85%
        unit: 'percent',
        environment: 'production',
        source: 'cloudwatch'
      });

      // Simulate DataDog APM metrics
      metrics.push({
        metricName: 'response_time',
        value: Math.random() * 2000 + 100, // 100-2100ms
        unit: 'milliseconds',
        environment: 'production',
        source: 'datadog'
      });

      metrics.push({
        metricName: 'error_rate',
        value: Math.random() * 5, // 0-5%
        unit: 'percent',
        environment: 'production',
        source: 'datadog'
      });

      metrics.push({
        metricName: 'request_count',
        value: Math.floor(Math.random() * 10000) + 1000, // 1000-11000
        unit: 'count',
        environment: 'production',
        source: 'cloudwatch'
      });

      // Add staging environment metrics (typically lower volume)
      const stagingMetrics = metrics.map(metric => ({
        ...metric,
        environment: 'staging',
        value: metric.unit === 'count' ? metric.value * 0.1 : metric.value * 0.8
      }));

      // Add development environment metrics (even lower volume)
      const devMetrics = metrics.map(metric => ({
        ...metric,
        environment: 'development',
        value: metric.unit === 'count' ? metric.value * 0.05 : metric.value * 0.6
      }));

      const allMetrics = [...metrics, ...stagingMetrics, ...devMetrics];

      // Send to database
      await this.dbClient.addTelemetryData(applicationId, allMetrics);

      return {
        success: true,
        metricsAdded: allMetrics.length,
        applicationId,
        timestamp
      };

    } catch (error) {
      console.error(`Error collecting telemetry for ${applicationId}:`, error);
      return {
        success: false,
        error: error.message,
        applicationId
      };
    }
  }

  // Collect telemetry for all active applications
  async collectAllApplicationTelemetry() {
    try {
      const applications = await this.dbClient.getApplications({
        limit: 100
      });

      const results = [];

      for (const app of applications.applications || []) {
        const result = await this.collectTelemetryData(app.applicationId);
        results.push(result);
        
        // Add small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        success: true,
        applicationsProcessed: results.length,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length,
        results
      };

    } catch (error) {
      console.error('Error in bulk telemetry collection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get telemetry summary for an application
  async getTelemetrySummary(applicationId, timeRange = '1h') {
    try {
      const environments = ['production', 'staging', 'development'];
      const metrics = ['cpu_utilization', 'memory_utilization', 'response_time', 'error_rate', 'request_count'];
      
      const summary = {};

      for (const env of environments) {
        summary[env] = {};
        
        for (const metric of metrics) {
          const telemetryData = await this.dbClient.getTelemetryData(applicationId, {
            metricName: metric,
            environment: env,
            aggregation: 'raw',
            limit: 50
          });

          const values = telemetryData.metrics || [];
          if (values.length > 0) {
            const numericValues = values.map(v => v.value);
            summary[env][metric] = {
              current: numericValues[numericValues.length - 1],
              average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
              min: Math.min(...numericValues),
              max: Math.max(...numericValues),
              count: numericValues.length,
              unit: values[0].unit
            };
          } else {
            summary[env][metric] = {
              current: null,
              average: null,
              min: null,
              max: null,
              count: 0,
              unit: 'unknown'
            };
          }
        }
      }

      return {
        success: true,
        applicationId,
        timeRange,
        summary,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error getting telemetry summary for ${applicationId}:`, error);
      return {
        success: false,
        error: error.message,
        applicationId
      };
    }
  }

  // Start continuous telemetry collection (for demo purposes)
  startContinuousCollection(intervalMinutes = 5) {
    console.log(`🔄 Starting continuous telemetry collection (every ${intervalMinutes} minutes)`);
    
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Initial collection
    this.collectAllApplicationTelemetry();
    
    // Set up recurring collection
    this.collectionInterval = setInterval(async () => {
      console.log('📊 Collecting telemetry data for all applications...');
      const result = await this.collectAllApplicationTelemetry();
      console.log(`✅ Telemetry collection completed: ${result.successCount} success, ${result.errorCount} errors`);
    }, intervalMs);

    return this.collectionInterval;
  }

  // Stop continuous collection
  stopContinuousCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      console.log('⏹️ Stopped continuous telemetry collection');
    }
  }

  // Generate sample historical data for a new application
  async generateHistoricalData(applicationId, daysBack = 7) {
    try {
      console.log(`📈 Generating ${daysBack} days of historical telemetry for ${applicationId}`);
      
      const metrics = ['cpu_utilization', 'memory_utilization', 'response_time', 'error_rate', 'request_count'];
      const environments = ['production', 'staging', 'development'];
      const pointsPerDay = 24; // One per hour
      
      const allMetrics = [];
      
      for (let day = daysBack; day >= 0; day--) {
        for (let hour = 0; hour < pointsPerDay; hour++) {
          const timestamp = new Date();
          timestamp.setDate(timestamp.getDate() - day);
          timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
          
          for (const env of environments) {
            for (const metricName of metrics) {
              let value, unit;
              
              switch (metricName) {
                case 'cpu_utilization':
                  value = Math.random() * 80 + 10;
                  unit = 'percent';
                  break;
                case 'memory_utilization':
                  value = Math.random() * 70 + 15;
                  unit = 'percent';
                  break;
                case 'response_time':
                  value = Math.random() * 2000 + 100;
                  unit = 'milliseconds';
                  break;
                case 'error_rate':
                  value = Math.random() * 5;
                  unit = 'percent';
                  break;
                case 'request_count':
                  value = Math.floor(Math.random() * 10000) + 1000;
                  unit = 'count';
                  break;
              }
              
              // Adjust values by environment
              if (env === 'staging') value *= 0.8;
              if (env === 'development') value *= 0.6;
              if (metricName === 'request_count') {
                if (env === 'staging') value *= 0.1;
                if (env === 'development') value *= 0.05;
              }
              
              allMetrics.push({
                metricName,
                value,
                unit,
                environment: env,
                source: metricName.includes('response_time') || metricName.includes('error_rate') ? 'datadog' : 'cloudwatch',
                timestamp
              });
            }
          }
        }
      }
      
      // Send to database in batches
      const batchSize = 100;
      let processed = 0;
      
      for (let i = 0; i < allMetrics.length; i += batchSize) {
        const batch = allMetrics.slice(i, i + batchSize);
        await this.dbClient.addTelemetryData(applicationId, batch);
        processed += batch.length;
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`✅ Generated ${processed} historical data points for ${applicationId}`);
      
      return {
        success: true,
        applicationId,
        dataPointsGenerated: processed,
        daysBack,
        environments: environments.length,
        metrics: metrics.length
      };
      
    } catch (error) {
      console.error(`Error generating historical data for ${applicationId}:`, error);
      return {
        success: false,
        error: error.message,
        applicationId
      };
    }
  }
}

module.exports = TelemetryService;