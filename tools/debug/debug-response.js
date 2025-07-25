const mongoose = require('mongoose');
const Application = require('./database/schemas/application');

const MONGODB_URI = 'mongodb://overwatch:overwatchpass123@overwatch-db:27017/overwatch?authSource=admin';

async function debug() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test the exact query and response used in the external API
    const applications = await Application
      .find({ isActive: true })
      .select('-telemetry.metrics -auditLog')
      .lean();

    console.log('Raw query result (first app infrastructure):');
    console.log(JSON.stringify(applications[0].infrastructure, null, 2));
    
    console.log('\nRaw query result (first app versions):');
    console.log(JSON.stringify(applications[0].versions, null, 2));
    
    // Test the response format
    const responseData = applications;
    const response = {
      applications: responseData,
      count: responseData.length,
      format: 'visualization',
      timestamp: new Date().toISOString()
    };
    
    console.log('\nResponse infrastructure:');
    console.log(JSON.stringify(response.applications[0].infrastructure, null, 2));
    
    console.log('\nResponse versions:');
    console.log(JSON.stringify(response.applications[0].versions, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debug();