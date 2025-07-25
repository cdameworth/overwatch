const { test, expect } = require('@playwright/test');

test.describe('GitHub Repository Data Source', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor network requests for debugging
    page.on('response', response => {
      if (!response.ok() && response.url().includes('api')) {
        console.log(`❌ API Error: ${response.status()} ${response.url()}`);
      }
    });

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console Error: ${msg.text()}`);
      }
    });

    // Navigate to the application (use the actual running frontend port)
    await page.goto('http://127.0.0.1:51254');
    
    // Wait for the application to load
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('#data-source-selector')).toBeVisible();
  });

  test('should load GitHub connections when GitHub Repository is selected', async ({ page }) => {
    // Select GitHub Repository from data source dropdown
    await page.selectOption('#data-source-selector', 'github');
    
    // Wait for GitHub config section to appear
    await expect(page.locator('#github-config')).toBeVisible();
    
    // Check that connections dropdown is visible
    await expect(page.locator('#github-connection')).toBeVisible();
    
    // Wait for connections to load (should change from "Loading connections...")
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-connection');
      return select && select.options.length > 1 && 
             !select.options[0].textContent.includes('Loading connections');
    }, { timeout: 10000 });
    
    // Verify connections are loaded
    const connectionOptions = await page.locator('#github-connection option').allTextContents();
    expect(connectionOptions.length).toBeGreaterThan(1);
    expect(connectionOptions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Personal Account (cdameworth)'),
        expect.stringContaining('Terraform Examples'),
        expect.stringContaining('HashiCorp Examples')
      ])
    );
  });

  test('should show repositories when a connection is selected', async ({ page }) => {
    // Select GitHub Repository data source
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    
    // Wait for connections to load
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-connection');
      return select && select.options.length > 1;
    }, { timeout: 10000 });
    
    // Select a connection (Personal Account)
    await page.selectOption('#github-connection', 'cdameworth-personal');
    
    // Wait for repository row to appear
    await expect(page.locator('#github-repo-row')).toBeVisible();
    
    // Check that repository dropdown is populated
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-repo-select');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    
    // Verify repositories are loaded
    const repoOptions = await page.locator('#github-repo-select option').allTextContents();
    expect(repoOptions.length).toBeGreaterThan(1);
    expect(repoOptions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('stock-analytics-engine')
      ])
    );
  });

  test('should show branch input and load button when repository is selected', async ({ page }) => {
    // Navigate through the selection process
    await page.selectOption('#data-source-selector', 'github');
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-connection');
      return select && select.options.length > 1;
    }, { timeout: 10000 });
    
    await page.selectOption('#github-connection', 'cdameworth-personal');
    await expect(page.locator('#github-repo-row')).toBeVisible();
    
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-repo-select');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    
    // Select a repository
    await page.selectOption('#github-repo-select', 'stock-analytics-engine');
    
    // Branch row should appear
    await expect(page.locator('#github-branch-row')).toBeVisible();
    
    // Branch input should have default value
    const branchValue = await page.inputValue('#github-branch');
    expect(branchValue).toBe('main');
    
    // Load button should be visible
    await expect(page.locator('#load-github-repo')).toBeVisible();
  });

  test('should successfully load repository data and display graph', async ({ page }) => {
    // Complete the selection process
    await page.selectOption('#data-source-selector', 'github');
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-connection');
      return select && select.options.length > 1;
    }, { timeout: 10000 });
    
    await page.selectOption('#github-connection', 'cdameworth-personal');
    await expect(page.locator('#github-repo-row')).toBeVisible();
    
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-repo-select');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    
    await page.selectOption('#github-repo-select', 'stock-analytics-engine');
    await expect(page.locator('#load-github-repo')).toBeVisible();
    
    // Click load repository button
    await page.click('#load-github-repo');
    
    // Wait for loading to start and finish
    await expect(page.locator('#loading-overlay')).toBeVisible();
    await expect(page.locator('#loading-overlay')).toBeHidden({ timeout: 30000 });
    
    // Check that graph content is loaded
    await expect(page.locator('#graph svg')).toBeVisible();
    
    // Check for resource count update (should be > 0)
    await page.waitForFunction(() => {
      const resourceCount = document.querySelector('#resource-count');
      return resourceCount && !resourceCount.textContent.includes('0 resources');
    }, { timeout: 5000 });
    
    // Verify success toast appears
    await expect(page.locator('.toast.toast-success')).toBeVisible({ timeout: 10000 });
    
    // Check that nodes are rendered in the graph
    const nodes = page.locator('#graph .node-group');
    await expect(nodes.first()).toBeVisible();
    
    // Verify that we have multiple nodes (stock-analytics-engine has many resources)
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThan(10);
  });

  test('should handle manual GitHub entry toggle', async ({ page }) => {
    // Select GitHub Repository data source
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    
    // Manual config should be hidden initially
    await expect(page.locator('#manual-github-config')).toBeHidden();
    
    // Click toggle manual entry button
    await page.click('#toggle-manual-github');
    
    // Manual config should now be visible
    await expect(page.locator('#manual-github-config')).toBeVisible();
    
    // Check manual input fields are present
    await expect(page.locator('#github-owner')).toBeVisible();
    await expect(page.locator('#github-repo')).toBeVisible();
    await expect(page.locator('#github-branch-manual')).toBeVisible();
    await expect(page.locator('#load-github-repo-manual')).toBeVisible();
    
    // Toggle again to hide
    await page.click('#toggle-manual-github');
    await expect(page.locator('#manual-github-config')).toBeHidden();
  });

  test('should load repository using manual entry', async ({ page }) => {
    // Select GitHub Repository data source
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    
    // Open manual entry
    await page.click('#toggle-manual-github');
    await expect(page.locator('#manual-github-config')).toBeVisible();
    
    // Fill in manual fields
    await page.fill('#github-owner', 'terraform-aws-modules');
    await page.fill('#github-repo', 'terraform-aws-lambda');
    await page.fill('#github-branch-manual', 'master');
    
    // Click manual load button
    await page.click('#load-github-repo-manual');
    
    // Wait for loading to complete
    await expect(page.locator('#loading-overlay')).toBeVisible();
    await expect(page.locator('#loading-overlay')).toBeHidden({ timeout: 30000 });
    
    // Verify success
    await expect(page.locator('.toast.toast-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#graph svg')).toBeVisible();
    
    // Check that nodes are rendered
    const nodes = page.locator('#graph .node-group');
    await expect(nodes.first()).toBeVisible();
  });

  test('should handle connection loading errors gracefully', async ({ page }) => {
    // Mock network failure for connections API
    await page.route('**/api/github/connections', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    // Select GitHub Repository data source
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    
    // Wait for error state
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-connection');
      return select && select.options[0].textContent.includes('Error loading connections');
    }, { timeout: 10000 });
    
    // Verify error toast appears
    await expect(page.locator('.toast.toast-error')).toBeVisible({ timeout: 10000 });
  });

  test('should handle repository loading errors gracefully', async ({ page }) => {
    // Select GitHub Repository data source
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    
    // Open manual entry to avoid connection dependencies
    await page.click('#toggle-manual-github');
    await expect(page.locator('#manual-github-config')).toBeVisible();
    
    // Mock network failure for repository parsing
    await page.route('**/api/parse-github', route => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Repository not found' })
      });
    });
    
    // Fill in manual fields with invalid repo
    await page.fill('#github-owner', 'nonexistent');
    await page.fill('#github-repo', 'repository');
    await page.fill('#github-branch-manual', 'main');
    
    // Click manual load button
    await page.click('#load-github-repo-manual');
    
    // Wait for loading to complete
    await expect(page.locator('#loading-overlay')).toBeVisible();
    await expect(page.locator('#loading-overlay')).toBeHidden({ timeout: 30000 });
    
    // Verify error toast appears
    await expect(page.locator('.toast.toast-error')).toBeVisible({ timeout: 10000 });
    
    // Verify error message content
    const errorToast = page.locator('.toast.toast-error');
    await expect(errorToast).toContainText('Failed to load repository');
  });

  test('should validate required fields in manual entry', async ({ page }) => {
    // Select GitHub Repository data source
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    
    // Open manual entry
    await page.click('#toggle-manual-github');
    await expect(page.locator('#manual-github-config')).toBeVisible();
    
    // Try to load without filling required fields
    await page.click('#load-github-repo-manual');
    
    // Verify validation error appears
    await expect(page.locator('.toast.toast-error')).toBeVisible({ timeout: 5000 });
    const errorToast = page.locator('.toast.toast-error');
    await expect(errorToast).toContainText('Please enter both owner and repository name');
  });

  test('should reset UI state when switching data sources', async ({ page }) => {
    // Select GitHub Repository data source and make selections
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-connection');
      return select && select.options.length > 1;
    }, { timeout: 10000 });
    
    await page.selectOption('#github-connection', 'cdameworth-personal');
    await expect(page.locator('#github-repo-row')).toBeVisible();
    
    // Switch back to local data source
    await page.selectOption('#data-source-selector', 'local');
    
    // GitHub config should be hidden
    await expect(page.locator('#github-config')).toBeHidden();
    
    // Switch back to GitHub
    await page.selectOption('#data-source-selector', 'github');
    await expect(page.locator('#github-config')).toBeVisible();
    
    // State should be reset - repository row should be hidden
    await expect(page.locator('#github-repo-row')).toBeHidden();
    await expect(page.locator('#github-branch-row')).toBeHidden();
    await expect(page.locator('#load-github-repo')).toBeHidden();
  });
});

// Additional test for performance and stability
test.describe('GitHub Repository Data Source - Performance', () => {
  test('should load connections within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://127.0.0.1:51254');
    await page.selectOption('#data-source-selector', 'github');
    
    // Wait for connections to load
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-connection');
      return select && select.options.length > 1 && 
             !select.options[0].textContent.includes('Loading connections');
    }, { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Connections should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`GitHub connections loaded in ${loadTime}ms`);
  });

  test('should handle rapid connection changes without errors', async ({ page }) => {
    await page.goto('http://127.0.0.1:51254');
    await page.selectOption('#data-source-selector', 'github');
    
    await page.waitForFunction(() => {
      const select = document.querySelector('#github-connection');
      return select && select.options.length > 1;
    }, { timeout: 10000 });
    
    // Rapidly change connections
    await page.selectOption('#github-connection', 'cdameworth-personal');
    await page.selectOption('#github-connection', 'terraform-examples');
    await page.selectOption('#github-connection', 'hashicorp-examples');
    await page.selectOption('#github-connection', 'cdameworth-personal');
    
    // Should end up with repositories visible
    await expect(page.locator('#github-repo-row')).toBeVisible();
    
    // No error toasts should appear
    await expect(page.locator('.toast.toast-error')).not.toBeVisible();
  });
});