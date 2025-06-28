import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalTeardown(config: FullConfig) {
  console.log('Cleaning up E2E test environment...');
  
  // Clean up test data directory
  const testDataDir = path.join(__dirname, '../test-data');
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
    console.log('Test data directory cleaned up');
  }
  
  // Additional cleanup tasks can be added here
  console.log('E2E test environment cleanup complete!');
}

export default globalTeardown;