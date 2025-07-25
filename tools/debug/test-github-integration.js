#!/usr/bin/env node

/**
 * GitHub Integration Test
 * 
 * This script demonstrates the GitHub integration functionality
 * by testing the /api/parse-github endpoint with various repositories.
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4000';

async function testGitHubIntegration() {
  console.log('🚀 Testing GitHub Integration for AWS App Visualizer');
  console.log('=' .repeat(60));
  
  const testCases = [
    {
      name: 'Terraform AWS Lambda Module',
      owner: 'terraform-aws-modules',
      repo: 'terraform-aws-lambda',
      branch: 'master',
      expectedApps: 'Multiple Lambda examples'
    },
    {
      name: 'Terraform AWS VPC Module', 
      owner: 'terraform-aws-modules',
      repo: 'terraform-aws-vpc',
      branch: 'master',
      expectedApps: 'VPC configuration examples'
    },
    {
      name: 'HashiCorp Terraform AWS Provider Examples',
      owner: 'hashicorp',
      repo: 'terraform-provider-aws',
      branch: 'main',
      expectedApps: 'Various AWS service examples'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📦 Testing: ${testCase.name}`);
    console.log(`   Repository: ${testCase.owner}/${testCase.repo}`);
    console.log(`   Branch: ${testCase.branch}`);
    
    try {
      const response = await axios.post(`${API_BASE}/api/parse-github`, {
        owner: testCase.owner,
        repo: testCase.repo,
        branch: testCase.branch
      }, {
        timeout: 30000 // 30 second timeout
      });

      const data = response.data;
      
      console.log(`   ✅ Success!`);
      console.log(`   📁 Terraform files found: ${data.terraformFiles?.length || 0}`);
      console.log(`   🏗️  Applications discovered: ${data.apps?.length || 0}`);
      console.log(`   🔧 Resource types: ${Object.keys(data.resources?.resource || {}).length}`);
      console.log(`   🔗 Dependencies: ${data.dependencies?.length || 0}`);
      
      if (data.apps?.length > 0) {
        console.log(`   📋 Applications:`);
        data.apps.slice(0, 3).forEach(app => {
          const resourceCount = Object.values(app.resources?.resource || {})
            .reduce((total, resources) => total + Object.keys(resources).length, 0);
          console.log(`      - ${app.name} (${resourceCount} resources)`);
        });
        if (data.apps.length > 3) {
          console.log(`      ... and ${data.apps.length - 3} more`);
        }
      }

      if (data.message) {
        console.log(`   💬 Message: ${data.message}`);
      }

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      if (error.response?.data?.details) {
        console.log(`   📝 Details: ${error.response.data.details}`);
      }
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('✨ GitHub Integration Test Complete');
  console.log('\n💡 To use in the frontend:');
  console.log('   1. Open http://localhost:3000 (or http://127.0.0.1:61311)');
  console.log('   2. In the Data Source section, select "GitHub Repository"');
  console.log('   3. Enter owner, repo, and branch');
  console.log('   4. Click "Load Repository"');
  console.log('   5. View the parsed Terraform infrastructure in the graph!');
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the test
testGitHubIntegration().catch(console.error);