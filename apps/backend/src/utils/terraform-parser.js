const fs = require('fs').promises;
const { exec } = require('child_process');

async function parseTerraform(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return await new Promise((resolve, reject) => {
      const child = exec('hcl2json', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error running hcl2json:`, error, stderr);
          return reject(error);
        }
        try {
          const json = JSON.parse(stdout);
          resolve(json);
        } catch (parseErr) {
          console.error('Failed to parse hcl2json output:', parseErr, stdout);
          reject(parseErr);
        }
      });
      child.stdin.write(raw);
      child.stdin.end();
    });
  } catch (error) {
    console.error(`Error parsing Terraform file at ${filePath}:`, error.message);
    throw error;
  }
}

// Merge resources from multiple parsed Terraform files
function mergeTerraformResources(parsedList) {
  const merged = { resource: {} };
  for (const parsed of parsedList) {
    if (!parsed.resource) continue;
    for (const [type, resources] of Object.entries(parsed.resource)) {
      if (!merged.resource[type]) merged.resource[type] = {};
      for (const [name, config] of Object.entries(resources)) {
        merged.resource[type][name] = config;
      }
    }
  }
  return merged;
}

// Parse multiple Terraform files and merge their resources
async function parseMultipleTerraform(filePaths) {
  const parsedList = await Promise.all(filePaths.map(parseTerraform));
  return mergeTerraformResources(parsedList);
}

module.exports = { parseTerraform, parseMultipleTerraform };
