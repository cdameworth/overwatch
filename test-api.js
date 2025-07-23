const http = require('http');

// Test basic API endpoint
function testAPI() {
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/parse',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Basic API Response Status:', res.statusCode);
      try {
        const response = JSON.parse(data);
        console.log('📊 Resources found:', Object.keys(response.resources?.resource || {}).length);
        console.log('🔗 Dependencies found:', response.dependencies?.length || 0);
        console.log('📱 Apps found:', response.apps?.length || 0);
      } catch (e) {
        console.log('❌ Failed to parse response:', e.message);
        console.log('Raw response:', data.slice(0, 200));
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ API request failed:', err.message);
  });

  req.end();
}

// Test enterprise API endpoint  
function testEnterpriseAPI() {
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/parse?useEnterprise=true&environment=prod',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n🏢 Enterprise API Response Status:', res.statusCode);
      try {
        const response = JSON.parse(data);
        console.log('🚀 Enterprise Mode:', response.isEnterprise || false);
        console.log('📊 Analysis Summary:', response.summary ? 'Present' : 'Missing');
        console.log('🔗 Dependencies found:', response.dependencies?.length || 0);
        console.log('📱 Apps found:', response.apps?.length || 0);
      } catch (e) {
        console.log('❌ Failed to parse enterprise response:', e.message);
        console.log('Raw response:', data.slice(0, 200));
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Enterprise API request failed:', err.message);
  });

  req.end();
}

console.log('🧪 Testing Overwatch API endpoints...\n');

// Run tests
testAPI();
setTimeout(() => testEnterpriseAPI(), 1000);