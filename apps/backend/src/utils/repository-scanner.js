const path = require('path');
const fs = require('fs').promises;

/**
 * Repository Scanner Service
 * Discovers and analyzes enterprise IaC repository structures
 */
class RepositoryScanner {
  constructor(gitHubService = null) {
    this.gitHubService = gitHubService;
  }

  /**
   * Scan repository structure and identify all modules
   */
  async scanRepository(owner, repo, branch = 'main') {
    try {
      const repoStructure = {
        modules: [],
        environments: [],
        globalConfig: null,
        metadata: {
          scannedAt: new Date().toISOString(),
          owner,
          repo,
          branch
        }
      };

      // Get repository root contents
      const rootContents = await this.gitHubService.getDirectoryContents(owner, repo, '', branch);
      
      // Identify module directories (iac-* pattern)
      const moduleDirectories = rootContents
        .filter(item => item.type === 'dir' && item.name.startsWith('iac'))
        .map(item => item.name);

      // Scan each module
      for (const moduleDir of moduleDirectories) {
        const moduleInfo = await this.scanModule(owner, repo, moduleDir, branch);
        if (moduleInfo) {
          repoStructure.modules.push(moduleInfo);
        }
      }

      // Identify global configuration
      const globalConfigDir = rootContents.find(item => 
        item.type === 'dir' && (item.name === 'config' || item.name === 'global-config')
      );

      if (globalConfigDir) {
        repoStructure.globalConfig = await this.scanGlobalConfig(owner, repo, globalConfigDir.name, branch);
      }

      // Extract environment information from config
      if (repoStructure.globalConfig) {
        repoStructure.environments = this.extractEnvironments(repoStructure.globalConfig);
      }

      return repoStructure;
    } catch (error) {
      console.error('Repository scan failed:', error);
      throw error;
    }
  }

  /**
   * Scan individual module structure
   */
  async scanModule(owner, repo, moduleDir, branch) {
    try {
      const moduleContents = await this.gitHubService.getDirectoryContents(owner, repo, moduleDir, branch);
      
      const module = {
        name: moduleDir,
        type: this.inferModuleType(moduleDir),
        files: {
          main: null,
          variables: null,
          outputs: null,
          data: null,
          locals: null,
          provider: null,
          versions: null,
          discovery: null,
          other: []
        },
        hasConfig: false,
        configFiles: [],
        subModules: []
      };

      // Identify terraform files
      for (const file of moduleContents) {
        if (file.type === 'file' && file.name.endsWith('.tf')) {
          this.categorizeTerrformFile(file.name, module.files);
        } else if (file.type === 'file' && (file.name.endsWith('.tfvars') || file.name.includes('backend.config'))) {
          module.configFiles.push(file.name);
          module.hasConfig = true;
        } else if (file.type === 'dir' && file.name === 'modules') {
          // Nested modules
          const subModules = await this.gitHubService.getDirectoryContents(owner, repo, `${moduleDir}/modules`, branch);
          module.subModules = subModules.filter(item => item.type === 'dir').map(item => item.name);
        }
      }

      return module;
    } catch (error) {
      console.error(`Failed to scan module ${moduleDir}:`, error);
      return null;
    }
  }

  /**
   * Scan global configuration directory
   */
  async scanGlobalConfig(owner, repo, configDir, branch) {
    try {
      const configContents = await this.gitHubService.getDirectoryContents(owner, repo, configDir, branch);
      
      const config = {
        directory: configDir,
        environments: {},
        observability: null,
        backendConfigs: [],
        sharedVariables: []
      };

      for (const file of configContents) {
        if (file.type === 'file') {
          if (file.name.endsWith('.auto.tfvars')) {
            // Environment-specific variables
            const env = file.name.replace('.auto.tfvars', '');
            config.environments[env] = {
              variablesFile: file.name,
              backendConfig: null
            };
          } else if (file.name.includes('backend.config')) {
            config.backendConfigs.push(file.name);
            // Match backend config to environment
            const env = file.name.split('_')[0];
            if (config.environments[env]) {
              config.environments[env].backendConfig = file.name;
            }
          }
        } else if (file.type === 'dir' && file.name.includes('observability')) {
          config.observability = file.name;
        }
      }

      return config;
    } catch (error) {
      console.error(`Failed to scan global config ${configDir}:`, error);
      return null;
    }
  }

  /**
   * Categorize terraform files by their purpose
   */
  categorizeTerrformFile(filename, files) {
    const basename = filename.replace('.tf', '');
    
    switch (basename) {
      case 'main':
        files.main = filename;
        break;
      case 'variables':
        files.variables = filename;
        break;
      case 'outputs':
        files.outputs = filename;
        break;
      case 'data':
        files.data = filename;
        break;
      case 'locals':
        files.locals = filename;
        break;
      case 'provider':
      case 'providers':
        files.provider = filename;
        break;
      case 'versions':
        files.versions = filename;
        break;
      case 'discovery':
        files.discovery = filename;
        break;
      default:
        files.other.push(filename);
    }
  }

  /**
   * Infer module type from directory name
   */
  inferModuleType(moduleDir) {
    const name = moduleDir.toLowerCase();
    
    if (name.includes('rds') || name.includes('database')) return 'database';
    if (name.includes('s3') || name.includes('storage')) return 'storage';
    if (name.includes('lambda') || name.includes('function')) return 'compute';
    if (name.includes('vpc') || name.includes('network')) return 'networking';
    if (name.includes('iam') || name.includes('security')) return 'security';
    if (name.includes('monitoring') || name.includes('observability')) return 'monitoring';
    if (name.includes('api') || name.includes('gateway')) return 'api';
    if (name.includes('queue') || name.includes('sns') || name.includes('sqs')) return 'messaging';
    if (name.includes('cdn') || name.includes('cloudfront')) return 'cdn';
    if (name.includes('load') || name.includes('alb') || name.includes('elb')) return 'load-balancer';
    
    return 'infrastructure';
  }

  /**
   * Extract environment information from global config
   */
  extractEnvironments(globalConfig) {
    if (!globalConfig || !globalConfig.environments) return [];
    
    return Object.keys(globalConfig.environments).map(envName => ({
      name: envName,
      isProd: envName.toLowerCase().includes('prod'),
      isDev: envName.toLowerCase().includes('dev'),
      isStaging: envName.toLowerCase().includes('staging') || envName.toLowerCase().includes('stg'),
      variablesFile: globalConfig.environments[envName].variablesFile,
      backendConfig: globalConfig.environments[envName].backendConfig
    }));
  }

  /**
   * Scan local repository (for development/testing)
   */
  async scanLocalRepository(repoPath) {
    try {
      const repoStructure = {
        modules: [],
        environments: [],
        globalConfig: null,
        metadata: {
          scannedAt: new Date().toISOString(),
          path: repoPath,
          type: 'local'
        }
      };

      const rootContents = await fs.readdir(repoPath, { withFileTypes: true });
      
      // Find module directories
      const moduleDirectories = rootContents
        .filter(item => item.isDirectory() && item.name.startsWith('iac'))
        .map(item => item.name);

      // Scan each module
      for (const moduleDir of moduleDirectories) {
        const moduleInfo = await this.scanLocalModule(path.join(repoPath, moduleDir));
        if (moduleInfo) {
          repoStructure.modules.push(moduleInfo);
        }
      }

      // Find global config
      const configDir = rootContents.find(item => 
        item.isDirectory() && (item.name === 'config' || item.name === 'global-config')
      );

      if (configDir) {
        repoStructure.globalConfig = await this.scanLocalGlobalConfig(path.join(repoPath, configDir.name));
      }

      if (repoStructure.globalConfig) {
        repoStructure.environments = this.extractEnvironments(repoStructure.globalConfig);
      }

      return repoStructure;
    } catch (error) {
      console.error('Local repository scan failed:', error);
      throw error;
    }
  }

  /**
   * Scan local module directory
   */
  async scanLocalModule(modulePath) {
    try {
      const moduleContents = await fs.readdir(modulePath, { withFileTypes: true });
      const moduleDir = path.basename(modulePath);
      
      const module = {
        name: moduleDir,
        type: this.inferModuleType(moduleDir),
        files: {
          main: null,
          variables: null,
          outputs: null,
          data: null,
          locals: null,
          provider: null,
          versions: null,
          discovery: null,
          other: []
        },
        hasConfig: false,
        configFiles: [],
        subModules: []
      };

      for (const file of moduleContents) {
        if (file.isFile() && file.name.endsWith('.tf')) {
          this.categorizeTerrformFile(file.name, module.files);
        } else if (file.isFile() && (file.name.endsWith('.tfvars') || file.name.includes('backend.config'))) {
          module.configFiles.push(file.name);
          module.hasConfig = true;
        } else if (file.isDirectory() && file.name === 'modules') {
          const subModulesPath = path.join(modulePath, 'modules');
          const subModules = await fs.readdir(subModulesPath, { withFileTypes: true });
          module.subModules = subModules.filter(item => item.isDirectory()).map(item => item.name);
        }
      }

      return module;
    } catch (error) {
      console.error(`Failed to scan local module ${modulePath}:`, error);
      return null;
    }
  }

  /**
   * Scan local global config directory
   */
  async scanLocalGlobalConfig(configPath) {
    try {
      const configContents = await fs.readdir(configPath, { withFileTypes: true });
      
      const config = {
        directory: path.basename(configPath),
        environments: {},
        observability: null,
        backendConfigs: [],
        sharedVariables: []
      };

      for (const file of configContents) {
        if (file.isFile()) {
          if (file.name.endsWith('.auto.tfvars')) {
            const env = file.name.replace('.auto.tfvars', '');
            config.environments[env] = {
              variablesFile: file.name,
              backendConfig: null
            };
          } else if (file.name.includes('backend.config')) {
            config.backendConfigs.push(file.name);
            const env = file.name.split('_')[0];
            if (config.environments[env]) {
              config.environments[env].backendConfig = file.name;
            }
          }
        } else if (file.isDirectory() && file.name.includes('observability')) {
          config.observability = file.name;
        }
      }

      return config;
    } catch (error) {
      console.error(`Failed to scan local global config ${configPath}:`, error);
      return null;
    }
  }
}

module.exports = RepositoryScanner;