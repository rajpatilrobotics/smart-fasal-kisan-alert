import { afterEach, describe, expect, it, vi } from 'vitest';

import { isFarmerVoiceTransportConfigured, submitFarmerVoiceText } from './voice-api';

const credentials = { appCheckToken: 'app-check-test', idToken: 'id-token-test' } as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Farmer HTTPS voice transport', () => {
  it('returns unavailable without a configured provider and sends nothing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(isFarmerVoiceTransportConfigured('https://voice.example')).toBe(true);
    await expect(
      submitFarmerVoiceText(
        credentials,
        '00000000-0000-4000-8000-000000000101',
        '00000000-0000-4000-8000-000000000201',
        {
          currentRoute: '/farmer/today',
          language: 'mr',
          text: 'मदत',
        },
      ),
    ).resolves.toEqual({ kind: 'unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the bound HTTPS session and turn contracts without putting the ticket in a URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            httpsTurnsEndpoint: '/v1/voice/sessions/session/turns',
            protocolVersion: 1,
            sessionExpiresAt: '2026-07-13T10:15:00.000Z',
            sessionId: '00000000-0000-4000-8000-000000000301',
            singleUseTicket: 'a'.repeat(32),
            state: 'CREATED',
            ticketExpiresAt: '2026-07-13T10:01:00.000Z',
            websocketEndpoint: 'wss://voice.example/v1/realtime',
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            acknowledgedClientSequence: 1,
            messageKey: 'voice.help',
            serverSequence: 1,
            sessionId: '00000000-0000-4000-8000-000000000301',
            state: 'HELP',
            turnId: '00000000-0000-4000-8000-000000000302',
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      submitFarmerVoiceText(
        credentials,
        '00000000-0000-4000-8000-000000000101',
        '00000000-0000-4000-8000-000000000201',
        {
          baseUrl: 'https://voice.example',
          currentRoute: '/farmer/today',
          language: 'hi',
          text: '  मदद  ',
        },
      ),
    ).resolves.toEqual({ kind: 'help' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requests = fetchMock.mock.calls.map(([request]) => request as Request);
    const requestedUrls = requests.map((request) => request.url);
    expect(requestedUrls).toEqual([
      'https://voice.example/v1/voice/sessions',
      'https://voice.example/v1/voice/sessions/00000000-0000-4000-8000-000000000301/turns',
    ]);
    expect(requestedUrls.join(' ')).not.toContain('a'.repeat(32));
    expect(requests[0]?.headers.get('Authorization')).toBe('Bearer id-token-test');
    expect(requests[0]?.headers.get('X-Firebase-AppCheck')).toBe('app-check-test');
    expect(requests[0]?.cache).toBe('no-store');
    expect(requests[0]?.credentials).toBe('omit');
    const sessionBody = (await requests[0]?.clone().json()) as {
      contextIds: unknown[];
      visualRoute: string;
    };
    expect(sessionBody).toMatchObject({ contextIds: [], visualRoute: '/farmer/today' });
    const turnBody = (await requests[1]?.clone().json()) as { input: { text: string } };
    expect(turnBody.input.text).toBe('मदद');
  });
});
