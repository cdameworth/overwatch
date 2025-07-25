const fs = require('fs').promises;
const path = require('path');

/**
 * Environment Configuration Parser
 * Parses and merges Terraform variables with environment-specific values
 */
class EnvironmentConfigParser {
  constructor(gitHubService = null) {
    this.gitHubService = gitHubService;
    this.hclParser = require('./terraform-parser');
  }

  /**
   * Parse environment configuration for a specific environment
   */
  async parseEnvironmentConfig(owner, repo, branch, repoStructure, environment = 'prod') {
    try {
      const envConfig = {
        environment,
        variables: {},
        backendConfig: {},
        resolvedValues: {},
        modules: {}
      };

      // Parse global environment configuration
      if (repoStructure.globalConfig) {
        const globalEnvConfig = await this.parseGlobalEnvironmentConfig(
          owner, repo, branch, repoStructure.globalConfig, environment
        );
        Object.assign(envConfig, globalEnvConfig);
      }

      // Parse each module's configuration in context of environment
      for (const module of repoStructure.modules) {
        const moduleConfig = await this.parseModuleEnvironmentConfig(
          owner, repo, branch, module, envConfig
        );
        envConfig.modules[module.name] = moduleConfig;
      }

      return envConfig;
    } catch (error) {
      console.error('Environment config parsing failed:', error);
      throw error;
    }
  }

  /**
   * Parse global environment configuration files
   */
  async parseGlobalEnvironmentConfig(owner, repo, branch, globalConfig, environment) {
    try {
      const config = {
        variables: {},
        backendConfig: {},
        resolvedValues: {}
      };

      // Find environment-specific files
      const envConfig = globalConfig.environments[environment];
      if (!envConfig) {
        console.warn(`No configuration found for environment: ${environment}`);
        return config;
      }

      // Parse environment variables file
      if (envConfig.variablesFile) {
        const variablesPath = `${globalConfig.directory}/${envConfig.variablesFile}`;
        const variablesContent = await this.getFileContent(owner, repo, branch, variablesPath);
        config.variables = this.parseTerraformVars(variablesContent);
      }

      // Parse backend configuration
      if (envConfig.backendConfig) {
        const backendPath = `${globalConfig.directory}/${envConfig.backendConfig}`;
        const backendContent = await this.getFileContent(owner, repo, branch, backendPath);
        config.backendConfig = this.parseBackendConfig(backendContent);
      }

      return config;
    } catch (error) {
      console.error('Global environment config parsing failed:', error);
      return { variables: {}, backendConfig: {}, resolvedValues: {} };
    }
  }

  /**
   * Parse module configuration with environment context
   */
  async parseModuleEnvironmentConfig(owner, repo, branch, module, envConfig) {
    try {
      const moduleConfig = {
        name: module.name,
        type: module.type,
        variables: {},
        outputs: {},
        locals: {},
        dataResources: {},
        managedResources: {},
        resolvedVariables: {}
      };

      // Parse module variables definition
      if (module.files.variables) {
        const variablesPath = `${module.name}/${module.files.variables}`;
        const variablesContent = await this.getFileContent(owner, repo, branch, variablesPath);
        const parsedVars = await this.hclParser.parseHCLContent(variablesContent);
        moduleConfig.variables = this.extractVariableDefinitions(parsedVars);
      }

      // Parse module outputs
      if (module.files.outputs) {
        const outputsPath = `${module.name}/${module.files.outputs}`;
        const outputsContent = await this.getFileContent(owner, repo, branch, outputsPath);
        const parsedOutputs = await this.hclParser.parseHCLContent(outputsContent);
        moduleConfig.outputs = this.extractOutputDefinitions(parsedOutputs);
      }

      // Parse locals
      if (module.files.locals) {
        const localsPath = `${module.name}/${module.files.locals}`;
        const localsContent = await this.getFileContent(owner, repo, branch, localsPath);
        const parsedLocals = await this.hclParser.parseHCLContent(localsContent);
        moduleConfig.locals = this.extractLocalsDefinitions(parsedLocals);
      }

      // Parse data resources
      if (module.files.data) {
        const dataPath = `${module.name}/${module.files.data}`;
        const dataContent = await this.getFileContent(owner, repo, branch, dataPath);
        const parsedData = await this.hclParser.parseHCLContent(dataContent);
        moduleConfig.dataResources = this.extractDataResources(parsedData);
      }

      // Parse main resources
      if (module.files.main) {
        const mainPath = `${module.name}/${module.files.main}`;
        const mainContent = await this.getFileContent(owner, repo, branch, mainPath);
        const parsedMain = await this.hclParser.parseHCLContent(mainContent);
        moduleConfig.managedResources = this.extractManagedResources(parsedMain);
      }

      // Resolve variables with environment values
      moduleConfig.resolvedVariables = this.resolveModuleVariables(
        moduleConfig.variables,
        envConfig.variables,
        module.name
      );

      return moduleConfig;
    } catch (error) {
      console.error(`Module config parsing failed for ${module.name}:`, error);
      return { name: module.name, type: module.type };
    }
  }

  /**
   * Get file content from GitHub or local filesystem
   */
  async getFileContent(owner, repo, branch, filePath) {
    try {
      if (this.gitHubService) {
        const { data } = await this.gitHubService.octokit.rest.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: branch,
        });
        return Buffer.from(data.content, 'base64').toString('utf-8');
      } else {
        // Local file access fallback
        return await fs.readFile(filePath, 'utf-8');
      }
    } catch (error) {
      console.error(`Failed to get file content: ${filePath}`, error);
      return '';
    }
  }

  /**
   * Parse Terraform .tfvars file content
   */
  parseTerraformVars(content) {
    const variables = {};
    if (!content) return variables;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
        const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          variables[key] = this.parseVariableValue(value);
        }
      }
    }

    return variables;
  }

  /**
   * Parse backend configuration file
   */
  parseBackendConfig(content) {
    const config = {};
    if (!content) return config;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim().replace(/"/g, '');
        }
      }
    }

    return config;
  }

  /**
   * Parse variable value from tfvars
   */
  parseVariableValue(value) {
    const trimmed = value.trim();
    
    // Remove trailing comments
    const withoutComments = trimmed.replace(/\s*#.*$/, '').replace(/\s*\/\/.*$/, '');
    
    // Handle different value types
    if (withoutComments.startsWith('"') && withoutComments.endsWith('"')) {
      return withoutComments.slice(1, -1); // String
    } else if (withoutComments === 'true' || withoutComments === 'false') {
      return withoutComments === 'true'; // Boolean
    } else if (!isNaN(withoutComments)) {
      return Number(withoutComments); // Number
    } else if (withoutComments.startsWith('[') && withoutComments.endsWith(']')) {
      // Simple array parsing
      try {
        return JSON.parse(withoutComments.replace(/'/g, '"'));
      } catch {
        return withoutComments;
      }
    } else if (withoutComments.startsWith('{') && withoutComments.endsWith('}')) {
      // Simple object parsing
      try {
        return JSON.parse(withoutComments.replace(/'/g, '"'));
      } catch {
        return withoutComments;
      }
    }
    
    return withoutComments;
  }

  /**
   * Extract variable definitions from parsed HCL
   */
  extractVariableDefinitions(parsedHCL) {
    const variables = {};
    
    if (parsedHCL && parsedHCL.variable) {
      for (const [varName, varDef] of Object.entries(parsedHCL.variable)) {
        variables[varName] = {
          type: varDef.type || 'any',
          description: varDef.description || '',
          default: varDef.default,
          sensitive: varDef.sensitive || false,
          validation: varDef.validation || []
        };
      }
    }

    return variables;
  }

  /**
   * Extract output definitions from parsed HCL
   */
  extractOutputDefinitions(parsedHCL) {
    const outputs = {};
    
    if (parsedHCL && parsedHCL.output) {
      for (const [outputName, outputDef] of Object.entries(parsedHCL.output)) {
        outputs[outputName] = {
          value: outputDef.value,
          description: outputDef.description || '',
          sensitive: outputDef.sensitive || false
        };
      }
    }

    return outputs;
  }

  /**
   * Extract locals definitions from parsed HCL
   */
  extractLocalsDefinitions(parsedHCL) {
    const locals = {};
    
    if (parsedHCL && parsedHCL.locals) {
      // locals is typically an array of objects
      if (Array.isArray(parsedHCL.locals)) {
        for (const localsBlock of parsedHCL.locals) {
          Object.assign(locals, localsBlock);
        }
      } else {
        Object.assign(locals, parsedHCL.locals);
      }
    }

    return locals;
  }

  /**
   * Extract data resources from parsed HCL
   */
  extractDataResources(parsedHCL) {
    const dataResources = {};
    
    if (parsedHCL && parsedHCL.data) {
      for (const [dataType, resources] of Object.entries(parsedHCL.data)) {
        dataResources[dataType] = {};
        for (const [resourceName, resourceDef] of Object.entries(resources)) {
          dataResources[dataType][resourceName] = resourceDef;
        }
      }
    }

    return dataResources;
  }

  /**
   * Extract managed resources from parsed HCL
   */
  extractManagedResources(parsedHCL) {
    const managedResources = {};
    
    if (parsedHCL && parsedHCL.resource) {
      for (const [resourceType, resources] of Object.entries(parsedHCL.resource)) {
        managedResources[resourceType] = {};
        for (const [resourceName, resourceDef] of Object.entries(resources)) {
          managedResources[resourceType][resourceName] = resourceDef;
        }
      }
    }

    return managedResources;
  }

  /**
   * Resolve module variables with environment values
   */
  resolveModuleVariables(moduleVars, envVars, moduleName) {
    const resolved = {};
    
    for (const [varName, varDef] of Object.entries(moduleVars)) {
      // Check for module-specific environment variable
      const moduleSpecificVar = `${moduleName}_${varName}`;
      
      if (envVars[moduleSpecificVar] !== undefined) {
        resolved[varName] = envVars[moduleSpecificVar];
      } else if (envVars[varName] !== undefined) {
        resolved[varName] = envVars[varName];
      } else if (varDef.default !== undefined) {
        resolved[varName] = varDef.default;
      } else {
        resolved[varName] = null; // Required variable not set
      }
    }

    return resolved;
  }

  /**
   * Parse local environment configuration (for development)
   */
  async parseLocalEnvironmentConfig(repoPath, repoStructure, environment = 'prod') {
    try {
      this.gitHubService = null; // Disable GitHub service for local parsing
      
      const envConfig = {
        environment,
        variables: {},
        backendConfig: {},
        resolvedValues: {},
        modules: {}
      };

      // Parse global environment configuration
      if (repoStructure.globalConfig) {
        const globalEnvConfig = await this.parseLocalGlobalEnvironmentConfig(
          repoPath, repoStructure.globalConfig, environment
        );
        Object.assign(envConfig, globalEnvConfig);
      }

      // Parse each module's configuration
      for (const module of repoStructure.modules) {
        const moduleConfig = await this.parseLocalModuleEnvironmentConfig(
          repoPath, module, envConfig
        );
        envConfig.modules[module.name] = moduleConfig;
      }

      return envConfig;
    } catch (error) {
      console.error('Local environment config parsing failed:', error);
      throw error;
    }
  }

  /**
   * Parse local global environment configuration
   */
  async parseLocalGlobalEnvironmentConfig(repoPath, globalConfig, environment) {
    try {
      const config = {
        variables: {},
        backendConfig: {},
        resolvedValues: {}
      };

      const envConfig = globalConfig.environments[environment];
      if (!envConfig) return config;

      // Parse environment variables file
      if (envConfig.variablesFile) {
        const variablesPath = path.join(repoPath, globalConfig.directory, envConfig.variablesFile);
        try {
          const variablesContent = await fs.readFile(variablesPath, 'utf-8');
          config.variables = this.parseTerraformVars(variablesContent);
        } catch (error) {
          console.warn(`Could not read variables file: ${variablesPath}`);
        }
      }

      // Parse backend configuration
      if (envConfig.backendConfig) {
        const backendPath = path.join(repoPath, globalConfig.directory, envConfig.backendConfig);
        try {
          const backendContent = await fs.readFile(backendPath, 'utf-8');
          config.backendConfig = this.parseBackendConfig(backendContent);
        } catch (error) {
          console.warn(`Could not read backend config: ${backendPath}`);
        }
      }

      return config;
    } catch (error) {
      console.error('Local global environment config parsing failed:', error);
      return { variables: {}, backendConfig: {}, resolvedValues: {} };
    }
  }

  /**
   * Parse local module environment configuration
   */
  async parseLocalModuleEnvironmentConfig(repoPath, module, envConfig) {
    try {
      const moduleConfig = {
        name: module.name,
        type: module.type,
        variables: {},
        outputs: {},
        locals: {},
        dataResources: {},
        managedResources: {},
        resolvedVariables: {}
      };

      const modulePath = path.join(repoPath, module.name);

      // Parse each module file
      const fileTypes = ['variables', 'outputs', 'locals', 'data', 'main'];
      
      for (const fileType of fileTypes) {
        const fileName = module.files[fileType];
        if (fileName) {
          const filePath = path.join(modulePath, fileName);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = await this.hclParser.parseHCLContent(content);
            
            switch (fileType) {
              case 'variables':
                moduleConfig.variables = this.extractVariableDefinitions(parsed);
                break;
              case 'outputs':
                moduleConfig.outputs = this.extractOutputDefinitions(parsed);
                break;
              case 'locals':
                moduleConfig.locals = this.extractLocalsDefinitions(parsed);
                break;
              case 'data':
                moduleConfig.dataResources = this.extractDataResources(parsed);
                break;
              case 'main':
                moduleConfig.managedResources = this.extractManagedResources(parsed);
                break;
            }
          } catch (error) {
            console.warn(`Could not parse ${fileType} file for module ${module.name}: ${fileName}`);
          }
        }
      }

      // Resolve variables
      moduleConfig.resolvedVariables = this.resolveModuleVariables(
        moduleConfig.variables,
        envConfig.variables,
        module.name
      );

      return moduleConfig;
    } catch (error) {
      console.error(`Local module config parsing failed for ${module.name}:`, error);
      return { name: module.name, type: module.type };
    }
  }
}

module.exports = EnvironmentConfigParser;