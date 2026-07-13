import { createHmac } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { buildDeviceIngestApp, MemoryDeviceCredentialStore } from './app.js';

const openApps: ReturnType<typeof buildDeviceIngestApp>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}

describe('Milestone 4 signed device ingest', () => {
  it('accepts a signed batch once and replays the durable receipt without trust promotion', async () => {
    const credentials = new MemoryDeviceCredentialStore();
    credentials.put('device-a', 'channel-a', 'secret');
    const app = buildDeviceIngestApp({ credentials, now: () => new Date('2026-07-13T08:00:00Z') });
    openApps.push(app);

    const challenge = await app.inject({
      method: 'POST',
      url: '/ingest/v1/challenges',
      payload: { channelId: 'channel-a', clientNonce: 'client-nonce-1234', deviceId: 'device-a' },
    });
    const challengeBody = challenge.json<{ challengeId: string }>();
    const body = {
      batchId: '00000000-0000-4000-8000-000000000801',
      channelId: 'channel-a',
      challengeId: challengeBody.challengeId,
      deviceId: 'device-a',
      observations: [
        {
          observationId: '00000000-0000-4000-8000-000000000901',
          observedAt: '2026-07-13T07:59:00.000Z',
          signal: 'NITROGEN',
          unit: 'MG_PER_KG',
          value: '55',
        },
      ],
    };
    const payloadDigest = `sha256:${createHmac('sha256', 'secret').update(stableJson(body)).digest('hex')}`;
    const signature = `sha256=${createHmac('sha256', 'secret').update(payloadDigest).digest('hex')}`;

    const accepted = await app.inject({
      method: 'POST',
      url: '/ingest/v1/batches',
      payload: { ...body, payloadDigest, signature },
    });
    expect(accepted.statusCode).toBe(202);
    expect(accepted.json()).toMatchObject({
      explicitlyNotAgronomicTrust: true,
      state: 'DURABLY_ACCEPTED',
      trustState: 'PENDING',
    });

    const replay = await app.inject({
      method: 'POST',
      url: '/ingest/v1/batches',
      payload: { ...body, payloadDigest, signature },
    });
    expect(replay.json()).toMatchObject({ state: 'ALREADY_ACCEPTED' });
  });

  it('rejects tampered signatures', async () => {
    const credentials = new MemoryDeviceCredentialStore();
    credentials.put('device-a', 'channel-a', 'secret');
    const app = buildDeviceIngestApp({ credentials });
    openApps.push(app);

    const challenge = await app.inject({
      method: 'POST',
      url: '/ingest/v1/challenges',
      payload: { channelId: 'channel-a', clientNonce: 'client-nonce-1234', deviceId: 'device-a' },
    });

    const rejected = await app.inject({
      method: 'POST',
      url: '/ingest/v1/batches',
      payload: {
        batchId: '00000000-0000-4000-8000-000000000802',
        channelId: 'channel-a',
        challengeId: challenge.json<{ challengeId: string }>().challengeId,
        deviceId: 'device-a',
        observations: [
          {
            observationId: '00000000-0000-4000-8000-000000000902',
            observedAt: '2026-07-13T07:59:00.000Z',
            signal: 'SOIL_MOISTURE',
            unit: 'PERCENT',
            value: '28',
          },
        ],
        payloadDigest: `sha256:${'a'.repeat(64)}`,
        signature: `sha256=${'b'.repeat(64)}`,
      },
    });

    expect(rejected.statusCode).toBe(401);
    expect(rejected.json()).toMatchObject({ code: 'SIGNATURE_INVALID' });
  });
});
