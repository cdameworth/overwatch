const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { nanoid } = require('nanoid');

async function parseTerraformFromGitHub(terraformFiles) {
  const tempDir = path.join(__dirname, 'temp', nanoid());
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    
    const parsedFiles = [];
    
    for (const file of terraformFiles) {
      const tempFilePath = path.join(tempDir, file.name);
      await fs.writeFile(tempFilePath, file.content);
      
      try {
        const parsed = await parseHCLFile(tempFilePath);
        parsedFiles.push({
          fileName: file.name,
          filePath: file.path,
          sha: file.sha,
          parsed,
        });
      } catch (error) {
        console.error(`Error parsing ${file.name}:`, error);
        parsedFiles.push({
          fileName: file.name,
          filePath: file.path,
          sha: file.sha,
          error: error.message,
        });
      }
    }
    
    return parsedFiles;
  } finally {
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  }
}

function parseHCLFile(filePath) {
  return new Promise((resolve, reject) => {
    const hcl2json = spawn('hcl2json', [filePath]);
    let stdout = '';
    let stderr = '';

    hcl2json.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    hcl2json.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    hcl2json.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`hcl2json failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse JSON output: ${err.message}`));
      }
    });

    hcl2json.on('error', (err) => {
      reject(new Error(`Failed to spawn hcl2json: ${err.message}`));
    });
  });
}

async function parseMultipleTerraformFromGitHub(repositoryData) {
  const { files, repository } = repositoryData;
  
  if (!files || files.length === 0) {
    return [];
  }

  const parsedFiles = await parseTerraformFromGitHub(files);
  
  return parsedFiles.map((file, index) => ({
    id: `${repository.owner}-${repository.repo}-${index}`,
    name: `${repository.repo} - ${file.fileName}`,
    repository: repository,
    fileName: file.fileName,
    filePath: file.filePath,
    sha: file.sha,
    resources: file.parsed?.resource || {},
    error: file.error,
    syncedAt: new Date().toISOString(),
  }));
}

module.exports = {
  parseTerraformFromGitHub,
  parseMultipleTerraformFromGitHub,
};