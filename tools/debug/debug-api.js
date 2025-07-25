const mongoose = require('mongoose');
const Application = require('./database/schemas/application');

const MONGODB_URI = 'mongodb://overwatch:overwatchpass123@overwatch-db:27017/overwatch?authSource=admin';

async function debug() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test the exact query used in the external API
    const applications = await Application
      .find({ isActive: true })
      .select('-telemetry.metrics -auditLog')
      .lean();

    console.log('Number of applications:', applications.length);
    
    if (applications.length > 0) {
      const app = applications[0];
      console.log('\nFirst application:');
      console.log('- applicationId:', app.applicationId);
      console.log('- Has infrastructure:', !!app.infrastructure);
      console.log('- Infrastructure keys:', app.infrastructure ? Object.keys(app.infrastructure) : 'none');
      console.log('- Has versions:', !!app.versions);
      console.log('- Versions keys:', app.versions ? Object.keys(app.versions) : 'none');
      
      if (app.infrastructure && app.infrastructure.resources) {
        console.log('- Infrastructure.resources keys:', Object.keys(app.infrastructure.resources));
        if (app.infrastructure.resources.resource) {
          console.log('- Resource types:', Object.keys(app.infrastructure.resources.resource));
        }
      }
      
      if (app.versions) {
        console.log('- Version environments:', Object.keys(app.versions));
        if (app.versions.production) {
          console.log('- Production versions count:', app.versions.production.length);
          if (app.versions.production[0]) {
            console.log('- Has terraformConfig:', !!app.versions.production[0].terraformConfig);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debug();