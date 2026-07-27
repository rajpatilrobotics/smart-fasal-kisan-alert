import { describe, expect, it } from 'vitest';

import {
  HealthRejectedError,
  HealthService,
  InMemoryHealthRepository,
  UnavailableHealthVisionExtractor,
  type FarmerSetupOwner,
  type FarmerSetupRecord,
  type FarmerSetupRepository,
} from './index.js';

const owner: FarmerSetupOwner = {
  authorizationVersion: 1,
  environment: 'local',
  subjectId: '00000000-0000-4000-8000-000000000101',
};
const farmId = '00000000-0000-4000-8000-000000000201';
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
          [plotId]: { cropName: 'Rice', cropStage: 'VEGETATIVE', sowingDate: '2026-06-20' },
        },
        deviceMode: 'PERSONAL',
        draftId: '00000000-0000-4000-8000-000000000301',
        farms: [
          {
            farmId,
            farmingMethod: 'TRADITIONAL',
            location: { district: 'Raigad', taluka: 'Alibag', village: 'Poynad' },
            name: 'Demo farm',
            plots: [
              {
                area: 1,
                areaConversionVersion: 'area-v1',
                areaUnit: 'ACRE',
                farmId,
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

function service() {
  return new HealthService(
    new SetupRepo(),
    new InMemoryHealthRepository(),
    () => new Date('2026-07-14T09:00:00.000+05:30'),
    idSource(),
  );
}

async function submittedReport(subject = service()) {
  const draft = await subject.saveDraft({
    owner,
    plotId,
    request: {
      commandId: '00000000-0000-4000-8000-000000000901',
      expectedRevision: 0,
      schemaVersion: 'health-report-draft-v1',
      cropName: 'Rice',
      language: 'mr',
      symptomSummary: 'भाताच्या पानांवर तीन दिवसांपासून तपकिरी डाग आहेत आणि ते पसरत आहेत.',
      answers: [
        {
          questionKey: 'affectedPart',
          answer: 'leaf',
          unknown: false,
          language: 'mr',
          source: 'TYPED',
        },
        {
          questionKey: 'symptomStarted',
          answer: 'three days ago',
          unknown: false,
          language: 'mr',
          source: 'TYPED',
        },
        {
          questionKey: 'spread',
          answer: 'spreading',
          unknown: false,
          language: 'mr',
          source: 'TYPED',
        },
      ],
      clientRecordedAt: '2026-07-14T09:00:00.000+05:30',
      timezone: 'Asia/Kolkata',
    },
  });
  const withMedia = await subject.attachMedia({
    owner,
    reportId: draft.reportId,
    request: {
      commandId: '00000000-0000-4000-8000-000000000902',
      expectedRevision: draft.etagRevision,
      assetId: '00000000-0000-4000-8000-000000000701',
      requiredView: 'AFFECTED_LEAF_TOP',
      consentAccessVersion: 1,
      clientRecordedAt: '2026-07-14T09:01:00.000+05:30',
      timezone: 'Asia/Kolkata',
    },
  });
  const submitted = await subject.submit({
    owner,
    reportId: draft.reportId,
    request: {
      commandId: '00000000-0000-4000-8000-000000000903',
      expectedRevision: withMedia.etagRevision,
      clientSubmittedAt: '2026-07-14T09:02:00.000+05:30',
      timezone: 'Asia/Kolkata',
    },
  });
  return { subject, submitted };
}

describe('HealthService', () => {
  it('creates a possible-only triage result and pending expert sharing review', async () => {
    const { subject, submitted } = await submittedReport();

    expect(submitted.state).toBe('TRIAGED');
    expect(submitted.triage?.state).toBe('SUPPORTED');
    expect(submitted.triage?.mandatoryEscalation).toBe(true);
    expect(submitted.sharingDecision).toBe('PENDING');
    expect((await subject.listReports(owner, plotId)).reports).toHaveLength(1);
    expect(JSON.stringify(submitted)).not.toMatch(/confirmed diagnosis|fungicide|pesticide|dose/i);
  });

  it('keeps decline private and creates no case', async () => {
    const { subject, submitted } = await submittedReport();
    const declined = await subject.decideSharing({
      owner,
      reportId: submitted.reportId,
      request: {
        commandId: '00000000-0000-4000-8000-000000000904',
        expectedRevision: submitted.etagRevision,
        decision: 'DENY',
        policyVersionId: '00000000-0000-4000-8000-000000000905',
        consentAccessVersion: 1,
        clientRecordedAt: '2026-07-14T09:03:00.000+05:30',
        timezone: 'Asia/Kolkata',
      },
    });

    expect(declined.sharingDecision).toBe('DENY');
    expect(declined.caseId).toBeUndefined();
    expect((await subject.listCases(owner)).cases).toHaveLength(0);
  });

  it('allows sharing atomically and replays the same case foundation', async () => {
    const { subject, submitted } = await submittedReport();
    const request = {
      commandId: '00000000-0000-4000-8000-000000000906',
      expectedRevision: submitted.etagRevision,
      decision: 'ALLOW' as const,
      policyVersionId: '00000000-0000-4000-8000-000000000907',
      consentAccessVersion: 2,
      clientRecordedAt: '2026-07-14T09:03:00.000+05:30',
      timezone: 'Asia/Kolkata' as const,
    };
    const allowed = await subject.decideSharing({ owner, reportId: submitted.reportId, request });
    const replay = await subject.decideSharing({ owner, reportId: submitted.reportId, request });
    const cases = await subject.listCases(owner);

    expect(allowed.caseStatus).toBe('PENDING_EXPERT');
    expect(replay.disposition).toBe('ALREADY_ACCEPTED');
    expect(replay.caseId).toBe(allowed.caseId);
    expect(cases.cases).toHaveLength(1);
    expect(cases.cases[0]?.pendingExpert).toBe(true);
    await expect(subject.case(owner, allowed.caseId ?? '')).resolves.toMatchObject({
      accessVersion: 2,
      status: 'PENDING_EXPERT',
    });
  });

  it('returns model unavailable without blocking later expert sharing', async () => {
    const subject = new HealthService(
      new SetupRepo(),
      new InMemoryHealthRepository(),
      () => new Date('2026-07-14T09:00:00.000+05:30'),
      idSource(),
      undefined,
      new UnavailableHealthVisionExtractor(),
    );
    const { submitted } = await submittedReport(subject);

    expect(submitted.state).toBe('MODEL_UNAVAILABLE');
    expect(submitted.triage?.state).toBe('UNCLEAR');
    expect(submitted.sharingDecision).toBe('PENDING');
  });

  it('rejects cross-owner and unusable-only submissions', async () => {
    const subject = service();
    await expect(
      subject.listReports(
        { ...owner, subjectId: '00000000-0000-4000-8000-999999999999' },
        plotId,
      ),
    ).rejects.toBeInstanceOf(HealthRejectedError);

    const draft = await subject.saveDraft({
      owner,
      plotId,
      request: {
        commandId: '00000000-0000-4000-8000-000000000908',
        expectedRevision: 0,
        schemaVersion: 'health-report-draft-v1',
        cropName: 'Rice',
        language: 'mr',
        symptomSummary: 'Dark image only.',
        answers: [],
        clientRecordedAt: '2026-07-14T09:00:00.000+05:30',
        timezone: 'Asia/Kolkata',
      },
    });
    const media = await subject.attachMedia({
      owner,
      reportId: draft.reportId,
      request: {
        commandId: '00000000-0000-4000-8000-000000000909',
        expectedRevision: draft.etagRevision,
        assetId: '00000000-0000-4000-8000-000000000bad',
        requiredView: 'AFFECTED_LEAF_TOP',
        consentAccessVersion: 1,
        clientRecordedAt: '2026-07-14T09:01:00.000+05:30',
        timezone: 'Asia/Kolkata',
      },
    });
    await expect(
      subject.submit({
        owner,
        reportId: draft.reportId,
        request: {
          commandId: '00000000-0000-4000-8000-000000000910',
          expectedRevision: media.etagRevision,
          clientSubmittedAt: '2026-07-14T09:02:00.000+05:30',
          timezone: 'Asia/Kolkata',
        },
      }),
    ).rejects.toMatchObject({ code: 'HEALTH_MEDIA_UNUSABLE' });
  });
});
