import { describe, expect, it } from 'vitest';

import { GET as live } from './api/health/live/route';
import { GET as ready } from './api/health/ready/route';
import RootLayout, { metadata, viewport } from './layout';
import manifest from './manifest';
import robots from './robots';

describe('RSK application foundation contracts', () => {
  it('publishes liveness and readiness using the shared shape', async () => {
    await expect(live().json()).resolves.toMatchObject({ service: 'rsk-web', status: 'ok' });
    await expect(ready().json()).resolves.toMatchObject({ service: 'rsk-web', status: 'ok' });
  });

  it('keeps the workspace installable, accessible, and non-indexed', () => {
    expect(manifest()).toMatchObject({ display: 'standalone', lang: 'en', start_url: '/' });
    expect(robots()).toEqual({ rules: { disallow: '/', userAgent: '*' } });
    expect(metadata.applicationName).toBe('Smart Fasal RSK');
    expect(viewport.width).toBe('device-width');
    expect(RootLayout({ children: <main /> }).props.lang).toBe('en');
  });
});
