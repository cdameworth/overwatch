/**
 * Cross-Module Dependency Resolver
 * Analyzes dependencies between Terraform modules and creates comprehensive dependency graphs
 */
class CrossModuleDependencyResolver {
  constructor() {
    this.dependencies = [];
    this.modules = new Map();
    this.outputReferences = new Map();
    this.dataSourceReferences = new Map();
  }

  /**
   * Resolve dependencies across all modules in a repository
   */
  resolveCrossModuleDependencies(repoStructure, environmentConfig) {
    try {
      this.reset();
      
      // Index all modules and their outputs/variables
      this.indexModules(environmentConfig.modules);
      
      // Analyze inter-module references
      this.analyzeOutputReferences(environmentConfig.modules);
      this.analyzeDataSourceReferences(environmentConfig.modules);
      this.analyzeVariableReferences(environmentConfig.modules);
      this.analyzeResourceReferences(environmentConfig.modules);
      
      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph();
      
      // Detect circular dependencies
      const circularDependencies = this.detectCircularDependencies(dependencyGraph);
      
      return {
        dependencies: this.dependencies,
        dependencyGraph,
        circularDependencies,
        moduleIndex: this.getModuleIndex(),
        statistics: this.getDependencyStatistics()
      };
    } catch (error) {
      console.error('Cross-module dependency resolution failed:', error);
      throw error;
    }
  }

  /**
   * Reset internal state
   */
  reset() {
    this.dependencies = [];
    this.modules.clear();
    this.outputReferences.clear();
    this.dataSourceReferences.clear();
  }

  /**
   * Index all modules for quick lookup
   */
  indexModules(modules) {
    for (const [moduleName, moduleConfig] of Object.entries(modules)) {
      this.modules.set(moduleName, {
        name: moduleName,
        type: moduleConfig.type,
        variables: moduleConfig.variables || {},
        outputs: moduleConfig.outputs || {},
        locals: moduleConfig.locals || {},
        dataResources: moduleConfig.dataResources || {},
        managedResources: moduleConfig.managedResources || {},
        resolvedVariables: moduleConfig.resolvedVariables || {}
      });
    }
  }

  /**
   * Analyze output references between modules
   */
  analyzeOutputReferences(modules) {
    for (const [moduleName, moduleConfig] of Object.entries(modules)) {
      // Look for references to other module outputs in variables, locals, and resources
      this.findOutputReferencesInVariables(moduleName, moduleConfig.resolvedVariables || {});
      this.findOutputReferencesInLocals(moduleName, moduleConfig.locals || {});
      this.findOutputReferencesInResources(moduleName, moduleConfig.managedResources || {});
    }
  }

  /**
   * Find output references in resolved variables
   */
  findOutputReferencesInVariables(currentModule, variables) {
    for (const [varName, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        const references = this.extractModuleReferences(value);
        for (const ref of references) {
          if (ref.module !== currentModule) {
            this.addDependency(currentModule, ref.module, 'variable_reference', {
              variable: varName,
              reference: ref.full,
              type: 'output'
            });
          }
        }
      }
    }
  }

  /**
   * Find output references in locals
   */
  findOutputReferencesInLocals(currentModule, locals) {
    for (const [localName, value] of Object.entries(locals)) {
      const references = this.extractModuleReferences(JSON.stringify(value));
      for (const ref of references) {
        if (ref.module !== currentModule) {
          this.addDependency(currentModule, ref.module, 'local_reference', {
            local: localName,
            reference: ref.full,
            type: 'output'
          });
        }
      }
    }
  }

  /**
   * Find output references in managed resources
   */
  findOutputReferencesInResources(currentModule, resources) {
    for (const [resourceType, resourceInstances] of Object.entries(resources)) {
      for (const [resourceName, resourceConfig] of Object.entries(resourceInstances)) {
        const references = this.extractModuleReferences(JSON.stringify(resourceConfig));
        for (const ref of references) {
          if (ref.module !== currentModule) {
            this.addDependency(currentModule, ref.module, 'resource_reference', {
              resource: `${resourceType}.${resourceName}`,
              reference: ref.full,
              type: 'output'
            });
          }
        }
      }
    }
  }

  /**
   * Analyze data source references
   */
  analyzeDataSourceReferences(modules) {
    for (const [moduleName, moduleConfig] of Object.entries(modules)) {
      const dataResources = moduleConfig.dataResources || {};
      
      for (const [dataType, dataInstances] of Object.entries(dataResources)) {
        for (const [dataName, dataConfig] of Object.entries(dataInstances)) {
          // Data sources that reference managed resources in other modules
          this.findDataSourceDependencies(moduleName, dataType, dataName, dataConfig);
        }
      }
    }
  }

  /**
   * Find data source dependencies
   */
  findDataSourceDependencies(currentModule, dataType, dataName, dataConfig) {
    // Look for references to managed resources that might be in other modules
    const configStr = JSON.stringify(dataConfig);
    const resourceReferences = this.extractResourceReferences(configStr);
    
    for (const ref of resourceReferences) {
      const targetModule = this.findModuleWithResource(ref.type, ref.name);
      if (targetModule && targetModule !== currentModule) {
        this.addDependency(currentModule, targetModule, 'data_source_dependency', {
          dataSource: `${dataType}.${dataName}`,
          targetResource: `${ref.type}.${ref.name}`,
          reference: ref.full
        });
      }
    }
  }

  /**
   * Analyze variable references
   */
  analyzeVariableReferences(modules) {
    for (const [moduleName, moduleConfig] of Object.entries(modules)) {
      const variables = moduleConfig.variables || {};
      
      // Check if variables reference outputs from other modules
      for (const [varName, varDef] of Object.entries(variables)) {
        if (varDef.default) {
          const references = this.extractModuleReferences(JSON.stringify(varDef.default));
          for (const ref of references) {
            if (ref.module !== moduleName) {
              this.addDependency(moduleName, ref.module, 'variable_default_reference', {
                variable: varName,
                reference: ref.full
              });
            }
          }
        }
      }
    }
  }

  /**
   * Analyze direct resource references
   */
  analyzeResourceReferences(modules) {
    for (const [moduleName, moduleConfig] of Object.entries(modules)) {
      const managedResources = moduleConfig.managedResources || {};
      
      for (const [resourceType, resourceInstances] of Object.entries(managedResources)) {
        for (const [resourceName, resourceConfig] of Object.entries(resourceInstances)) {
          // Check depends_on explicitly
          if (resourceConfig.depends_on) {
            const dependsOn = Array.isArray(resourceConfig.depends_on) ? 
              resourceConfig.depends_on : [resourceConfig.depends_on];
            
            for (const dependency of dependsOn) {
              const targetModule = this.findModuleWithResource(dependency);
              if (targetModule && targetModule !== moduleName) {
                this.addDependency(moduleName, targetModule, 'explicit_dependency', {
                  resource: `${resourceType}.${resourceName}`,
                  dependsOn: dependency
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Extract module references from text (e.g., module.vpc.vpc_id)
   */
  extractModuleReferences(text) {
    const references = [];
    const moduleRefPattern = /module\.([a-zA-Z_][a-zA-Z0-9_-]*?)\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    
    while ((match = moduleRefPattern.exec(text)) !== null) {
      references.push({
        full: match[0],
        module: match[1],
        output: match[2]
      });
    }
    
    return references;
  }

  /**
   * Extract resource references from text
   */
  extractResourceReferences(text) {
    const references = [];
    const resourceRefPattern = /(aws_[a-zA-Z_]+)\.([a-zA-Z0-9_-]+)/g;
    let match;
    
    while ((match = resourceRefPattern.exec(text)) !== null) {
      references.push({
        full: match[0],
        type: match[1],
        name: match[2]
      });
    }
    
    return references;
  }

  /**
   * Find which module contains a specific resource
   */
  findModuleWithResource(resourceType, resourceName = null) {
    for (const [moduleName, moduleConfig] of this.modules.entries()) {
      const managedResources = moduleConfig.managedResources || {};
      
      if (resourceName) {
        // Looking for specific resource instance
        if (managedResources[resourceType] && managedResources[resourceType][resourceName]) {
          return moduleName;
        }
      } else {
        // Looking for resource type (when resourceType includes name)
        const parts = resourceType.split('.');
        if (parts.length === 2) {
          const [type, name] = parts;
          if (managedResources[type] && managedResources[type][name]) {
            return moduleName;
          }
        } else {
          // Just resource type
          if (managedResources[resourceType]) {
            return moduleName;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Add a dependency relationship
   */
  addDependency(fromModule, toModule, type, metadata = {}) {
    // Avoid duplicate dependencies
    const existing = this.dependencies.find(dep => 
      dep.from === fromModule && 
      dep.to === toModule && 
      dep.type === type &&
      JSON.stringify(dep.metadata) === JSON.stringify(metadata)
    );
    
    if (!existing) {
      this.dependencies.push({
        from: fromModule,
        to: toModule,
        type,
        metadata
      });
    }
  }

  /**
   * Build dependency graph structure
   */
  buildDependencyGraph() {
    const graph = {
      nodes: Array.from(this.modules.keys()).map(moduleName => ({
        id: moduleName,
        type: this.modules.get(moduleName).type,
        label: moduleName
      })),
      edges: this.dependencies.map(dep => ({
        source: dep.from,
        target: dep.to,
        type: dep.type,
        metadata: dep.metadata
      }))
    };
    
    return graph;
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies(dependencyGraph) {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];
    
    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).concat([node]));
        return;
      }
      
      if (visited.has(node)) {
        return;
      }
      
      visited.add(node);
      recursionStack.add(node);
      
      // Find all outgoing edges from this node
      const outgoingEdges = dependencyGraph.edges.filter(edge => edge.source === node);
      
      for (const edge of outgoingEdges) {
        dfs(edge.target, path.concat([node]));
      }
      
      recursionStack.delete(node);
    };
    
    // Check each node
    for (const node of dependencyGraph.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }
    
    return cycles;
  }

  /**
   * Get module index for quick lookup
   */
  getModuleIndex() {
    const index = {};
    
    for (const [moduleName, moduleConfig] of this.modules.entries()) {
      index[moduleName] = {
        type: moduleConfig.type,
        outputsCount: Object.keys(moduleConfig.outputs).length,
        variablesCount: Object.keys(moduleConfig.variables).length,
        resourcesCount: Object.values(moduleConfig.managedResources)
          .reduce((sum, resources) => sum + Object.keys(resources).length, 0),
        dataSourcesCount: Object.values(moduleConfig.dataResources)
          .reduce((sum, resources) => sum + Object.keys(resources).length, 0)
      };
    }
    
    return index;
  }

  /**
   * Get dependency statistics
   */
  getDependencyStatistics() {
    const stats = {
      totalDependencies: this.dependencies.length,
      dependencyTypes: {},
      moduleDependencyCounts: {},
      mostDependendModules: [],
      isolatedModules: []
    };
    
    // Count dependency types
    for (const dep of this.dependencies) {
      stats.dependencyTypes[dep.type] = (stats.dependencyTypes[dep.type] || 0) + 1;
    }
    
    // Count dependencies per module
    for (const moduleName of this.modules.keys()) {
      const outgoing = this.dependencies.filter(dep => dep.from === moduleName).length;
      const incoming = this.dependencies.filter(dep => dep.to === moduleName).length;
      
      stats.moduleDependencyCounts[moduleName] = {
        outgoing,
        incoming,
        total: outgoing + incoming
      };
      
      if (outgoing === 0 && incoming === 0) {
        stats.isolatedModules.push(moduleName);
      }
    }
    
    // Find most dependent modules
    stats.mostDependendModules = Object.entries(stats.moduleDependencyCounts)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([module, counts]) => ({ module, ...counts }));
    
    return stats;
  }

  /**
   * Generate dependency report
   */
  generateDependencyReport(repoStructure, environmentConfig, dependencies) {
    const report = {
      summary: {
        repository: repoStructure.metadata,
        environment: environmentConfig.environment,
        moduleCount: Object.keys(environmentConfig.modules).length,
        dependencyCount: dependencies.dependencies.length,
        circularDependencies: dependencies.circularDependencies.length > 0
      },
      modules: dependencies.moduleIndex,
      dependencies: dependencies.dependencies,
      statistics: dependencies.statistics,
      circularDependencies: dependencies.circularDependencies,
      recommendations: this.generateRecommendations(dependencies)
    };
    
    return report;
  }

  /**
   * Generate recommendations based on dependency analysis
   */
  generateRecommendations(dependencies) {
    const recommendations = [];
    
    // Check for circular dependencies
    if (dependencies.circularDependencies.length > 0) {
      recommendations.push({
        type: 'error',
        title: 'Circular Dependencies Detected',
        description: `Found ${dependencies.circularDependencies.length} circular dependencies that could cause Terraform plan/apply issues.`,
        actions: ['Review module dependencies', 'Consider breaking circular references with data sources']
      });
    }
    
    // Check for isolated modules
    if (dependencies.statistics.isolatedModules.length > 0) {
      recommendations.push({
        type: 'info',
        title: 'Isolated Modules',
        description: `${dependencies.statistics.isolatedModules.length} modules have no dependencies. This might be intentional or indicate missing connections.`,
        modules: dependencies.statistics.isolatedModules
      });
    }
    
    // Check for highly coupled modules
    const highlyCoupled = dependencies.statistics.mostDependendModules.filter(m => m.total > 5);
    if (highlyCoupled.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Highly Coupled Modules',
        description: 'Some modules have many dependencies, which could make them harder to maintain.',
        modules: highlyCoupled.map(m => m.module)
      });
    }
    
    return recommendations;
  }
}

module.exports = CrossModuleDependencyResolver;