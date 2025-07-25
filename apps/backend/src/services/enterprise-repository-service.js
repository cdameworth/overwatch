// Temporarily commented out missing dependencies
// const RepositoryScanner = require('./repository-scanner');
// const EnvironmentConfigParser = require('./environment-config-parser');
// const CrossModuleDependencyResolver = require('./cross-module-dependency-resolver');

/**
 * Enterprise Repository Discovery Service
 * Orchestrates the complete analysis of enterprise IaC repositories
 */
class EnterpriseRepositoryService {
  constructor(gitHubService = null) {
    this.gitHubService = gitHubService;
    // Temporarily commented out missing dependencies
    // this.repositoryScanner = new RepositoryScanner(gitHubService);
    // this.environmentConfigParser = new EnvironmentConfigParser(gitHubService);
    // this.dependencyResolver = new CrossModuleDependencyResolver();
  }

  /**
   * Complete enterprise repository analysis
   */
  async analyzeRepository(owner, repo, branch = 'main', targetEnvironment = 'prod') {
    try {
      console.log(`Starting enterprise analysis for ${owner}/${repo}:${branch} (${targetEnvironment})`);
      
      const analysis = {
        repository: { owner, repo, branch },
        environment: targetEnvironment,
        timestamp: new Date().toISOString(),
        structure: null,
        environmentConfig: null,
        dependencies: null,
        visualization: null,
        recommendations: [],
        metadata: {
          analysisVersion: '2.0',
          features: ['multi-module', 'environment-aware', 'cross-module-dependencies']
        }
      };

      // Step 1: Scan repository structure
      console.log('Step 1: Scanning repository structure...');
      analysis.structure = await this.repositoryScanner.scanRepository(owner, repo, branch);
      console.log(`Found ${analysis.structure.modules.length} modules`);

      // Step 2: Parse environment configuration
      console.log(`Step 2: Parsing ${targetEnvironment} environment configuration...`);
      analysis.environmentConfig = await this.environmentConfigParser.parseEnvironmentConfig(
        owner, repo, branch, analysis.structure, targetEnvironment
      );
      console.log(`Parsed ${Object.keys(analysis.environmentConfig.modules).length} module configurations`);

      // Step 3: Resolve cross-module dependencies
      console.log('Step 3: Resolving cross-module dependencies...');
      analysis.dependencies = this.dependencyResolver.resolveCrossModuleDependencies(
        analysis.structure, analysis.environmentConfig
      );
      console.log(`Found ${analysis.dependencies.dependencies.length} dependencies`);

      // Step 4: Generate visualization data
      console.log('Step 4: Generating visualization data...');
      analysis.visualization = this.generateVisualizationData(
        analysis.structure, analysis.environmentConfig, analysis.dependencies
      );

      // Step 5: Generate recommendations
      console.log('Step 5: Generating recommendations...');
      analysis.recommendations = this.generateAnalysisRecommendations(analysis);

      console.log('Enterprise repository analysis complete');
      return analysis;
    } catch (error) {
      console.error('Enterprise repository analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze local repository for development/testing
   */
  async analyzeLocalRepository(repoPath, targetEnvironment = 'prod') {
    try {
      console.log(`Starting local enterprise analysis for ${repoPath} (${targetEnvironment})`);
      
      const analysis = {
        repository: { path: repoPath, type: 'local' },
        environment: targetEnvironment,
        timestamp: new Date().toISOString(),
        structure: null,
        environmentConfig: null,
        dependencies: null,
        visualization: null,
        recommendations: [],
        metadata: {
          analysisVersion: '2.0',
          features: ['multi-module', 'environment-aware', 'cross-module-dependencies', 'local-analysis']
        }
      };

      // Step 1: Scan local repository structure
      console.log('Step 1: Scanning local repository structure...');
      analysis.structure = await this.repositoryScanner.scanLocalRepository(repoPath);
      console.log(`Found ${analysis.structure.modules.length} modules`);

      // Step 2: Parse local environment configuration
      console.log(`Step 2: Parsing ${targetEnvironment} environment configuration...`);
      analysis.environmentConfig = await this.environmentConfigParser.parseLocalEnvironmentConfig(
        repoPath, analysis.structure, targetEnvironment
      );
      console.log(`Parsed ${Object.keys(analysis.environmentConfig.modules).length} module configurations`);

      // Step 3: Resolve cross-module dependencies
      console.log('Step 3: Resolving cross-module dependencies...');
      analysis.dependencies = this.dependencyResolver.resolveCrossModuleDependencies(
        analysis.structure, analysis.environmentConfig
      );
      console.log(`Found ${analysis.dependencies.dependencies.length} dependencies`);

      // Step 4: Generate visualization data
      console.log('Step 4: Generating visualization data...');
      analysis.visualization = this.generateVisualizationData(
        analysis.structure, analysis.environmentConfig, analysis.dependencies
      );

      // Step 5: Generate recommendations
      console.log('Step 5: Generating recommendations...');
      analysis.recommendations = this.generateAnalysisRecommendations(analysis);

      console.log('Local enterprise repository analysis complete');
      return analysis;
    } catch (error) {
      console.error('Local enterprise repository analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate visualization data for Overwatch frontend
   */
  generateVisualizationData(structure, environmentConfig, dependencies) {
    const visualization = {
      nodes: [],
      links: [],
      modules: [],
      statistics: {
        totalNodes: 0,
        totalLinks: 0,
        moduleCount: 0,
        resourceTypes: new Set(),
        environments: structure.environments.map(e => e.name)
      }
    };

    // Generate module-level nodes
    for (const [moduleName, moduleConfig] of Object.entries(environmentConfig.modules)) {
      const moduleNode = {
        id: `module_${moduleName}`,
        name: moduleName,
        type: 'module',
        moduleType: moduleConfig.type,
        group: moduleName,
        metadata: {
          resourceCount: this.countModuleResources(moduleConfig),
          variableCount: Object.keys(moduleConfig.variables).length,
          outputCount: Object.keys(moduleConfig.outputs).length,
          hasIssues: this.hasModuleIssues(moduleConfig, dependencies)
        }
      };

      visualization.modules.push(moduleNode);

      // Generate resource nodes within each module
      const resourceNodes = this.generateResourceNodes(moduleName, moduleConfig);
      visualization.nodes.push(...resourceNodes);

      // Update statistics
      for (const node of resourceNodes) {
        visualization.statistics.resourceTypes.add(node.resourceType);
      }
    }

    // Add module nodes to main nodes array
    visualization.nodes.push(...visualization.modules);

    // Generate links from dependencies
    for (const dependency of dependencies.dependencies) {
      const link = {
        source: `module_${dependency.from}`,
        target: `module_${dependency.to}`,
        type: dependency.type,
        metadata: dependency.metadata,
        id: `${dependency.from}-${dependency.to}-${dependency.type}`
      };

      visualization.links.push(link);
    }

    // Update final statistics
    visualization.statistics.totalNodes = visualization.nodes.length;
    visualization.statistics.totalLinks = visualization.links.length;
    visualization.statistics.moduleCount = visualization.modules.length;
    visualization.statistics.resourceTypes = Array.from(visualization.statistics.resourceTypes);

    return visualization;
  }

  /**
   * Generate resource nodes within a module
   */
  generateResourceNodes(moduleName, moduleConfig) {
    const nodes = [];

    // Generate managed resource nodes
    for (const [resourceType, resources] of Object.entries(moduleConfig.managedResources || {})) {
      for (const [resourceName, resourceConfig] of Object.entries(resources)) {
        const node = {
          id: `${moduleName}.${resourceType}.${resourceName}`,
          name: resourceName,
          type: resourceType,
          resourceType: resourceType,
          group: moduleName,
          moduleType: moduleConfig.type,
          category: 'managed_resource',
          config: resourceConfig,
          metadata: {
            module: moduleName,
            fullyQualifiedName: `${resourceType}.${resourceName}`,
            hasExplicitDependencies: !!resourceConfig.depends_on
          }
        };

        nodes.push(node);
      }
    }

    // Generate data source nodes
    for (const [dataType, dataSources] of Object.entries(moduleConfig.dataResources || {})) {
      for (const [dataName, dataConfig] of Object.entries(dataSources)) {
        const node = {
          id: `${moduleName}.data.${dataType}.${dataName}`,
          name: `data_${dataName}`,
          type: dataType,
          resourceType: dataType,
          group: moduleName,
          moduleType: moduleConfig.type,
          category: 'data_source',
          config: dataConfig,
          metadata: {
            module: moduleName,
            fullyQualifiedName: `data.${dataType}.${dataName}`,
            isDataSource: true
          }
        };

        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Count total resources in a module
   */
  countModuleResources(moduleConfig) {
    let count = 0;
    
    for (const resources of Object.values(moduleConfig.managedResources || {})) {
      count += Object.keys(resources).length;
    }
    
    for (const dataSources of Object.values(moduleConfig.dataResources || {})) {
      count += Object.keys(dataSources).length;
    }
    
    return count;
  }

  /**
   * Check if a module has issues
   */
  hasModuleIssues(moduleConfig, dependencies) {
    // Check for unresolved variables
    for (const [varName, value] of Object.entries(moduleConfig.resolvedVariables || {})) {
      if (value === null) {
        return true;
      }
    }

    // Check if module is involved in circular dependencies
    for (const cycle of dependencies.circularDependencies) {
      if (cycle.includes(moduleConfig.name)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate comprehensive analysis recommendations
   */
  generateAnalysisRecommendations(analysis) {
    const recommendations = [];

    // Module-specific recommendations
    recommendations.push(...this.generateModuleRecommendations(analysis));

    // Dependency-specific recommendations
    recommendations.push(...this.generateDependencyRecommendations(analysis.dependencies));

    // Environment-specific recommendations
    recommendations.push(...this.generateEnvironmentRecommendations(analysis.environmentConfig));

    // Security recommendations
    recommendations.push(...this.generateSecurityRecommendations(analysis));

    // Performance recommendations
    recommendations.push(...this.generatePerformanceRecommendations(analysis));

    return recommendations;
  }

  /**
   * Generate module-specific recommendations
   */
  generateModuleRecommendations(analysis) {
    const recommendations = [];

    for (const [moduleName, moduleConfig] of Object.entries(analysis.environmentConfig.modules)) {
      const resourceCount = this.countModuleResources(moduleConfig);
      
      if (resourceCount > 20) {
        recommendations.push({
          type: 'warning',
          category: 'module_size',
          title: `Large Module: ${moduleName}`,
          description: `Module ${moduleName} contains ${resourceCount} resources. Consider breaking it into smaller, more focused modules.`,
          module: moduleName,
          priority: 'medium'
        });
      }

      // Check for missing outputs
      const hasResources = resourceCount > 0;
      const hasOutputs = Object.keys(moduleConfig.outputs).length > 0;
      
      if (hasResources && !hasOutputs) {
        recommendations.push({
          type: 'info',
          category: 'module_outputs',
          title: `Missing Outputs: ${moduleName}`,
          description: `Module ${moduleName} has resources but no outputs. Consider adding outputs for reusability.`,
          module: moduleName,
          priority: 'low'
        });
      }

      // Check for unresolved variables
      const unresolvedVars = Object.entries(moduleConfig.resolvedVariables || {})
        .filter(([, value]) => value === null)
        .map(([name]) => name);

      if (unresolvedVars.length > 0) {
        recommendations.push({
          type: 'error',
          category: 'configuration',
          title: `Unresolved Variables: ${moduleName}`,
          description: `Module ${moduleName} has unresolved variables: ${unresolvedVars.join(', ')}`,
          module: moduleName,
          variables: unresolvedVars,
          priority: 'high'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate dependency-specific recommendations
   */
  generateDependencyRecommendations(dependencies) {
    const recommendations = [];

    // Circular dependencies
    if (dependencies.circularDependencies.length > 0) {
      for (const cycle of dependencies.circularDependencies) {
        recommendations.push({
          type: 'error',
          category: 'circular_dependency',
          title: 'Circular Dependency Detected',
          description: `Circular dependency found: ${cycle.join(' → ')}`,
          modules: cycle,
          priority: 'critical'
        });
      }
    }

    // Isolated modules
    if (dependencies.statistics.isolatedModules.length > 0) {
      recommendations.push({
        type: 'info',
        category: 'module_isolation',
        title: 'Isolated Modules',
        description: `These modules have no dependencies: ${dependencies.statistics.isolatedModules.join(', ')}`,
        modules: dependencies.statistics.isolatedModules,
        priority: 'low'
      });
    }

    // Highly coupled modules
    const highlyCoupled = dependencies.statistics.mostDependendModules.filter(m => m.total > 8);
    if (highlyCoupled.length > 0) {
      for (const module of highlyCoupled) {
        recommendations.push({
          type: 'warning',
          category: 'high_coupling',
          title: `Highly Coupled Module: ${module.module}`,
          description: `Module ${module.module} has ${module.total} dependencies. Consider reducing coupling.`,
          module: module.module,
          dependencyCount: module.total,
          priority: 'medium'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate environment-specific recommendations
   */
  generateEnvironmentRecommendations(environmentConfig) {
    const recommendations = [];

    if (environmentConfig.environment !== 'prod') {
      recommendations.push({
        type: 'info',
        category: 'environment',
        title: 'Non-Production Environment',
        description: `Currently analyzing ${environmentConfig.environment} environment. Production analysis recommended for deployment readiness.`,
        environment: environmentConfig.environment,
        priority: 'low'
      });
    }

    // Check for missing backend configuration
    if (!environmentConfig.backendConfig || Object.keys(environmentConfig.backendConfig).length === 0) {
      recommendations.push({
        type: 'warning',
        category: 'backend_config',
        title: 'Missing Backend Configuration',
        description: 'No backend configuration found. Remote state management recommended for production.',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations(analysis) {
    const recommendations = [];

    // Check for hardcoded values that might be sensitive
    for (const [moduleName, moduleConfig] of Object.entries(analysis.environmentConfig.modules)) {
      const sensitivePatterns = ['password', 'secret', 'key', 'token', 'credential'];
      
      for (const [varName, value] of Object.entries(moduleConfig.resolvedVariables || {})) {
        if (typeof value === 'string' && sensitivePatterns.some(pattern => 
          varName.toLowerCase().includes(pattern) || value.toLowerCase().includes(pattern))) {
          
          recommendations.push({
            type: 'warning',
            category: 'security',
            title: `Potential Sensitive Data: ${moduleName}`,
            description: `Variable ${varName} in module ${moduleName} may contain sensitive data.`,
            module: moduleName,
            variable: varName,
            priority: 'high'
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations(analysis) {
    const recommendations = [];

    // Check for potential performance issues
    const totalResources = analysis.visualization.statistics.totalNodes;
    
    if (totalResources > 100) {
      recommendations.push({
        type: 'info',
        category: 'performance',
        title: 'Large Infrastructure',
        description: `Infrastructure contains ${totalResources} resources. Consider using Terraform workspaces or separate state files for better performance.`,
        resourceCount: totalResources,
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(analysis) {
    const report = {
      repository: analysis.repository,
      environment: analysis.environment,
      summary: {
        moduleCount: analysis.structure.modules.length,
        resourceCount: analysis.visualization.statistics.totalNodes,
        dependencyCount: analysis.dependencies.dependencies.length,
        recommendationCount: analysis.recommendations.length,
        criticalIssues: analysis.recommendations.filter(r => r.priority === 'critical').length,
        hasCircularDependencies: analysis.dependencies.circularDependencies.length > 0
      },
      moduleBreakdown: Object.entries(analysis.environmentConfig.modules).map(([name, config]) => ({
        name,
        type: config.type,
        resourceCount: this.countModuleResources(config),
        variableCount: Object.keys(config.variables).length,
        outputCount: Object.keys(config.outputs).length
      })),
      topRecommendations: analysis.recommendations
        .filter(r => ['critical', 'high'].includes(r.priority))
        .slice(0, 5),
      analysisMetadata: analysis.metadata
    };

    return report;
  }
}

module.exports = EnterpriseRepositoryService;