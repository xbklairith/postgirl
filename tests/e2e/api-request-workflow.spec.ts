import { test, expect } from '@playwright/test';

test.describe('API Request Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });
    
    // Wait for workspace to be initialized
    await page.waitForLoadState('networkidle');
    
    // Navigate to workspaces if no active workspace
    const noWorkspaceText = page.locator('text=No Active Workspace');
    if (await noWorkspaceText.isVisible()) {
      await page.click('text=Go to Workspaces');
      await page.waitForSelector('[data-testid="create-workspace-button"]', { timeout: 10000 });
      
      // Create a test workspace
      await page.click('[data-testid="create-workspace-button"]');
      await page.waitForSelector('text=Skip Git (Local Only)', { timeout: 5000 });
      await page.click('text=Skip Git (Local Only)');
      
      // Wait for the form to appear
      await page.waitForSelector('[data-testid="workspace-name-input"]', { timeout: 5000 });
      await page.fill('[data-testid="workspace-name-input"]', 'E2E Test Workspace');
      
      // Click create and wait for completion
      await page.click('text=Create Workspace');
      
      // Wait for workspace creation to complete
      await page.waitForSelector('text=E2E Test Workspace', { timeout: 10000 });
      
      // Force modal close if it's still blocking
      await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (modal) {
          modal.remove();
        }
      });
      
      // Wait a moment for UI to stabilize
      await page.waitForTimeout(500);
      
      // Ensure we're in the workspaces view and the workspace exists
      await expect(page.locator('text=E2E Test Workspace')).toBeVisible();
      
      // Switch to API testing view
      await page.click('button:has-text("API Testing")');
      await page.waitForSelector('[data-testid="api-testing-container"]', { timeout: 5000 });
    }
    
    // Ensure we have a collection set up
    const createCollectionButton = page.locator('[data-testid="create-collection-button"]');
    if (await createCollectionButton.isVisible()) {
      await createCollectionButton.click();
      await page.fill('[data-testid="collection-name-input"]', 'E2E API Tests');
      await page.keyboard.press('Enter');
      await page.waitForSelector('text=E2E API Tests');
    }
  });

  test('should create and execute a GET request', async ({ page }) => {
    // Create new request
    await page.click('[data-testid="new-request-button"]');
    
    // Should open new request tab
    await expect(page.locator('[data-testid="request-tab"]')).toBeVisible();
    
    // Configure GET request
    await page.selectOption('[data-testid="http-method-select"]', 'GET');
    await page.fill('[data-testid="url-input"]', 'https://jsonplaceholder.typicode.com/posts/1');
    
    // Add headers
    await page.click('[data-testid="headers-tab"]');
    await page.click('[data-testid="add-header-button"]');
    await page.fill('[data-testid="header-key-input"]:last-child', 'Accept');
    await page.fill('[data-testid="header-value-input"]:last-child', 'application/json');
    
    // Execute request
    await page.click('[data-testid="send-request-button"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="request-loading"]')).toBeVisible();
    
    // Should show response
    await expect(page.locator('[data-testid="response-status"]')).toHaveText('200');
    await expect(page.locator('[data-testid="response-body"]')).toContainText('userId');
    
    // Should show response timing
    await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
  });

  test('should create and execute a POST request with JSON body', async ({ page }) => {
    await page.click('[data-testid="new-request-button"]');
    
    // Configure POST request
    await page.selectOption('[data-testid="http-method-select"]', 'POST');
    await page.fill('[data-testid="url-input"]', 'https://jsonplaceholder.typicode.com/posts');
    
    // Set content type header
    await page.click('[data-testid="headers-tab"]');
    await page.click('[data-testid="add-header-button"]');
    await page.fill('[data-testid="header-key-input"]:last-child', 'Content-Type');
    await page.fill('[data-testid="header-value-input"]:last-child', 'application/json');
    
    // Set JSON body
    await page.click('[data-testid="body-tab"]');
    await page.selectOption('[data-testid="body-type-select"]', 'JSON');
    await page.fill('[data-testid="json-body-editor"]', JSON.stringify({
      title: 'E2E Test Post',
      body: 'This is a test post created during E2E testing',
      userId: 1
    }));
    
    // Execute request
    await page.click('[data-testid="send-request-button"]');
    
    // Should return 201 Created
    await expect(page.locator('[data-testid="response-status"]')).toHaveText('201');
    await expect(page.locator('[data-testid="response-body"]')).toContainText('E2E Test Post');
  });

  test('should use environment variables in requests', async ({ page }) => {
    // First, create an environment
    await page.click('[data-testid="environment-selector"]');
    await page.click('text=Create Environment');
    
    await page.fill('[data-testid="environment-name-input"]', 'E2E Test Environment');
    
    // Add environment variables
    await page.click('[data-testid="add-variable-button"]');
    await page.fill('[data-testid="variable-key-input"]:last-child', 'BASE_URL');
    await page.fill('[data-testid="variable-value-input"]:last-child', 'https://jsonplaceholder.typicode.com');
    
    await page.click('[data-testid="add-variable-button"]');
    await page.fill('[data-testid="variable-key-input"]:last-child', 'API_KEY');
    await page.fill('[data-testid="variable-value-input"]:last-child', 'test-api-key-123');
    
    await page.click('text=Save Environment');
    
    // Select the environment
    await page.click('[data-testid="environment-selector"]');
    await page.click('text=E2E Test Environment');
    
    // Create request using environment variables
    await page.click('[data-testid="new-request-button"]');
    await page.fill('[data-testid="url-input"]', '{{BASE_URL}}/posts');
    
    // Add header with environment variable
    await page.click('[data-testid="headers-tab"]');
    await page.click('[data-testid="add-header-button"]');
    await page.fill('[data-testid="header-key-input"]:last-child', 'Authorization');
    await page.fill('[data-testid="header-value-input"]:last-child', 'Bearer {{API_KEY}}');
    
    // Execute request
    await page.click('[data-testid="send-request-button"]');
    
    // Should resolve variables and execute successfully
    await expect(page.locator('[data-testid="response-status"]')).toHaveText('200');
    
    // Check that variables were resolved in the request preview
    await page.click('[data-testid="request-preview-tab"]');
    await expect(page.locator('[data-testid="resolved-url"]')).toContainText('jsonplaceholder.typicode.com/posts');
    await expect(page.locator('[data-testid="resolved-headers"]')).toContainText('test-api-key-123');
  });

  test('should manage multiple request tabs', async ({ page }) => {
    // Create multiple requests
    await page.click('[data-testid="new-request-button"]');
    await page.fill('[data-testid="request-name-input"]', 'Get Posts');
    await page.fill('[data-testid="url-input"]', 'https://jsonplaceholder.typicode.com/posts');
    
    await page.click('[data-testid="new-request-button"]');
    await page.fill('[data-testid="request-name-input"]', 'Get Users');
    await page.fill('[data-testid="url-input"]', 'https://jsonplaceholder.typicode.com/users');
    
    await page.click('[data-testid="new-request-button"]');
    await page.fill('[data-testid="request-name-input"]', 'Get Comments');
    await page.fill('[data-testid="url-input"]', 'https://jsonplaceholder.typicode.com/comments');
    
    // Should show all tabs
    await expect(page.locator('[data-testid="request-tab"]')).toHaveCount(3);
    await expect(page.locator('text=Get Posts')).toBeVisible();
    await expect(page.locator('text=Get Users')).toBeVisible();
    await expect(page.locator('text=Get Comments')).toBeVisible();
    
    // Switch between tabs
    await page.click('text=Get Posts');
    await expect(page.locator('[data-testid="url-input"]')).toHaveValue(/posts$/);
    
    await page.click('text=Get Users');
    await expect(page.locator('[data-testid="url-input"]')).toHaveValue(/users$/);
    
    // Close a tab
    await page.click('[data-testid="close-tab-button"]:nth-child(2)');
    await expect(page.locator('[data-testid="request-tab"]')).toHaveCount(2);
    await expect(page.locator('text=Get Users')).not.toBeVisible();
  });

  test('should save and load request configurations', async ({ page }) => {
    // Create and configure a complex request
    await page.click('[data-testid="new-request-button"]');
    await page.fill('[data-testid="request-name-input"]', 'Complex API Request');
    await page.selectOption('[data-testid="http-method-select"]', 'PUT');
    await page.fill('[data-testid="url-input"]', 'https://jsonplaceholder.typicode.com/posts/1');
    
    // Add multiple headers
    await page.click('[data-testid="headers-tab"]');
    const headers = [
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Authorization', value: 'Bearer token123' },
      { key: 'X-Custom-Header', value: 'custom-value' }
    ];
    
    for (const header of headers) {
      await page.click('[data-testid="add-header-button"]');
      await page.fill('[data-testid="header-key-input"]:last-child', header.key);
      await page.fill('[data-testid="header-value-input"]:last-child', header.value);
    }
    
    // Set request body
    await page.click('[data-testid="body-tab"]');
    await page.selectOption('[data-testid="body-type-select"]', 'JSON');
    const requestBody = { title: 'Updated Post', body: 'Updated content', userId: 1 };
    await page.fill('[data-testid="json-body-editor"]', JSON.stringify(requestBody));
    
    // Save request
    await page.keyboard.press('Control+S'); // Or click save button
    
    // Navigate away and back
    await page.click('[data-testid="collection-browser"]');
    await page.click('text=Complex API Request');
    
    // Verify all configurations are preserved
    await expect(page.locator('[data-testid="http-method-select"]')).toHaveValue('PUT');
    await expect(page.locator('[data-testid="url-input"]')).toHaveValue('https://jsonplaceholder.typicode.com/posts/1');
    
    await page.click('[data-testid="headers-tab"]');
    await expect(page.locator('[data-testid="header-key-input"]').first()).toHaveValue('Content-Type');
    
    await page.click('[data-testid="body-tab"]');
    await expect(page.locator('[data-testid="json-body-editor"]')).toContainText('Updated Post');
  });

  test('should handle request failures gracefully', async ({ page }) => {
    await page.click('[data-testid="new-request-button"]');
    
    // Try to request invalid URL
    await page.fill('[data-testid="url-input"]', 'https://invalid-domain-that-does-not-exist.com/api');
    await page.click('[data-testid="send-request-button"]');
    
    // Should show error state
    await expect(page.locator('[data-testid="request-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to connect');
    
    // Should allow retry
    await page.click('[data-testid="retry-request-button"]');
    await expect(page.locator('[data-testid="request-loading"]')).toBeVisible();
  });

  test('should display request and response timing information', async ({ page }) => {
    await page.click('[data-testid="new-request-button"]');
    await page.fill('[data-testid="url-input"]', 'https://jsonplaceholder.typicode.com/posts');
    await page.click('[data-testid="send-request-button"]');
    
    // Wait for response
    await expect(page.locator('[data-testid="response-status"]')).toHaveText('200');
    
    // Check timing information
    await page.click('[data-testid="response-timing-tab"]');
    await expect(page.locator('[data-testid="total-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="dns-lookup-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="connect-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="first-byte-time"]')).toBeVisible();
    
    // Timing values should be reasonable (less than 10 seconds for example)
    const totalTime = await page.locator('[data-testid="total-time"]').textContent();
    const timeValue = parseInt(totalTime?.replace(/\D/g, '') || '0');
    expect(timeValue).toBeLessThan(10000); // Less than 10 seconds
  });

  test('should support request authentication methods', async ({ page }) => {
    await page.click('[data-testid="new-request-button"]');
    await page.fill('[data-testid="url-input"]', 'https://httpbin.org/basic-auth/user/pass');
    
    // Set up basic authentication
    await page.click('[data-testid="auth-tab"]');
    await page.selectOption('[data-testid="auth-type-select"]', 'Basic Auth');
    await page.fill('[data-testid="auth-username-input"]', 'user');
    await page.fill('[data-testid="auth-password-input"]', 'pass');
    
    // Execute request
    await page.click('[data-testid="send-request-button"]');
    
    // Should authenticate successfully
    await expect(page.locator('[data-testid="response-status"]')).toHaveText('200');
    
    // Try Bearer token authentication
    await page.fill('[data-testid="url-input"]', 'https://httpbin.org/bearer');
    await page.selectOption('[data-testid="auth-type-select"]', 'Bearer Token');
    await page.fill('[data-testid="auth-token-input"]', 'test-token-123');
    
    await page.click('[data-testid="send-request-button"]');
    await expect(page.locator('[data-testid="response-status"]')).toHaveText('200');
  });
});