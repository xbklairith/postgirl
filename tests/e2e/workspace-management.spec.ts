import { test, expect } from '@playwright/test';

test.describe('Workspace Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
  });

  test('should create a new local workspace', async ({ page }) => {
    // Open workspace creation wizard
    await page.click('[data-testid="create-workspace-button"]');
    
    // Should show the workspace creation wizard
    await expect(page.locator('text=Create New Workspace')).toBeVisible();
    
    // Skip Git setup (create local workspace)
    await page.click('text=Skip Git (Local Only)');
    
    // Fill workspace details
    await page.fill('[data-testid="workspace-name-input"]', 'E2E Test Workspace');
    await page.fill('[data-testid="workspace-description-input"]', 'Created during E2E test');
    
    // Verify auto-generated path
    await expect(page.locator('[data-testid="workspace-path-input"]')).toHaveValue(/e2e-test-workspace/);
    
    // Create workspace
    await page.click('text=Create Workspace');
    
    // Should show success and close wizard
    await expect(page.locator('text=Create New Workspace')).not.toBeVisible();
    
    // Should see the new workspace in the workspace list
    await expect(page.locator('text=E2E Test Workspace')).toBeVisible();
  });

  test('should create a Git-connected workspace', async ({ page }) => {
    // Open workspace creation wizard
    await page.click('[data-testid="create-workspace-button"]');
    
    // Enter Git repository URL
    await page.fill('[data-testid="git-url-input"]', 'https://github.com/test/demo-api.git');
    
    // Should show auto-generated workspace name preview
    await expect(page.locator('text=Workspace name will be auto-generated from repository: "Demo Api"')).toBeVisible();
    
    // Continue with Git
    await page.click('text=Continue with Git');
    
    // Verify auto-populated workspace name
    await expect(page.locator('[data-testid="workspace-name-input"]')).toHaveValue('Demo Api');
    
    // Create workspace
    await page.click('text=Create Workspace');
    
    // Should handle Git clone (might show loading or success message)
    await page.waitForSelector('text=Demo Api', { timeout: 15000 });
    
    // Verify Git-connected workspace appears in list
    await expect(page.locator('text=Demo Api')).toBeVisible();
    await expect(page.locator('[data-testid="git-status-indicator"]')).toBeVisible();
  });

  test('should switch between workspaces', async ({ page }) => {
    // Assuming we have multiple workspaces, switch between them
    await page.click('[data-testid="workspace-selector"]');
    
    // Should show workspace dropdown
    await expect(page.locator('[data-testid="workspace-dropdown"]')).toBeVisible();
    
    // Select a different workspace
    await page.click('[data-testid="workspace-option"]:first-child');
    
    // Should switch to the selected workspace
    await expect(page.locator('[data-testid="active-workspace-name"]')).toBeVisible();
  });

  test('should manage workspace settings', async ({ page }) => {
    // Open workspace settings
    await page.click('[data-testid="workspace-settings-button"]');
    
    // Should show settings modal
    await expect(page.locator('text=Workspace Settings')).toBeVisible();
    
    // Modify settings
    await page.uncheck('[data-testid="auto-save-checkbox"]');
    await page.fill('[data-testid="timeout-input"]', '60000');
    
    // Save settings
    await page.click('text=Save Settings');
    
    // Settings should be saved and modal closed
    await expect(page.locator('text=Workspace Settings')).not.toBeVisible();
  });

  test('should delete a workspace', async ({ page }) => {
    // Open workspace management
    await page.click('[data-testid="manage-workspaces-button"]');
    
    // Find a workspace to delete (not the active one)
    await page.click('[data-testid="workspace-menu-button"]:first-child');
    await page.click('text=Delete Workspace');
    
    // Should show confirmation dialog
    await expect(page.locator('text=Are you sure you want to delete this workspace?')).toBeVisible();
    
    // Confirm deletion
    await page.fill('[data-testid="delete-confirmation-input"]', 'DELETE');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Workspace should be removed from list
    await expect(page.locator('text=Workspace deleted successfully')).toBeVisible();
  });

  test('should handle workspace creation errors', async ({ page }) => {
    // Try to create workspace with invalid data
    await page.click('[data-testid="create-workspace-button"]');
    await page.click('text=Skip Git (Local Only)');
    
    // Leave name empty and try to create
    await page.click('text=Create Workspace');
    
    // Should show validation errors
    await expect(page.locator('text=Workspace name is required')).toBeVisible();
    
    // Fill name but use invalid path
    await page.fill('[data-testid="workspace-name-input"]', 'Invalid Workspace');
    await page.fill('[data-testid="workspace-path-input"]', '/root/invalid/path');
    
    await page.click('text=Create Workspace');
    
    // Should show error message
    await expect(page.locator('text=Failed to create workspace')).toBeVisible();
  });

  test('should persist workspace selection across app restarts', async ({ page, context }) => {
    // Select a specific workspace
    await page.click('[data-testid="workspace-selector"]');
    await page.click('[data-testid="workspace-option"]:nth-child(2)');
    
    const selectedWorkspaceName = await page.locator('[data-testid="active-workspace-name"]').textContent();
    
    // Reload the page (simulate app restart)
    await page.reload();
    await page.waitForSelector('[data-testid="app-loaded"]');
    
    // Should restore the same workspace
    await expect(page.locator('[data-testid="active-workspace-name"]')).toHaveText(selectedWorkspaceName!);
  });
});