import { describe, expect, it } from 'vitest';

import {
  AdvisoryRejectedError,
  AdvisoryService,
  InMemoryAdvisoryRepository,
  RecordedRaigadAdvisoryEvidenceProvider,
  type FarmerSetupOwner,
  type FarmerSetupRecord,
  type FarmerSetupRepository,
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
        currentCropByPlot: {
          [plotId]: {
            cropName: 'Rice',
            cropStage: 'VEGETATIVE',
            sowingDate: '2026-06-20',
          },
        },
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

function idSource() {
  let index = 1;
  return () => `00000000-0000-4000-8000-${String(index++).padStart(12, '0')}`;
}

function service(
  scenario: ConstructorParameters<
    typeof RecordedRaigadAdvisoryEvidenceProvider
  >[0] = 'LOW_MOISTURE_DRY_FORECAST',
  now = () => new Date('2026-07-14T09:00:00.000+05:30'),
) {
  return new AdvisoryService(
    new SetupRepo(),
    new InMemoryAdvisoryRepository(),
    now,
    idSource(),
    new RecordedRaigadAdvisoryEvidenceProvider(scenario),
  );
}

describe('AdvisoryService', () => {
  it('generates a Today advisory from recorded low-moisture dry forecast evidence', async () => {
    const today = await service().today(owner);

    expect(today.locale).toBe('mr-IN');
    expect(today.cards).toHaveLength(1);
    expect(today.cards[0]?.kind).toBe('IRRIGATION_NEEDED');
    expect(today.cards[0]?.dataMode).toBe('RECORDED');
    expect(today.cards[0]?.alert?.channel).toBe('IN_APP');
  });

  it('deduplicates repeated active advisories for the same plot and reason', async () => {
    const subject = service();
    const first = await subject.evaluatePlot(owner, plotId);
    const second = await subject.evaluatePlot(owner, plotId);

    expect(first.lifecycleState).toBe('ACTIVE');
    expect(second.lifecycleState).toBe('DEDUPLICATED');
    expect(second.supersedesAdvisoryId).toBe(first.advisoryId);
  });

  it('records advisory responses idempotently and updates lifecycle', async () => {
    const subject = service();
    const advisory = await subject.evaluatePlot(owner, plotId);
    const request = {
      commandId: '00000000-0000-4000-8000-000000000901',
      expectedRevision: advisory.etagRevision,
      response: 'ACKNOWLEDGE' as const,
      clientRecordedAt: '2026-07-14T09:05:00.000+05:30',
      timezone: 'Asia/Kolkata' as const,
    };
    const accepted = await subject.respond({ owner, advisoryId: advisory.advisoryId, request });
    const replay = await subject.respond({ owner, advisoryId: advisory.advisoryId, request });
    const updated = await subject.advisory(owner, advisory.advisoryId);

    expect(accepted.lifecycleState).toBe('ACKNOWLEDGED');
    expect(replay.disposition).toBe('ALREADY_ACCEPTED');
    expect(updated.lifecycleState).toBe('ACKNOWLEDGED');
  });

  it('rejects cross-owner advisory access', async () => {
    const subject = service();
    const advisory = await subject.evaluatePlot(owner, plotId);

    await expect(
      subject.advisory(
        { ...owner, subjectId: '00000000-0000-4000-8000-999999999999' },
        advisory.advisoryId,
      ),
    ).rejects.toBeInstanceOf(AdvisoryRejectedError);
  });

  it('rejects responses after advisory expiry', async () => {
    let currentTime = new Date('2026-07-14T09:00:00.000+05:30');
    const subject = service('LOW_MOISTURE_DRY_FORECAST', () => currentTime);
    const advisory = await subject.evaluatePlot(owner, plotId);
    currentTime = new Date('2026-07-16T09:00:00.000+05:30');

    await expect(
      subject.respond({
        owner,
        advisoryId: advisory.advisoryId,
        request: {
          commandId: '00000000-0000-4000-8000-000000000902',
          expectedRevision: advisory.etagRevision,
          response: 'ACKNOWLEDGE',
          clientRecordedAt: '2026-07-16T09:05:00.000+05:30',
          timezone: 'Asia/Kolkata',
        },
      }),
    ).rejects.toMatchObject({ code: 'ADVISORY_EXPIRED' });
  });

  it('supports the four demo-safe Raigad advisory scenarios', async () => {
    await expect(service('RAIN_EXPECTED_DELAY').evaluatePlot(owner, plotId)).resolves.toMatchObject(
      {
        kind: 'IRRIGATION_DELAY_RAIN_EXPECTED',
      },
    );
    await expect(service('NUTRIENT_DEFICIENCY').evaluatePlot(owner, plotId)).resolves.toMatchObject(
      {
        kind: 'NUTRIENT_PH_GUIDANCE',
      },
    );
    await expect(service('STALE_SENSOR').evaluatePlot(owner, plotId)).resolves.toMatchObject({
      kind: 'SENSOR_EVIDENCE_PROBLEM',
    });
  });
});
