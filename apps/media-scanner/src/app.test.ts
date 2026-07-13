import { describe, expect, it, vi } from 'vitest';

import { buildMediaScannerApp, type MediaScanBoundary } from './app';

const ASSET = '00000000-0000-4000-8000-000000000101';
const EVENT = '00000000-0000-4000-8000-000000000102';
const OPERATION = '00000000-0000-4000-8000-000000000103';

function boundary(): { boundary: MediaScanBoundary; scan: ReturnType<typeof vi.fn> } {
  const scan = vi.fn(() =>
    Promise.resolve({
      operationId: OPERATION,
      assetId: ASSET,
      state: 'SCANNING' as const,
      acceptedAt: '2026-07-13T10:00:00.000Z',
    }),
  );
  return {
    scan,
    boundary: {
      verifyServiceIdentity: (token) => Promise.resolve(token === 'known-service-token'),
      scan,
    },
  };
}

describe('media scanner internal boundary', () => {
  it('requires an authenticated service identity and exact path/body asset binding', async () => {
    const scanner = boundary();
    const app = buildMediaScannerApp({ serviceName: 'media-scanner', boundary: scanner.boundary });

    const missing = await app.inject({
      method: 'POST',
      url: `/internal/v1/media/assets/${ASSET}:scan`,
      payload: { scanRequestVersion: 1, assetId: ASSET, storageEventId: EVENT },
    });
    expect(missing.statusCode).toBe(401);

    const denied = await app.inject({
      method: 'POST',
      url: `/internal/v1/media/assets/${ASSET}:scan`,
      headers: { authorization: 'Bearer wrong-service-token' },
      payload: { scanRequestVersion: 1, assetId: ASSET, storageEventId: EVENT },
    });
    expect(denied.statusCode).toBe(403);

    const mismatched = await app.inject({
      method: 'POST',
      url: `/internal/v1/media/assets/${ASSET}:scan`,
      headers: { authorization: 'Bearer known-service-token' },
      payload: {
        scanRequestVersion: 1,
        assetId: '00000000-0000-4000-8000-000000000199',
        storageEventId: EVENT,
      },
    });
    expect(mismatched.statusCode).toBe(400);
    expect(scanner.scan).not.toHaveBeenCalled();

    const accepted = await app.inject({
      method: 'POST',
      url: `/internal/v1/media/assets/${ASSET}:scan`,
      headers: { authorization: 'Bearer known-service-token' },
      payload: { scanRequestVersion: 1, assetId: ASSET, storageEventId: EVENT },
    });
    expect(accepted.statusCode).toBe(202);
    expect(accepted.json()).toMatchObject({ assetId: ASSET, state: 'SCANNING' });
    expect(scanner.scan).toHaveBeenCalledWith({ assetId: ASSET, storageEventId: EVENT });

    await app.close();
  });

  it('is honestly unavailable until a production boundary is injected', async () => {
    const app = buildMediaScannerApp({ serviceName: 'media-scanner' });
    const response = await app.inject({
      method: 'POST',
      url: `/internal/v1/media/assets/${ASSET}:scan`,
      headers: { authorization: 'Bearer opaque-service-token' },
      payload: { scanRequestVersion: 1, assetId: ASSET, storageEventId: EVENT },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE', retryable: true });
    await app.close();
  });
});
