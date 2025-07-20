const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

class GitHubService {
  constructor(accessToken) {
    this.octokit = new Octokit({
      auth: accessToken,
    });
  }

  async getRepositories(userId) {
    try {
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        sort: 'updated',
        per_page: 100,
      });
      
      return data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        description: repo.description,
        updatedAt: repo.updated_at,
        defaultBranch: repo.default_branch,
      }));
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw new Error('Failed to fetch repositories from GitHub');
    }
  }

  async getTerraformFiles(owner, repo, branch = 'main') {
    try {
      const terraformFiles = [];
      await this._searchTerraformFiles(owner, repo, branch, '', terraformFiles);
      return terraformFiles;
    } catch (error) {
      console.error('Error fetching Terraform files:', error);
      throw new Error('Failed to fetch Terraform files from repository');
    }
  }

  async _searchTerraformFiles(owner, repo, branch, path, files) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      for (const item of Array.isArray(data) ? data : [data]) {
        if (item.type === 'file' && item.name.endsWith('.tf')) {
          const content = await this.getFileContent(owner, repo, item.path, branch);
          files.push({
            path: item.path,
            name: item.name,
            content,
            sha: item.sha,
          });
        } else if (item.type === 'dir' && !item.name.startsWith('.')) {
          await this._searchTerraformFiles(owner, repo, branch, item.path, files);
        }
      }
    } catch (error) {
      if (error.status === 404) {
        return;
      }
      throw error;
    }
  }

  async getFileContent(owner, repo, filePath, branch = 'main') {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch,
      });

      if (data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      throw new Error('File content not found');
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw new Error('Failed to fetch file content from GitHub');
    }
  }

  async syncRepository(userId, owner, repo, branch = 'main') {
    try {
      const terraformFiles = await this.getTerraformFiles(owner, repo, branch);
      
      if (terraformFiles.length === 0) {
        return {
          success: false,
          message: 'No Terraform files found in repository',
        };
      }

      return {
        success: true,
        files: terraformFiles,
        repository: { owner, repo, branch },
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error syncing repository:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getRepositoryInfo(owner, repo) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        private: data.private,
        defaultBranch: data.default_branch,
        updatedAt: data.updated_at,
        language: data.language,
        topics: data.topics,
      };
    } catch (error) {
      console.error('Error fetching repository info:', error);
      throw new Error('Failed to fetch repository information');
    }
  }
}

module.exports = GitHubService;