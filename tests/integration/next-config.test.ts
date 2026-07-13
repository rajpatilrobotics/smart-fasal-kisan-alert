import { describe, expect, it } from 'vitest';

import { createSecureNextConfig } from '../../tooling/next-config.mjs';

async function headersFor(production: boolean) {
  const routes = await createSecureNextConfig({ production }).headers();
  return new Map(routes[0]?.headers.map(({ key, value }) => [key, value]));
}

describe('createSecureNextConfig', () => {
  it('keeps CSP out of static configuration and omits development transport security', async () => {
    const headers = await headersFor(false);

    expect(headers.has('Content-Security-Policy')).toBe(false);
    expect(headers.has('Strict-Transport-Security')).toBe(false);
  });

  it('keeps the remaining browser hardening headers and enables production transport security', async () => {
    const headers = await headersFor(true);

    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headers.get('Permissions-Policy')).toBe('camera=(), geolocation=(), microphone=()');
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
  });
});
