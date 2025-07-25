const EnterpriseRepositoryService = require('./backend/enterprise-repository-service');
const path = require('path');

async function testEnterpriseAnalysis() {
  try {
    console.log('🔍 Starting Enterprise Repository Analysis Test...\n');
    
    const enterpriseService = new EnterpriseRepositoryService();
    const testRepoPath = path.join(__dirname, 'backend/data/test-enterprise');
    
    console.log(`📁 Analyzing repository: ${testRepoPath}`);
    console.log('🔧 Environment: production\n');
    
    const analysis = await enterpriseService.analyzeLocalRepository(testRepoPath, 'prod');
    
    console.log('✅ Analysis Complete!\n');
    
    // Print summary
    const summary = enterpriseService.generateSummaryReport(analysis);
    console.log('📊 ANALYSIS SUMMARY');
    console.log('==================');
    console.log(`Modules Found: ${summary.moduleCount}`);
    console.log(`Total Resources: ${summary.resourceCount}`);
    console.log(`Dependencies: ${summary.dependencyCount}`);
    console.log(`Recommendations: ${summary.recommendationCount}`);
    console.log(`Critical Issues: ${summary.criticalIssues}`);
    console.log(`Circular Dependencies: ${summary.hasCircularDependencies ? 'YES' : 'NO'}\n`);
    
    // Print module breakdown
    console.log('🏗️  MODULE BREAKDOWN');
    console.log('===================');
    summary.moduleBreakdown.forEach(module => {
      console.log(`├─ ${module.name} (${module.type})`);
      console.log(`   ├─ Resources: ${module.resourceCount}`);
      console.log(`   ├─ Variables: ${module.variableCount}`);
      console.log(`   └─ Outputs: ${module.outputCount}`);
    });
    console.log();
    
    // Print top recommendations
    if (summary.topRecommendations.length > 0) {
      console.log('⚠️  TOP RECOMMENDATIONS');
      console.log('======================');
      summary.topRecommendations.forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`   ${rec.description}\n`);
      });
    }
    
    // Print dependency information
    if (analysis.dependencies.dependencies.length > 0) {
      console.log('🔗 DEPENDENCIES');
      console.log('===============');
      analysis.dependencies.dependencies.forEach(dep => {
        console.log(`├─ ${dep.from} → ${dep.to} (${dep.type})`);
      });
      console.log();
    }
    
    // Print statistics
    console.log('📈 DEPENDENCY STATISTICS');
    console.log('========================');
    const stats = analysis.dependencies.statistics;
    Object.entries(stats.dependencyTypes).forEach(([type, count]) => {
      console.log(`├─ ${type}: ${count}`);
    });
    
    if (stats.isolatedModules.length > 0) {
      console.log(`\n🏝️  Isolated Modules: ${stats.isolatedModules.join(', ')}`);
    }
    
    console.log('\n✨ Enterprise analysis test completed successfully!');
    
  } catch (error) {
    console.error('❌ Enterprise analysis test failed:', error);
    process.exit(1);
  }
}

testEnterpriseAnalysis();