import { describe, expect, it, vi } from 'vitest';

import {
  InMemoryRecommendationRepository,
  LiveHttpRecommendationEvidenceProvider,
  LiveUnavailableRecommendationEvidenceProvider,
  RecommendationRejectedError,
  RecommendationService,
  type FarmerSetupOwner,
  type FarmerSetupRecord,
  type FarmerSetupRepository,
  type RecommendationRunRequest,
} from './index.js';

const owner: FarmerSetupOwner = {
  authorizationVersion: 1,
  environment: 'local',
  subjectId: '00000000-0000-4000-8000-000000000101',
};
const plotId = '00000000-0000-4000-8000-000000000401';

class SetupRepo implements FarmerSetupRepository {
  async load(input: FarmerSetupOwner): Promise<FarmerSetupRecord | undefined> {
    await Promise.resolve();
    if (input.subjectId !== owner.subjectId) return undefined;
    return {
      owner,
      draft: {
        checksum: `sha256:${'a'.repeat(64)}`,
        consents: { decisions: [] },
        cropHistoryByPlot: {},
        currentCropByPlot: {},
        deviceMode: 'PERSONAL',
        draftId: '00000000-0000-4000-8000-000000000301',
        farms: [
          {
            farmId: '00000000-0000-4000-8000-000000000201',
            farmingMethod: 'TRADITIONAL',
            location: { district: 'Raigad', taluka: 'Alibag', village: 'Poynad' },
            name: 'Demo farm',
            plots: [
              {
                area: 1,
                areaConversionVersion: 'area-v1',
                areaUnit: 'ACRE',
                farmId: '00000000-0000-4000-8000-000000000201',
                geometry: { gpsPermission: 'DENIED' },
                locationMethod: 'VILLAGE_LANDMARK',
                name: 'Plot 1',
                normalizedAreaSquareMetres: 4046.86,
                plotId,
                revision: 1,
              },
            ],
            revision: 1,
          },
        ],
        hardwareStatus: 'SKIPPED',
        profile: {
          accessibility: { highContrast: false, largeTargets: true, voicePrompts: true },
          preferredLocale: 'mr-IN',
          timezone: 'Asia/Kolkata',
        },
        revision: 1,
        soilByPlot: {},
        status: 'COMPLETE',
        syncStatus: 'SYNCED',
        updatedAt: '2026-07-14T09:00:00.000+05:30',
        waterByPlot: {},
      },
    };
  }

  async save(): Promise<void> {
    await Promise.resolve();
  }
}

function request(): RecommendationRunRequest {
  return {
    schemaVersion: 'recommendation-request-v1',
    planningSeasonKey: 'kharif-raigad',
    planningSeasonVersion: '2026',
    proposedStartWindow: {
      kind: 'SOWING',
      earliestDate: '2026-07-15',
      latestDate: '2026-07-25',
      timezone: 'Asia/Kolkata',
    },
    cultivationMethod: 'TRADITIONAL',
    landAvailabilityWindow: { availableFrom: '2026-07-14', availableUntil: '2026-12-15' },
    confirmedAreaRef: { plotId, areaRevision: 1 },
    farmerConstraintRefs: [],
    planningContextRevision: 1,
  };
}

function idSource() {
  let index = 1;
  return () => `00000000-0000-4000-8000-${String(index++).padStart(12, '0')}`;
}

function service() {
  return new RecommendationService(
    new SetupRepo(),
    new InMemoryRecommendationRepository(),
    () => new Date('2026-07-14T09:00:00.000+05:30'),
    idSource(),
  );
}

function liveUnavailableService() {
  return new RecommendationService(
    new SetupRepo(),
    new InMemoryRecommendationRepository(),
    () => new Date('2026-07-14T09:00:00.000+05:30'),
    idSource(),
    new LiveUnavailableRecommendationEvidenceProvider(),
  );
}

describe('RecommendationService', () => {
  it('creates a deterministic result and proposed Season calendar exactly once', async () => {
    const subject = service();
    const run = await subject.createRun({
      owner,
      operationId: '00000000-0000-4000-8000-000000000900',
      plotId,
      request: request(),
    });
    const status = await subject.runStatus(owner, run.operationId);
    expect(status.state).toBe('SUCCEEDED');
    expect(status.recommendationId).toBeDefined();

    const result = await subject.recommendation(owner, status.recommendationId ?? '');
    expect(result.state).toBe('READY');
    expect(result.candidates).toHaveLength(3);
    expect(result.dataMode).toBe('SIMULATED');

    const accepted = await subject.accept({
      owner,
      recommendationId: result.recommendationId,
      request: {
        commandId: '00000000-0000-4000-8000-000000000901',
        expectedRevision: result.etagRevision,
        candidateId: result.candidates[0]?.candidateId ?? '',
        start: {
          mode: 'PROPOSED',
          kind: 'SOWING',
          date: '2026-07-20',
          timezone: 'Asia/Kolkata',
        },
      },
    });
    const replay = await subject.accept({
      owner,
      recommendationId: result.recommendationId,
      request: {
        commandId: '00000000-0000-4000-8000-000000000901',
        expectedRevision: result.etagRevision,
        candidateId: result.candidates[0]?.candidateId ?? '',
        start: {
          mode: 'PROPOSED',
          kind: 'SOWING',
          date: '2026-07-20',
          timezone: 'Asia/Kolkata',
        },
      },
    });
    expect(replay.disposition).toBe('ALREADY_ACCEPTED');
    expect(replay.seasonId).toBe(accepted.seasonId);

    const calendar = await subject.calendar(owner, accepted.seasonId);
    expect(calendar.tasks).toHaveLength(3);
    expect(calendar.tasks.map((task) => task.state)).toEqual(['PLANNED', 'PLANNED', 'PLANNED']);
  });

  it('activates the first task when the accepted start is actual', async () => {
    const subject = service();
    const run = await subject.createRun({
      owner,
      operationId: '00000000-0000-4000-8000-000000000902',
      plotId,
      request: request(),
    });
    const status = await subject.runStatus(owner, run.operationId);
    const result = await subject.recommendation(owner, status.recommendationId ?? '');
    const accepted = await subject.accept({
      owner,
      recommendationId: result.recommendationId,
      request: {
        commandId: '00000000-0000-4000-8000-000000000903',
        expectedRevision: result.etagRevision,
        candidateId: result.candidates[0]?.candidateId ?? '',
        start: {
          mode: 'ACTUAL',
          kind: 'SOWING',
          date: '2026-07-20',
          timezone: 'Asia/Kolkata',
        },
      },
    });
    const calendar = await subject.calendar(owner, accepted.seasonId);
    expect(accepted.seasonState).toBe('ACTIVE');
    expect(calendar.tasks[0]?.state).toBe('ACTIVE');
  });

  it('denies cross-owner plot access', async () => {
    await expect(
      service().readiness({ ...owner, subjectId: '00000000-0000-4000-8000-999999999999' }, plotId),
    ).rejects.toBeInstanceOf(RecommendationRejectedError);
  });

  it('returns a typed no-decision result when live providers are unavailable', async () => {
    const subject = liveUnavailableService();
    const run = await subject.createRun({
      owner,
      operationId: '00000000-0000-4000-8000-000000000904',
      plotId,
      request: request(),
    });
    const status = await subject.runStatus(owner, run.operationId);
    const result = await subject.recommendation(owner, status.recommendationId ?? '');
    expect(result.state).toBe('NEEDS_INPUT');
    expect(result.candidates).toHaveLength(0);
    expect(result.modeExplanation).toContain('No decision was made');
  });

  it('can use a configured live HTTP provider package without changing engine authority', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          ruleSetVersion: 'live-rules-v1',
          profileSetVersion: 'live-profiles-v1',
          templateSetVersion: 'live-calendar-v1',
          evidence: [
            {
              evidenceId: '00000000-0000-4000-8000-000000000701',
              metricKey: 'weather.live.decision_rainfall',
              state: 'KNOWN',
              dataMode: 'LIVE',
              quality: 'TRUSTED',
              freshness: 'CURRENT',
              sourceName: 'live weather adapter',
              decisionEligible: true,
              rights: 'MODEL_INPUT_ALLOWED',
            },
          ],
          cropProfiles: [
            {
              cropProfileId: 'live-rice-kharif-v1',
              cropName: 'Rice',
              supportedSeasonKeys: ['kharif-raigad'],
              supportedMethods: ['TRADITIONAL'],
              durationDays: 120,
              waterNeed: 'MEDIUM',
              regionalValidationScore: 80,
              componentScores: {
                soil: 80,
                water: 80,
                weather: 80,
                season: 80,
                satellite: 80,
                local: 80,
              },
              reasons: ['Live adapter evidence is eligible.'],
              risks: [],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const subject = new RecommendationService(
      new SetupRepo(),
      new InMemoryRecommendationRepository(),
      () => new Date('2026-07-14T09:00:00.000+05:30'),
      idSource(),
      new LiveHttpRecommendationEvidenceProvider({
        endpoints: [{ name: 'weather', url: 'https://provider.example/recommendation/weather' }],
        fetch,
      }),
    );
    const run = await subject.createRun({
      owner,
      operationId: '00000000-0000-4000-8000-000000000905',
      plotId,
      request: request(),
    });
    const status = await subject.runStatus(owner, run.operationId);
    const result = await subject.recommendation(owner, status.recommendationId ?? '');
    expect(result.dataMode).toBe('LIVE');
    expect(result.candidates[0]?.cropProfileId).toBe('live-rice-kharif-v1');
  });
});
