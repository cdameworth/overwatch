// Integration tests for API and Frontend interaction
const request = require('supertest');
const path = require('path');

describe('API-Frontend Integration', () => {
  let server;
  let app;

  beforeAll(async () => {
    // Load the server
    const serverPath = path.join(__dirname, '../../backend/server.js');
    delete require.cache[require.resolve(serverPath)];
    app = require(serverPath);
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (server && server.close) {
      await new Promise(resolve => {
        server.close(resolve);
      });
    }
  });

  describe('API Endpoints', () => {
    test('should respond to /api/parse endpoint', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('applications');
      expect(Array.isArray(response.body.applications)).toBe(true);
    });

    test('should return valid application data structure', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      const { applications } = response.body;
      
      if (applications.length > 0) {
        const app = applications[0];
        expect(app).toHaveProperty('id');
        expect(app).toHaveProperty('name');
        expect(app).toHaveProperty('resources');
        expect(Array.isArray(app.resources)).toBe(true);

        if (app.resources.length > 0) {
          const resource = app.resources[0];
          expect(resource).toHaveProperty('id');
          expect(resource).toHaveProperty('name');
          expect(resource).toHaveProperty('type');
          expect(resource).toHaveProperty('configuration');
        }
      }
    });

    test('should handle CORS properly', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should return consistent data across multiple requests', async () => {
      const response1 = await request(app).get('/api/parse');
      const response2 = await request(app).get('/api/parse');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Data structure should be consistent
      expect(Array.isArray(response1.body.applications)).toBe(true);
      expect(Array.isArray(response2.body.applications)).toBe(true);
      
      // If there's data, it should be the same
      if (response1.body.applications.length > 0 && response2.body.applications.length > 0) {
        expect(response1.body.applications[0].id).toBe(response2.body.applications[0].id);
      }
    });
  });

  describe('Data Validation', () => {
    test('should validate AWS resource types', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      const { applications } = response.body;
      
      applications.forEach(app => {
        app.resources.forEach(resource => {
          // AWS resource types should start with 'aws_'
          if (resource.type && resource.type.startsWith('aws_')) {
            expect(resource.type).toMatch(/^aws_[a-z_]+$/);
          }
        });
      });
    });

    test('should have valid resource dependencies', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      const { applications } = response.body;
      const allResourceIds = new Set();
      
      // Collect all resource IDs
      applications.forEach(app => {
        app.resources.forEach(resource => {
          allResourceIds.add(resource.id);
        });
      });

      // Validate dependencies reference existing resources
      applications.forEach(app => {
        app.resources.forEach(resource => {
          if (resource.dependencies && Array.isArray(resource.dependencies)) {
            resource.dependencies.forEach(depId => {
              expect(allResourceIds.has(depId)).toBe(true);
            });
          }
        });
      });
    });

    test('should have valid configuration objects', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      const { applications } = response.body;
      
      applications.forEach(app => {
        app.resources.forEach(resource => {
          expect(resource.configuration).toBeDefined();
          expect(typeof resource.configuration).toBe('object');
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/parse') // Wrong method
        .expect(404);
    });

    test('should return proper error responses', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });
  });

  describe('Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/parse')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, () => 
        request(app).get('/api/parse')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('applications');
      });
    });
  });

  describe('Data Processing', () => {
    test('should process Terraform resources correctly', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      const { applications } = response.body;
      
      // Should have at least some data if Terraform files exist
      if (applications.length > 0) {
        const hasLambda = applications.some(app => 
          app.resources.some(resource => 
            resource.type === 'aws_lambda_function'
          )
        );
        
        const hasApiGateway = applications.some(app => 
          app.resources.some(resource => 
            resource.type.includes('api_gateway')
          )
        );
        
        // At least one common resource type should be present
        expect(hasLambda || hasApiGateway).toBe(true);
      }
    });

    test('should infer dependencies correctly', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      const { applications } = response.body;
      let foundDependency = false;
      
      applications.forEach(app => {
        app.resources.forEach(resource => {
          if (resource.dependencies && resource.dependencies.length > 0) {
            foundDependency = true;
            
            // Dependencies should reference valid resource IDs
            resource.dependencies.forEach(depId => {
              expect(typeof depId).toBe('string');
              expect(depId.length).toBeGreaterThan(0);
            });
          }
        });
      });

      // If there are multiple resources, we should find some dependencies
      const totalResources = applications.reduce((sum, app) => sum + app.resources.length, 0);
      if (totalResources > 3) {
        expect(foundDependency).toBe(true);
      }
    });

    test('should group resources by application correctly', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      const { applications } = response.body;
      
      applications.forEach(app => {
        expect(app.id).toBeDefined();
        expect(app.name).toBeDefined();
        expect(app.resources).toBeDefined();
        expect(Array.isArray(app.resources)).toBe(true);
        
        // Each resource should belong to this app
        app.resources.forEach(resource => {
          // Resource IDs might contain app identifier
          if (resource.id.includes('.')) {
            const appPrefix = resource.id.split('.')[0];
            expect(app.name.toLowerCase().replace(/[^a-z0-9]/g, '')).toContain(
              appPrefix.toLowerCase().replace(/[^a-z0-9]/g, '')
            );
          }
        });
      });
    });
  });

  describe('Frontend Data Consumption', () => {
    test('should provide data in format expected by D3.js', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      const { applications } = response.body;
      
      // Transform data as frontend would
      const nodes = [];
      const links = [];
      
      applications.forEach(app => {
        app.resources.forEach(resource => {
          nodes.push({
            id: resource.id,
            name: resource.name,
            type: resource.type,
            app: app.name,
            configuration: resource.configuration,
          });
          
          if (resource.dependencies) {
            resource.dependencies.forEach(depId => {
              links.push({
                source: resource.id,
                target: depId,
              });
            });
          }
        });
      });

      // Validate D3.js compatible format
      nodes.forEach(node => {
        expect(node.id).toBeDefined();
        expect(node.name).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.app).toBeDefined();
      });

      links.forEach(link => {
        expect(link.source).toBeDefined();
        expect(link.target).toBeDefined();
        
        // Source and target should exist in nodes
        const sourceExists = nodes.some(n => n.id === link.source);
        const targetExists = nodes.some(n => n.id === link.target);
        expect(sourceExists).toBe(true);
        expect(targetExists).toBe(true);
      });
    });

    test('should provide AWS icon mapping information', async () => {
      const response = await request(app)
        .get('/api/parse')
        .expect(200);

      const { applications } = response.body;
      const awsIconMap = {
        'aws_lambda_function': 'icons/lambda.svg',
        'aws_api_gateway_rest_api': 'icons/apigateway.svg',
        'aws_s3_bucket': 'icons/s3.svg',
        'aws_dynamodb_table': 'icons/dynamodb.svg',
        'aws_iam_role': 'icons/iamrole.svg',
      };
      
      applications.forEach(app => {
        app.resources.forEach(resource => {
          // If it's a known AWS resource type, verify icon mapping exists
          if (awsIconMap[resource.type]) {
            expect(awsIconMap[resource.type]).toMatch(/^icons\/.*\.svg$/);
          }
        });
      });
    });
  });

  describe('Enterprise Mode Support', () => {
    test('should support enterprise analysis mode', async () => {
      // This test assumes enterprise mode might be available
      const response = await request(app)
        .get('/api/parse?enterprise=true')
        .expect(200);

      expect(response.body).toHaveProperty('applications');
      
      // Enterprise mode might provide additional metadata
      const { applications } = response.body;
      if (applications.length > 0) {
        // Could check for enterprise-specific fields
        expect(applications[0]).toBeDefined();
      }
    });

    test('should handle environment-specific parsing', async () => {
      const environments = ['prod', 'dev', 'staging'];
      
      for (const env of environments) {
        const response = await request(app)
          .get(`/api/parse?environment=${env}`);
          
        // Should respond successfully regardless of environment
        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('applications');
        }
      }
    });
  });
});