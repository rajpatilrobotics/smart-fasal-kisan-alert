import { describe, expect, it } from 'vitest';

import { GET as live } from './api/health/live/route';
import { GET as ready } from './api/health/ready/route';
import RootLayout, { metadata, viewport } from './layout';
import manifest from './manifest';
import robots from './robots';

describe('Farmer application foundation contracts', () => {
  it('publishes liveness and readiness using the shared shape', async () => {
    await expect(live().json()).resolves.toMatchObject({ service: 'farmer-web', status: 'ok' });
    await expect(ready().json()).resolves.toMatchObject({ service: 'farmer-web', status: 'ok' });
  });

  it('keeps the app installable, Marathi-first, and non-indexed', () => {
    expect(manifest()).toMatchObject({ display: 'standalone', lang: 'mr', start_url: '/' });
    expect(robots()).toEqual({ rules: { disallow: '/', userAgent: '*' } });
    expect(metadata.applicationName).toBe('Smart Fasal Farmer');
    expect(viewport.width).toBe('device-width');
    expect(RootLayout({ children: <main /> }).props.lang).toBe('mr');
  });
});
