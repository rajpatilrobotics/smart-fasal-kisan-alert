import { describe, expect, it } from 'vitest';

import { parseServiceEnvironment } from './index';

describe('parseServiceEnvironment', () => {
  it('applies safe local defaults', () => {
    expect(
      parseServiceEnvironment({}, { defaultPort: 8_080, serviceName: 'domain-api' }),
    ).toMatchObject({
      HOST: '0.0.0.0',
      NODE_ENV: 'development',
      PORT: 8_080,
      serviceName: 'domain-api',
    });
  });

  it('rejects invalid ports', () => {
    expect(() =>
      parseServiceEnvironment({ PORT: '0' }, { defaultPort: 8_080, serviceName: 'domain-api' }),
    ).toThrow();
  });

  it('rejects malformed database URLs instead of starting with unsafe configuration', () => {
    expect(() =>
      parseServiceEnvironment(
        { DATABASE_URL: 'https://example.com/not-postgres' },
        { defaultPort: 8_080, serviceName: 'domain-api' },
      ),
    ).toThrow();
  });
});
