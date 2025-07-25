const mongoose = require('mongoose');
const Application = require('./database/schemas/application');

const MONGODB_URI = 'mongodb://overwatch:overwatchpass123@overwatch-db:27017/overwatch?authSource=admin';

async function debug() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get raw application without any select
    const app = await Application.findOne({ applicationId: 'insight-engine-demo' });
    console.log('Full app structure:');
    console.log('Has infrastructure:', !!app.infrastructure);
    console.log('Infrastructure keys:', app.infrastructure ? Object.keys(app.infrastructure) : 'none');
    console.log('Has versions:', !!app.versions);
    console.log('Versions type:', app.versions ? typeof app.versions : 'none');

    // Try with lean
    const appLean = await Application.findOne({ applicationId: 'insight-engine-demo' }).lean();
    console.log('\nLean app structure:');
    console.log('Has infrastructure:', !!appLean.infrastructure);
    console.log('Infrastructure keys:', appLean.infrastructure ? Object.keys(appLean.infrastructure) : 'none');
    console.log('Has versions:', !!appLean.versions);
    console.log('Versions type:', appLean.versions ? typeof appLean.versions : 'none');

    // Try with select all except sensitive
    const appSelect = await Application.findOne({ applicationId: 'insight-engine-demo' })
      .select('-telemetry.metrics -auditLog')
      .lean();
    
    console.log('\nSelected app structure:');
    console.log('Has infrastructure:', !!appSelect.infrastructure);
    console.log('Infrastructure keys:', appSelect.infrastructure ? Object.keys(appSelect.infrastructure) : 'none');
    console.log('Has versions:', !!appSelect.versions);
    console.log('Versions type:', appSelect.versions ? typeof appSelect.versions : 'none');

    if (appSelect.infrastructure && appSelect.infrastructure.resources) {
      console.log('Infrastructure.resources keys:', Object.keys(appSelect.infrastructure.resources));
    }

    if (appSelect.versions) {
      console.log('Versions is a Map:', appSelect.versions instanceof Map);
      console.log('Versions keys:', appSelect.versions instanceof Map ? Array.from(appSelect.versions.keys()) : Object.keys(appSelect.versions));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debug();