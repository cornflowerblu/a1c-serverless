import { defineConfig } from 'cypress';
import * as fs from 'fs';
import * as path from 'path';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    setupNodeEvents(on, config) {
      // Load environment variables from cypress.env.json
      const envPath = path.resolve('./cypress.env.json');
      if (fs.existsSync(envPath)) {
        const envConfig = JSON.parse(fs.readFileSync(envPath, 'utf-8'));
        config.env = { ...config.env, ...envConfig };
      }
      
      return config;
    },
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
  env: {
    // Environment variables for tests
    apiUrl: 'http://localhost:3000/api',
    testUserId: 'test-user-id',
    isTestEnvironment: true
  },
  retries: {
    runMode: 2,
    openMode: 0,
  },
});