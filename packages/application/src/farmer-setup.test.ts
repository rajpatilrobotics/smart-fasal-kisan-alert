import { describe, expect, it } from 'vitest';

import { FarmerSetupService, type FarmerSetupRepository } from './index';

const owner = {
  environment: 'local',
  subjectId: '00000000-0000-4000-8000-000000000101',
  authorizationVersion: 1,
};

function draft() {
  return {
    draftId: '00000000-0000-4000-8000-000000000201',
    status: 'IN_PROGRESS' as const,
    profile: {
      preferredLocale: 'mr-IN' as const,
      timezone: 'Asia/Kolkata' as const,
      accessibility: { voicePrompts: true, largeTargets: true, highContrast: false },
    },
    deviceMode: 'PERSONAL' as const,
    consents: { decisions: [] },
    farms: [
      {
        farmId: '00000000-0000-4000-8000-000000000301',
        name: 'Raigad Farm',
        location: { district: 'Raigad' as const, taluka: 'Alibag', village: 'Poynad' },
        farmingMethod: 'MIXED' as const,
        revision: 0,
        plots: [
          {
            plotId: '00000000-0000-4000-8000-000000000401',
            farmId: '00000000-0000-4000-8000-000000000301',
            name: 'Plot 1',
            area: 1,
            areaUnit: 'ACRE' as const,
            normalizedAreaSquareMetres: 1,
            areaConversionVersion: 'area-v1' as const,
            locationMethod: 'VILLAGE_LANDMARK' as const,
            revision: 0,
            geometry: {
              geometryVersion: 1,
              kind: 'VILLAGE_LANDMARK' as const,
              captureMethod: 'VILLAGE_LANDMARK' as const,
              gpsPermission: 'DENIED' as const,
              hasExactServerGeometry: false,
              recordedAt: '2026-07-13T08:00:00.000+00:00',
            },
          },
          {
            plotId: '00000000-0000-4000-8000-000000000402',
            farmId: '00000000-0000-4000-8000-000000000301',
            name: 'Plot 2',
            area: 12,
            areaUnit: 'GUNTHA' as const,
            normalizedAreaSquareMetres: 1,
            areaConversionVersion: 'area-v1' as const,
            locationMethod: 'MANUAL_MAP' as const,
            revision: 0,
            geometry: {
              geometryVersion: 1,
              kind: 'VILLAGE_LANDMARK' as const,
              captureMethod: 'MANUAL_MAP' as const,
              gpsPermission: 'DENIED' as const,
              hasExactServerGeometry: false,
              recordedAt: '2026-07-13T08:00:00.000+00:00',
            },
          },
        ],
      },
    ],
    soilByPlot: {},
    waterByPlot: {},
    cropHistoryByPlot: {},
    currentCropByPlot: {},
    hardwareStatus: 'SKIPPED' as const,
  };
}

class MemoryRepo implements FarmerSetupRepository {
  records = new Map<string, Awaited<ReturnType<FarmerSetupRepository['load']>>>();
  async load(input: typeof owner) {
    await Promise.resolve();
    return structuredClone(this.records.get(`${input.environment}:${input.subjectId}`));
  }
  async save(record: NonNullable<Awaited<ReturnType<FarmerSetupRepository['load']>>>) {
    await Promise.resolve();
    this.records.set(
      `${record.owner.environment}:${record.owner.subjectId}`,
      structuredClone(record),
    );
  }
}

describe('FarmerSetupService', () => {
  it('saves, completes and returns a two-plot My Farm result', async () => {
    const service = new FarmerSetupService(
      new MemoryRepo(),
      () => new Date('2026-07-13T08:00:00.000Z'),
    );
    const saved = await service.saveDraft({ owner, expectedRevision: 0, draft: draft() });
    expect(saved.disposition).toBe('ACCEPTED');
    if (saved.disposition !== 'ACCEPTED') throw new Error('unexpected conflict');
    const completed = await service.complete({
      owner,
      expectedRevision: saved.draft.revision,
      draftId: saved.draft.draftId,
      acceptedDraftRevision: saved.draft.revision,
      acceptedDraftChecksum: saved.draft.checksum,
    });
    expect(completed.disposition).toBe('ACCEPTED');
    if (completed.disposition !== 'ACCEPTED') throw new Error('unexpected conflict');
    expect(completed.myFarm.totals.plots).toBe(2);
    expect(completed.myFarm.setup.status).toBe('COMPLETE');
  });

  it('reports a conflict for stale replay instead of last-write-wins', async () => {
    const service = new FarmerSetupService(
      new MemoryRepo(),
      () => new Date('2026-07-13T08:00:00.000Z'),
    );
    await service.saveDraft({ owner, expectedRevision: 0, draft: draft() });
    const stale = await service.saveDraft({ owner, expectedRevision: 0, draft: draft() });
    expect(stale).toMatchObject({
      disposition: 'CONFLICT',
      conflict: { reason: 'EXPECTED_REVISION_MISMATCH' },
    });
  });
});
