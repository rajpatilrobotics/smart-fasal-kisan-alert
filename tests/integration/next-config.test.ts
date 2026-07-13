import { describe, expect, it } from 'vitest';

import { createSecureNextConfig } from '../../tooling/next-config.mjs';

async function headersFor(production: boolean) {
  const routes = await createSecureNextConfig({ production }).headers();
  return new Map(routes[0]?.headers.map(({ key, value }) => [key, value]));
}

describe('createSecureNextConfig', () => {
  it('allows the development evaluator without enabling transport security', async () => {
    const headers = await headersFor(false);

    expect(headers.get('Content-Security-Policy')).toContain("'unsafe-eval'");
    expect(headers.has('Strict-Transport-Security')).toBe(false);
  });

  it('enables production transport security and upgrades insecure requests', async () => {
    const headers = await headersFor(true);

    expect(headers.get('Content-Security-Policy')).not.toContain("'unsafe-eval'");
    expect(headers.get('Content-Security-Policy')).toContain('upgrade-insecure-requests');
    expect(headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
  });
});
