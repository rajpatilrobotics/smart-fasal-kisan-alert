import { createFarmerClient } from '@smart-fasal/contracts/clients/farmer';
import type { SupportedLocale } from '@smart-fasal/i18n';

import type { InMemoryCredentials } from '../auth/auth-memory';

const CLIENT_BUILD = process.env.NEXT_PUBLIC_CLIENT_BUILD ?? 'farmer-web-local';
const SCHEMA_VERSION = '1' as const;

export type FarmerVoiceTextOutcome =
  | { readonly kind: 'help' }
  | { readonly kind: 'needs-clarification' }
  | {
      readonly kind: 'recommendation-result';
      readonly recommendationId: string;
      readonly summary: string;
      readonly openDetailsRoute: string;
      readonly dataMode: 'LIVE' | 'RECORDED' | 'SIMULATED';
      readonly sourceGeneratedAt: string;
    }
  | { readonly kind: 'unavailable' };

interface FarmerVoiceTextOptions {
  readonly baseUrl?: string;
  readonly currentRoute: string;
  readonly language: SupportedLocale;
  readonly signal?: AbortSignal;
  readonly text: string;
}

export function isFarmerVoiceTransportConfigured(baseUrl?: string): boolean {
  return Boolean(baseUrl ?? process.env.NEXT_PUBLIC_FARMER_VOICE_GATEWAY_ORIGIN);
}

export async function submitFarmerVoiceText(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  options: FarmerVoiceTextOptions,
): Promise<FarmerVoiceTextOutcome> {
  const configuredOrigin = options.baseUrl ?? process.env.NEXT_PUBLIC_FARMER_VOICE_GATEWAY_ORIGIN;
  const text = options.text.trim();
  if (!configuredOrigin || text.length === 0 || text.length > 2_000) {
    return { kind: 'unavailable' };
  }

  try {
    const client = createFarmerClient({
      baseUrl: configuredOrigin,
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Authorization: `Bearer ${credentials.idToken}`,
        'X-Firebase-AppCheck': credentials.appCheckToken,
      },
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    });
    const sessionCommandId = globalThis.crypto.randomUUID();
    const session = await client.POST('/v1/voice/sessions', {
      body: {
        audioCapabilities: { httpsAudio: false, offlineAudio: false, realtime: false },
        contextIds: [],
        language: options.language,
        protocolVersion: 1,
        visualRoute: options.currentRoute,
      },
      params: {
        header: {
          'Idempotency-Key': sessionCommandId,
          'X-Client-Build': CLIENT_BUILD,
          'X-Client-Installation-Id': installationId,
          'X-Client-Schema-Version': SCHEMA_VERSION,
          'X-Role-Context-Id': roleContextId,
        },
      },
      signal: options.signal,
    });
    if (!session.data || session.error) return { kind: 'unavailable' };

    const turnId = globalThis.crypto.randomUUID();
    const turn = await client.POST('/v1/voice/sessions/{sessionId}/turns', {
      body: {
        acknowledgedServerSequence: 0,
        clientSequence: 1,
        input: { text, type: 'TEXT' },
        turnId,
      },
      params: {
        header: {
          'Idempotency-Key': turnId,
          'X-Client-Build': CLIENT_BUILD,
          'X-Client-Installation-Id': installationId,
          'X-Client-Schema-Version': SCHEMA_VERSION,
          'X-Role-Context-Id': roleContextId,
        },
        path: { sessionId: session.data.sessionId },
      },
      signal: options.signal,
    });
    if (!turn.data || turn.error) return { kind: 'unavailable' };
    if (turn.data.state === 'HELP') return { kind: 'help' };
    if (turn.data.state === 'NEEDS_CLARIFICATION') return { kind: 'needs-clarification' };
    if (
      turn.data.state === 'RESULT_READY' &&
      turn.data.result?.resultType === 'RECOMMENDATION_READ'
    ) {
      return {
        kind: 'recommendation-result',
        recommendationId: turn.data.result.recommendationId,
        summary: turn.data.result.summary,
        openDetailsRoute: turn.data.result.openDetailsRoute,
        dataMode: turn.data.result.dataMode,
        sourceGeneratedAt: turn.data.result.sourceGeneratedAt,
      };
    }

    return { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}
