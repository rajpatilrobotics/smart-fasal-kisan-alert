import { describe, expect, it } from 'vitest';

import {
  EvidenceService,
  InMemoryEvidenceRepository,
  type FarmerSetupRepository,
  type FarmerSetupOwner,
  type FarmerSetupRecord,
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
        checksum: 'sha256:'.concat('a'.repeat(64)),
        consents: { decisions: [] },
        cropHistoryByPlot: {},
        currentCropByPlot: {},
        deviceMode: 'PERSONAL',
        draftId: '00000000-0000-4000-8000-000000000301',
        farms: [
          {
            farmId: '00000000-0000-4000-8000-000000000201',
            farmingMethod: 'UNKNOWN',
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
        updatedAt: '2026-07-13T08:00:00.000Z',
        waterByPlot: {},
      },
    };
  }

  async save(): Promise<void> {
    await Promise.resolve();
  }
}

describe('Milestone 4 evidence service', () => {
  it('returns simulated Raigad evidence with separate mode, freshness and quality labels', async () => {
    const service = new EvidenceService(
      new InMemoryEvidenceRepository(),
      new SetupRepo(),
      () => new Date('2026-07-13T08:00:00.000Z'),
      () => '00000000-0000-4000-8000-000000000601',
    );

    const summary = await service.summarize(owner, plotId);

    expect(summary.cards[0]?.primary).toMatchObject({
      dataMode: 'SIMULATED',
      freshness: 'CURRENT',
      quality: 'USE_WITH_CAUTION',
      decisionEligible: false,
    });
  });

  it('keeps low-cost NPK trend-only and rejects cross-owner plot reads', async () => {
    const service = new EvidenceService(
      new InMemoryEvidenceRepository(),
      new SetupRepo(),
      () => new Date('2026-07-13T08:00:00.000Z'),
      () => '00000000-0000-4000-8000-000000000602',
    );

    await service.recordSoil(owner, plotId, {
      clientContext: {
        clientRecordedAt: '2026-07-13T07:55:00.000Z',
        dataModeClaim: 'LIVE',
        timezone: 'Asia/Kolkata',
      },
      commandId: '00000000-0000-4000-8000-000000000701',
      expectedRevision: 1,
      measurement: {
        nitrogen: 55,
        observedAt: '2026-07-13T07:50:00.000Z',
        potassium: 30,
        phosphorus: 12,
        source: 'SENSOR',
        sourceReference: 'demo-device',
        sourceRightsLabel: 'Farmer device telemetry',
        sourceVersion: 'packet-v1',
        unit: 'MG_PER_KG',
      },
    });

    const summary = await service.summarize(owner, plotId);
    const nutrient = summary.cards
      .find((card) => card.cardId === 'soil')
      ?.records.find((record) => record.metricKey === 'nitrogen');
    expect(nutrient?.quality).toBe('TREND_ONLY');
    await expect(
      service.summarize({ ...owner, subjectId: '00000000-0000-4000-8000-999999999999' }, plotId),
    ).rejects.toThrow('AUTHORIZATION_DENIED');
  });
});
