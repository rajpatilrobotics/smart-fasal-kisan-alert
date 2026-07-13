import { describe, expect, it } from 'vitest';

import {
  canUseIdentityNeutralOfflineFallback,
  mustUseNetworkOnly,
  OFFLINE_FALLBACK_URL,
} from './cache-policy';

function request(method = 'GET', headers: HeadersInit = {}) {
  return { headers: new Headers(headers), method };
}

describe('Farmer service-worker runtime policy', () => {
  it.each([
    '/api/health/live',
    '/auth',
    '/farmer/today',
    '/v1/sync/feed',
    '/v1/media/assets/asset-id/content',
    '/v1/voice/sessions',
  ])('keeps %s on the network and out of Cache Storage', (pathname) => {
    expect(mustUseNetworkOnly(request(), new URL(pathname, 'https://farmer.example'))).toBe(true);
  });

  it('keeps credentialed and mutating requests on the network', () => {
    const asset = new URL('/_next/static/chunks/app.js', 'https://farmer.example');
    expect(mustUseNetworkOnly(request('POST'), asset)).toBe(true);
    expect(mustUseNetworkOnly(request('GET', { Authorization: 'Bearer redacted' }), asset)).toBe(
      true,
    );
    expect(mustUseNetworkOnly(request('GET', { 'X-Firebase-AppCheck': 'redacted' }), asset)).toBe(
      true,
    );
  });

  it('allows only manifest-selected static GETs to reach the precache route', () => {
    expect(
      mustUseNetworkOnly(
        request(),
        new URL('/_next/static/chunks/app.js', 'https://farmer.example'),
      ),
    ).toBe(false);
  });

  it('allows the neutral fallback only for failed GET navigations', () => {
    expect(OFFLINE_FALLBACK_URL).toBe('/offline.html');
    expect(canUseIdentityNeutralOfflineFallback({ method: 'GET', mode: 'navigate' })).toBe(true);
    expect(canUseIdentityNeutralOfflineFallback({ method: 'POST', mode: 'navigate' })).toBe(false);
    expect(canUseIdentityNeutralOfflineFallback({ method: 'GET', mode: 'cors' })).toBe(false);
  });
});
