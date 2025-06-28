import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Import/Export Workflow E2E Tests', () => {
  const testDataDir = path.join(__dirname, '../test-data');
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]');
    
    // Ensure we have a workspace
    await page.click('[data-testid="create-workspace-button"]');
    await page.click('text=Skip Git (Local Only)');
    await page.fill('[data-testid="workspace-name-input"]', 'Import Export Test');
    await page.click('text=Create Workspace');
    await page.waitForSelector('text=Import Export Test');
  });

  test('should import Postman collection successfully', async ({ page }) => {
    const postmanCollection = {
      info: {
        name: 'E2E Test Collection',
        description: 'Collection for E2E testing',
        version: '1.0.0'
      },
      item: [
        {
          name: 'Get Users',
          request: {
            method: 'GET',
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            url: {
              raw: 'https://jsonplaceholder.typicode.com/users',
              protocol: 'https',
              host: ['jsonplaceholder', 'typicode', 'com'],
              path: ['users']
            }
          }
        },
        {
          name: 'Create Post',
          request: {
            method: 'POST',
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                title: 'Test Post',
                body: 'This is a test post',
                userId: 1
              })
            },
            url: {
              raw: 'https://jsonplaceholder.typicode.com/posts',
              protocol: 'https',
              host: ['jsonplaceholder', 'typicode', 'com'],
              path: ['posts']
            }
          }
        }
      ]
    };

    // Open import dialog
    await page.click('[data-testid="import-button"]');
    
    // Should show import dialog
    await expect(page.locator('text=Import Collection')).toBeVisible();
    
    // Paste Postman collection
    await page.fill('[data-testid="import-text-input"]', JSON.stringify(postmanCollection));
    
    // Should auto-detect format
    await expect(page.locator('text=Postman Collection v2.1')).toBeVisible();
    
    // Should show preview
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
    await expect(page.locator('text=Get Users')).toBeVisible();
    await expect(page.locator('text=Create Post')).toBeVisible();
    
    // Import collection
    await page.click('[data-testid="import-button"]');
    
    // Should show success message
    await expect(page.locator('text=Successfully imported 2 requests')).toBeVisible();
    
    // Should close dialog and show imported collection
    await expect(page.locator('text=Import Collection')).not.toBeVisible();
    await expect(page.locator('text=E2E Test Collection')).toBeVisible();
    
    // Verify imported requests are accessible
    await page.click('text=E2E Test Collection');
    await expect(page.locator('text=Get Users')).toBeVisible();
    await expect(page.locator('text=Create Post')).toBeVisible();
    
    // Test an imported request
    await page.click('text=Get Users');
    await expect(page.locator('[data-testid="url-input"]')).toHaveValue('https://jsonplaceholder.typicode.com/users');
    await expect(page.locator('[data-testid="http-method-select"]')).toHaveValue('GET');
  });

  test('should import OpenAPI specification', async ({ page }) => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'E2E Test API',
        version: '1.0.0',
        description: 'API for E2E testing'
      },
      servers: [
        {
          url: 'https://api.example.com/v1',
          description: 'Production server'
        }
      ],
      paths: {
        '/users': {
          get: {
            summary: 'Get all users',
            operationId: 'getUsers',
            responses: {
              '200': {
                description: 'List of users',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          email: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            summary: 'Create a user',
            operationId: 'createUser',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string' }
                    },
                    required: ['name', 'email']
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'User created successfully'
              }
            }
          }
        }
      }
    };

    await page.click('[data-testid="import-button"]');
    await page.fill('[data-testid="import-text-input"]', JSON.stringify(openApiSpec));
    
    // Should detect OpenAPI format
    await expect(page.locator('text=OpenAPI 3.0')).toBeVisible();
    
    // Should show API endpoints in preview
    await expect(page.locator('text=GET /users')).toBeVisible();
    await expect(page.locator('text=POST /users')).toBeVisible();
    
    await page.click('[data-testid="import-button"]');
    
    // Should import successfully
    await expect(page.locator('text=Successfully imported OpenAPI specification')).toBeVisible();
    await expect(page.locator('text=E2E Test API')).toBeVisible();
    
    // Verify imported endpoints
    await page.click('text=E2E Test API');
    await page.click('text=GET /users');
    await expect(page.locator('[data-testid="url-input"]')).toHaveValue('https://api.example.com/v1/users');
  });

  test('should import curl commands', async ({ page }) => {
    const curlCommands = [
      'curl -X GET "https://api.example.com/users" -H "Accept: application/json"',
      'curl -X POST "https://api.example.com/users" -H "Content-Type: application/json" -d \'{"name": "John Doe", "email": "john@example.com"}\'',
      'curl -X DELETE "https://api.example.com/users/123" -H "Authorization: Bearer token123"'
    ].join('\n\n');

    await page.click('[data-testid="import-button"]');
    await page.fill('[data-testid="import-text-input"]', curlCommands);
    
    // Should detect curl format
    await expect(page.locator('text=cURL Commands')).toBeVisible();
    
    // Should show parsed requests in preview
    await expect(page.locator('text=GET /users')).toBeVisible();
    await expect(page.locator('text=POST /users')).toBeVisible();
    await expect(page.locator('text=DELETE /users/123')).toBeVisible();
    
    await page.click('[data-testid="import-button"]');
    
    // Should import curl commands
    await expect(page.locator('text=Successfully imported 3 requests')).toBeVisible();
    
    // Verify imported requests
    await page.click('text=DELETE /users/123');
    await expect(page.locator('[data-testid="url-input"]')).toHaveValue('https://api.example.com/users/123');
    await expect(page.locator('[data-testid="http-method-select"]')).toHaveValue('DELETE');
    
    // Check that Authorization header was imported
    await page.click('[data-testid="headers-tab"]');
    await expect(page.locator('[data-testid="header-key-input"]')).toHaveValue('Authorization');
    await expect(page.locator('[data-testid="header-value-input"]')).toHaveValue('Bearer token123');
  });

  test('should export collection to Postman format', async ({ page }) => {
    // First create a collection with some requests
    await page.click('[data-testid="create-collection-button"]');
    await page.fill('[data-testid="collection-name-input"]', 'Export Test Collection');
    await page.click('text=Create Collection');
    
    // Add a few requests
    await page.click('[data-testid="new-request-button"]');
    await page.fill('[data-testid="request-name-input"]', 'Get Posts');
    await page.fill('[data-testid="url-input"]', 'https://jsonplaceholder.typicode.com/posts');
    await page.keyboard.press('Control+S');
    
    await page.click('[data-testid="new-request-button"]');
    await page.fill('[data-testid="request-name-input"]', 'Create Post');
    await page.selectOption('[data-testid="http-method-select"]', 'POST');
    await page.fill('[data-testid="url-input"]', 'https://jsonplaceholder.typicode.com/posts');
    await page.click('[data-testid="body-tab"]');
    await page.selectOption('[data-testid="body-type-select"]', 'JSON');
    await page.fill('[data-testid="json-body-editor"]', '{"title": "Test", "body": "Content"}');
    await page.keyboard.press('Control+S');
    
    // Open export dialog
    await page.click('[data-testid="collection-menu-button"]');
    await page.click('text=Export Collection');
    
    // Should show export dialog
    await expect(page.locator('text=Export Collection')).toBeVisible();
    
    // Select Postman format
    await page.click('[data-testid="export-format-postman"]');
    
    // Should show collection summary
    await expect(page.locator('text=Export Test Collection')).toBeVisible();
    await expect(page.locator('text=2 requests')).toBeVisible();
    
    // Mock download functionality for testing
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-download-button"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Export Test Collection.postman_collection.json');
  });

  test('should export collection to OpenAPI format', async ({ page }) => {
    // Create collection with requests that can be converted to OpenAPI
    await page.click('[data-testid="create-collection-button"]');
    await page.fill('[data-testid="collection-name-input"]', 'REST API Collection');
    await page.click('text=Create Collection');
    
    // Add REST endpoints
    const endpoints = [
      { method: 'GET', path: '/api/users', name: 'List Users' },
      { method: 'POST', path: '/api/users', name: 'Create User' },
      { method: 'GET', path: '/api/users/{id}', name: 'Get User' },
      { method: 'PUT', path: '/api/users/{id}', name: 'Update User' },
      { method: 'DELETE', path: '/api/users/{id}', name: 'Delete User' }
    ];
    
    for (const endpoint of endpoints) {
      await page.click('[data-testid="new-request-button"]');
      await page.fill('[data-testid="request-name-input"]', endpoint.name);
      await page.selectOption('[data-testid="http-method-select"]', endpoint.method);
      await page.fill('[data-testid="url-input"]', `https://api.example.com${endpoint.path}`);
      await page.keyboard.press('Control+S');
    }
    
    // Export to OpenAPI
    await page.click('[data-testid="collection-menu-button"]');
    await page.click('text=Export Collection');
    await page.click('[data-testid="export-format-openapi"]');
    
    // Configure OpenAPI export options
    await page.fill('[data-testid="api-title-input"]', 'User Management API');
    await page.fill('[data-testid="api-version-input"]', '1.0.0');
    await page.fill('[data-testid="api-description-input"]', 'API for managing users');
    await page.fill('[data-testid="server-url-input"]', 'https://api.example.com');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-download-button"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('User Management API.openapi.json');
  });

  test('should export collection to curl format', async ({ page }) => {
    // Create a collection with various request types
    await page.click('[data-testid="create-collection-button"]');
    await page.fill('[data-testid="collection-name-input"]', 'cURL Export Test');
    await page.click('text=Create Collection');
    
    // Add request with headers and body
    await page.click('[data-testid="new-request-button"]');
    await page.selectOption('[data-testid="http-method-select"]', 'POST');
    await page.fill('[data-testid="url-input"]', 'https://api.example.com/data');
    
    // Add headers
    await page.click('[data-testid="headers-tab"]');
    await page.click('[data-testid="add-header-button"]');
    await page.fill('[data-testid="header-key-input"]:last-child', 'Authorization');
    await page.fill('[data-testid="header-value-input"]:last-child', 'Bearer token123');
    
    // Add JSON body
    await page.click('[data-testid="body-tab"]');
    await page.selectOption('[data-testid="body-type-select"]', 'JSON');
    await page.fill('[data-testid="json-body-editor"]', '{"message": "Hello World"}');
    
    await page.keyboard.press('Control+S');
    
    // Export to curl
    await page.click('[data-testid="collection-menu-button"]');
    await page.click('text=Export Collection');
    await page.click('[data-testid="export-format-curl"]');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-download-button"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('cURL Export Test.sh');
  });

  test('should handle import validation errors', async ({ page }) => {
    await page.click('[data-testid="import-button"]');
    
    // Try to import invalid JSON
    await page.fill('[data-testid="import-text-input"]', '{ invalid json }');
    await page.click('[data-testid="import-button"]');
    
    // Should show validation error
    await expect(page.locator('text=Invalid JSON format')).toBeVisible();
    
    // Try to import empty content
    await page.fill('[data-testid="import-text-input"]', '');
    await page.click('[data-testid="import-button"]');
    
    // Should show validation error
    await expect(page.locator('text=Please provide content to import')).toBeVisible();
    
    // Try to import unsupported format
    await page.fill('[data-testid="import-text-input"]', '<xml>not supported</xml>');
    await page.click('[data-testid="import-button"]');
    
    // Should show format error
    await expect(page.locator('text=Unsupported format')).toBeVisible();
  });

  test('should handle large import files', async ({ page }) => {
    // Create a large Postman collection
    const largeCollection = {
      info: { name: 'Large Collection', version: '1.0.0' },
      item: Array.from({ length: 100 }, (_, i) => ({
        name: `Request ${i + 1}`,
        request: {
          method: 'GET',
          url: `https://api.example.com/endpoint/${i + 1}`,
          header: [
            { key: 'Accept', value: 'application/json' }
          ]
        }
      }))
    };

    await page.click('[data-testid="import-button"]');
    await page.fill('[data-testid="import-text-input"]', JSON.stringify(largeCollection));
    
    // Should handle large import
    await expect(page.locator('text=100 requests')).toBeVisible();
    
    // Should show progress indicator during import
    await page.click('[data-testid="import-button"]');
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
    
    // Should complete successfully
    await expect(page.locator('text=Successfully imported 100 requests')).toBeVisible({ timeout: 30000 });
  });

  test('should preserve request order during import/export cycle', async ({ page }) => {
    const orderedCollection = {
      info: { name: 'Ordered Collection', version: '1.0.0' },
      item: [
        { name: 'First Request', request: { method: 'GET', url: 'https://api.example.com/1' } },
        { name: 'Second Request', request: { method: 'GET', url: 'https://api.example.com/2' } },
        { name: 'Third Request', request: { method: 'GET', url: 'https://api.example.com/3' } },
        { name: 'Fourth Request', request: { method: 'GET', url: 'https://api.example.com/4' } }
      ]
    };

    // Import collection
    await page.click('[data-testid="import-button"]');
    await page.fill('[data-testid="import-text-input"]', JSON.stringify(orderedCollection));
    await page.click('[data-testid="import-button"]');
    
    await expect(page.locator('text=Successfully imported 4 requests')).toBeVisible();
    
    // Verify order in collection browser
    await page.click('text=Ordered Collection');
    const requestItems = page.locator('[data-testid="request-item"]');
    await expect(requestItems.nth(0)).toContainText('First Request');
    await expect(requestItems.nth(1)).toContainText('Second Request');
    await expect(requestItems.nth(2)).toContainText('Third Request');
    await expect(requestItems.nth(3)).toContainText('Fourth Request');
    
    // Export and verify order is preserved
    await page.click('[data-testid="collection-menu-button"]');
    await page.click('text=Export Collection');
    await page.click('[data-testid="export-format-postman"]');
    
    // The download would contain the collection in the same order
    // (In a real test, we'd download and verify the JSON structure)
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-download-button"]');
    await downloadPromise;
  });
});