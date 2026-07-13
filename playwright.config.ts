import { defineConfig, devices } from '@playwright/test';

const isContinuousIntegration = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isContinuousIntegration,
  retries: isContinuousIntegration ? 1 : 0,
  reporter: isContinuousIntegration ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @smart-fasal/farmer-web dev',
      reuseExistingServer: !isContinuousIntegration,
      timeout: 120_000,
      url: 'http://127.0.0.1:3000/api/health/ready',
    },
    {
      command: 'pnpm --filter @smart-fasal/rsk-web dev',
      reuseExistingServer: !isContinuousIntegration,
      timeout: 120_000,
      url: 'http://127.0.0.1:3001/api/health/ready',
    },
    {
      command: 'pnpm --filter @smart-fasal/mp-web dev',
      reuseExistingServer: !isContinuousIntegration,
      timeout: 120_000,
      url: 'http://127.0.0.1:3002/api/health/ready',
    },
  ],
  projects: [
    {
      name: 'farmer',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3000' },
    },
    {
      name: 'rsk',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3001' },
    },
    {
      name: 'mp',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3002' },
    },
  ],
});
