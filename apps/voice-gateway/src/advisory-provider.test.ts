import type { FarmerTodayResponse } from '@smart-fasal/contracts';
import type { VoicePrincipal } from '@smart-fasal/voice';
import { describe, expect, it, vi } from 'vitest';

import {
  AdvisoryReadVoiceProvider,
  DomainApiAdvisoryProjectionReader,
} from './advisory-provider.js';

const principal: VoicePrincipal = {
  environment: 'local',
  subjectId: '019f5678-1234-7000-8000-000000000002',
  roleContextId: '019f5678-1234-7000-8000-000000000003',
  roleType: 'FARMER',
  origin: 'http://localhost:3000',
  authorizationVersion: 7,
  devicePartitionId: '019f5678-1234-7000-8000-000000000004',
};

const today: FarmerTodayResponse = {
  generatedAt: '2026-07-14T09:30:00.000Z',
  locale: 'mr-IN',
  dataMode: 'RECORDED',
  syncState: 'SYNCED',
  cards: [
    {
      advisoryId: '019f5678-1234-7000-8000-000000000101',
      plotId: '019f5678-1234-7000-8000-000000000201',
      kind: 'IRRIGATION_NEEDED',
      lifecycleState: 'ACTIVE',
      severity: 'ACTION',
      urgency: 'TODAY',
      generatedAt: '2026-07-14T09:00:00.000Z',
      activeFrom: '2026-07-14T09:00:00.000Z',
      expiresAt: '2026-07-15T09:00:00.000Z',
      dataMode: 'RECORDED',
      resultVersion: 1,
      etagRevision: 1,
      snapshotChecksum: `sha256:${'a'.repeat(64)}`,
      ruleSetVersion: 'advisory-rules-v1',
      riskScore: 84,
      confidenceScore: 78,
      title: 'Irrigation is needed',
      summary: 'मातीतील ओलावा कमी आहे आणि पुढील दोन दिवस पाऊस कमी आहे.',
      recommendedAction: {
        actionKind: 'IRRIGATE',
        label: 'आज पाणी द्या',
        timingLabel: 'सकाळी किंवा संध्याकाळी',
      },
      why: [{ code: 'LOW_SOIL_MOISTURE', label: 'Soil moisture is 14%.', contribution: 0.8 }],
      evidenceRefs: [
        {
          evidenceId: '019f5678-1234-7000-8000-000000000301',
          metricKey: 'soil.moisture',
          sourceName: 'Recorded sensor packet',
          freshness: 'CURRENT',
          quality: 'TRUSTED',
          dataMode: 'RECORDED',
          observedAt: '2026-07-14T08:45:00.000Z',
        },
      ],
      limitations: [],
      deduplicationKey: 'plot-irrigation-needed',
      alert: {
        alertId: '019f5678-1234-7000-8000-000000000401',
        lifecycleState: 'ACTIVE',
        channel: 'IN_APP',
      },
    },
    {
      advisoryId: '019f5678-1234-7000-8000-000000000102',
      plotId: '019f5678-1234-7000-8000-000000000201',
      kind: 'NUTRIENT_PH_GUIDANCE',
      lifecycleState: 'ACTIVE',
      severity: 'WATCH',
      urgency: 'NEXT_2_TO_3_DAYS',
      generatedAt: '2026-07-14T09:10:00.000Z',
      activeFrom: '2026-07-14T09:10:00.000Z',
      expiresAt: '2026-07-17T09:10:00.000Z',
      dataMode: 'RECORDED',
      resultVersion: 1,
      etagRevision: 1,
      snapshotChecksum: `sha256:${'b'.repeat(64)}`,
      ruleSetVersion: 'advisory-rules-v1',
      riskScore: 56,
      confidenceScore: 65,
      title: 'Cautious nutrient guidance',
      summary: 'माती आणि पिकाच्या टप्प्यामुळे खताचा सल्ला काळजीपूर्वक घ्या.',
      recommendedAction: {
        actionKind: 'APPLY_NUTRIENT_WITH_CAUTION',
        label: 'RSK कडून तपासूनच खत वापरा',
        timingLabel: 'पुढील दोन ते तीन दिवसात',
      },
      why: [{ code: 'NPK_TREND', label: 'NPK deficit trend score is 58.', contribution: 0.7 }],
      evidenceRefs: [
        {
          evidenceId: '019f5678-1234-7000-8000-000000000302',
          metricKey: 'soil.npk',
          sourceName: 'Recorded soil record',
          freshness: 'CURRENT',
          quality: 'TREND_ONLY',
          dataMode: 'RECORDED',
          observedAt: '2026-07-14T08:30:00.000Z',
        },
      ],
      limitations: ['Low-cost NPK is trend-only; no exact fertilizer quantity is given.'],
      deduplicationKey: 'plot-nutrient-guidance',
    },
  ],
};

describe('AdvisoryReadVoiceProvider', () => {
  it('answers irrigation questions from the same current advisory projection shape', async () => {
    const readToday = vi.fn().mockResolvedValue(today);
    const provider = new AdvisoryReadVoiceProvider({ readToday });

    await expect(
      provider.interpret({
        generation: 1,
        input: { type: 'TEXT', text: 'आज पाणी द्यावे का आणि का?' },
        language: 'mr',
        principal,
        sanitizedContextIds: ['019f5678-1234-7000-8000-000000000201'],
        sessionId: '019f5678-1234-7000-8000-000000000501',
      }),
    ).resolves.toMatchObject({
      kind: 'VALIDATED_RESULT',
      toolKey: 'farmer.advisory.read',
      result: {
        resultType: 'ADVISORY_READ',
        advisoryId: '019f5678-1234-7000-8000-000000000101',
        dataMode: 'RECORDED',
        openDetailsRoute: '/farmer/advisories/019f5678-1234-7000-8000-000000000101',
      },
    });
    expect(readToday).toHaveBeenCalledWith({
      principal,
      contextIds: ['019f5678-1234-7000-8000-000000000201'],
      language: 'mr',
    });
  });

  it('selects cautious fertilizer guidance for soil and NPK questions', async () => {
    const provider = new AdvisoryReadVoiceProvider({ readToday: vi.fn().mockResolvedValue(today) });
    const interpretation = await provider.interpret({
      generation: 1,
      input: { type: 'TEXT', text: 'माझ्या शेतात खत किंवा NPK बद्दल काय सल्ला आहे?' },
      language: 'mr',
      principal,
      sanitizedContextIds: [],
      sessionId: '019f5678-1234-7000-8000-000000000502',
    });
    expect(interpretation.result).toMatchObject({
      advisoryId: '019f5678-1234-7000-8000-000000000102',
    });
    expect(interpretation.result?.summary).toContain('RSK कडून तपासूनच खत वापरा');
  });

  it('does not invent an advisory when there is no current card', async () => {
    const provider = new AdvisoryReadVoiceProvider({
      readToday: vi.fn().mockResolvedValue({ ...today, cards: [] }),
    });
    await expect(
      provider.interpret({
        generation: 1,
        input: { type: 'TEXT', text: 'आज पाऊस किंवा पाणी याबद्दल काय?' },
        language: 'mr',
        principal,
        sanitizedContextIds: [],
        sessionId: '019f5678-1234-7000-8000-000000000503',
      }),
    ).resolves.toEqual({
      kind: 'CLARIFICATION',
      messageKey: 'voice.advisory.no_current_card',
    });
  });
});

describe('DomainApiAdvisoryProjectionReader', () => {
  it('fetches and validates the same Farmer Today advisory projection endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(today), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    );
    const headers = vi.fn().mockResolvedValue({
      authorization: 'Bearer test-internal-token',
      'x-firebase-appcheck': 'test-app-check',
      'x-client-schema-version': '1',
    });
    const reader = new DomainApiAdvisoryProjectionReader({
      baseUrl: 'http://domain-api.local',
      fetch: fetchMock,
      headers,
    });

    await expect(
      reader.readToday({ principal, contextIds: ['plot-1'], language: 'mr' }),
    ).resolves.toEqual(today);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toEqual(new URL('http://domain-api.local/v1/farmer/today'));
    expect(init).toMatchObject({
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer test-internal-token',
        'cache-control': 'no-store',
        'x-client-schema-version': '1',
        'x-firebase-appcheck': 'test-app-check',
      },
    });
    expect(headers).toHaveBeenCalledWith({ principal, contextIds: ['plot-1'], language: 'mr' });
  });

  it('rejects credential-bearing base URLs instead of hiding secrets in config', () => {
    expect(
      () =>
        new DomainApiAdvisoryProjectionReader({
          baseUrl: 'https://user:pass@domain-api.local',
          headers: vi.fn(),
        }),
    ).toThrow('Domain API baseUrl must be credential-free http(s)');
  });
});
