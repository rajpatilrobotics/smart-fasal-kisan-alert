import { defineConfig, devices } from '@playwright/test';

import {
  E2E_APP_ORIGINS,
  E2E_DOMAIN_API_ORIGIN,
  E2E_MP_QUERY_API_ORIGIN,
} from './tests/e2e/origins';

const isContinuousIntegration = Boolean(process.env['CI']);
const e2ePublicEnvironment = {
  NEXT_PUBLIC_CLIENT_BUILD: 'e2e-synthetic',
  NEXT_PUBLIC_DOMAIN_API_ORIGIN: E2E_DOMAIN_API_ORIGIN,
  NEXT_PUBLIC_MP_QUERY_API_ORIGIN: E2E_MP_QUERY_API_ORIGIN,
};
const pnpmCommand = process.env['npm_execpath']?.includes('pnpm')
  ? `${JSON.stringify(process.execPath)} ${JSON.stringify(process.env['npm_execpath'])}`
  : 'corepack pnpm';

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
      command: `${pnpmCommand} --filter @smart-fasal/farmer-web dev`,
      env: e2ePublicEnvironment,
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${E2E_APP_ORIGINS.farmer}/api/health/ready`,
    },
    {
      command: `${pnpmCommand} --filter @smart-fasal/rsk-web dev`,
      env: e2ePublicEnvironment,
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${E2E_APP_ORIGINS.rsk}/api/health/ready`,
    },
    {
      command: `${pnpmCommand} --filter @smart-fasal/mp-web dev`,
      env: e2ePublicEnvironment,
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${E2E_APP_ORIGINS.mp}/api/health/ready`,
    },
  ],
  projects: [
    {
      name: 'farmer',
      use: { ...devices['Desktop Chrome'], baseURL: E2E_APP_ORIGINS.farmer },
    },
    {
      name: 'rsk',
      use: { ...devices['Desktop Chrome'], baseURL: E2E_APP_ORIGINS.rsk },
    },
    {
      name: 'mp',
      use: { ...devices['Desktop Chrome'], baseURL: E2E_APP_ORIGINS.mp },
    },
  ],
});
