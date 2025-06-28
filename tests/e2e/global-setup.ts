import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup(config: FullConfig) {
  console.log('Setting up E2E test environment...');
  
  // Create test data directory
  const testDataDir = path.join(__dirname, '../test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
  
  // Create sample test files
  const samplePostmanCollection = {
    info: {
      name: 'Sample Test Collection',
      description: 'Collection for E2E testing',
      version: '1.0.0'
    },
    item: [
      {
        name: 'Get Test Data',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: 'https://jsonplaceholder.typicode.com/posts/1',
            protocol: 'https',
            host: ['jsonplaceholder', 'typicode', 'com'],
            path: ['posts', '1']
          }
        }
      }
    ]
  };
  
  fs.writeFileSync(
    path.join(testDataDir, 'sample-postman-collection.json'),
    JSON.stringify(samplePostmanCollection, null, 2)
  );
  
  // Create sample OpenAPI spec
  const sampleOpenAPI = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    servers: [
      { url: 'https://api.test.com' }
    ],
    paths: {
      '/test': {
        get: {
          summary: 'Test endpoint',
          responses: {
            '200': {
              description: 'Success'
            }
          }
        }
      }
    }
  };
  
  fs.writeFileSync(
    path.join(testDataDir, 'sample-openapi.json'),
    JSON.stringify(sampleOpenAPI, null, 2)
  );
  
  // Wait for the dev server to be ready
  console.log('Waiting for development server to be ready...');
  
  // Launch a browser to check if the app is running
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let retries = 0;
  const maxRetries = 30; // 30 seconds
  
  while (retries < maxRetries) {
    try {
      await page.goto('http://localhost:1420', { timeout: 5000 });
      const title = await page.title();
      if (title) {
        console.log('Development server is ready!');
        break;
      }
    } catch (error) {
      console.log(`Waiting for server... (${retries + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
  }
  
  if (retries >= maxRetries) {
    throw new Error('Development server failed to start within the timeout period');
  }
  
  await browser.close();
  
  console.log('E2E test environment setup complete!');
}

export default globalSetup;