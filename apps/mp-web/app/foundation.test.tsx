import { describe, expect, it } from 'vitest';

import { GET as live } from './api/health/live/route';
import { GET as ready } from './api/health/ready/route';
import RootLayout, { metadata, viewport } from './layout';
import manifest from './manifest';
import robots from './robots';

describe('MP application foundation contracts', () => {
  it('publishes liveness and readiness using the shared shape', async () => {
    await expect(live().json()).resolves.toMatchObject({ service: 'mp-web', status: 'ok' });
    await expect(ready().json()).resolves.toMatchObject({ service: 'mp-web', status: 'ok' });
  });

  it('keeps the aggregate workspace installable and non-indexed', () => {
    expect(manifest()).toMatchObject({ display: 'standalone', lang: 'en', start_url: '/' });
    expect(robots()).toEqual({ rules: { disallow: '/', userAgent: '*' } });
    expect(metadata.applicationName).toBe('Smart Fasal MP Office');
    expect(viewport.width).toBe('device-width');
    expect(RootLayout({ children: <main /> }).props.lang).toBe('en');
  });
});
