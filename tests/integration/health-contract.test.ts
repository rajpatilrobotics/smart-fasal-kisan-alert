import { afterEach, describe, expect, it } from 'vitest';

import { buildService } from '../../packages/service-runtime/src/index';
import { isHealthContract } from '../../packages/test-kit/src/index';

const openApps: ReturnType<typeof buildService>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe('shared service health contract', () => {
  it('is accepted by the cross-service contract guard', async () => {
    const app = buildService({ serviceName: 'contract-test' });
    openApps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(response.statusCode).toBe(200);
    expect(isHealthContract(response.json())).toBe(true);
  });
});
