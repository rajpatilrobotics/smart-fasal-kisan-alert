import {
  CreateMediaUploadIntentResponseSchema,
  MediaOperationAcceptedResponseSchema,
  SyncBatchResponseV2Schema,
  SyncBootstrapResponseSchema,
  SyncStreamOpenResponseSchema,
} from '@smart-fasal/contracts/schemas';
import { describe, expect, it, vi } from 'vitest';

import type {
  DomainOperationId,
  DomainOperationRequest,
  VerifiedRequestBoundary,
} from './boundary';
import { InMemoryMilestoneTwoOperations, syncCommandRequestHash } from './milestone-two-operations';

const NOW = '2026-07-13T10:00:00.000Z';
const SUBJECT = '00000000-0000-4000-8000-000000000101';
const OTHER_SUBJECT = '00000000-0000-4000-8000-000000000102';
const ROLE_CONTEXT = '00000000-0000-4000-8000-000000000201';
const COMMAND = '00000000-0000-4000-8000-000000000301';
const CLIENT_EVENT = '00000000-0000-4000-8000-000000000302';
const BATCH = '00000000-0000-4000-8000-000000000303';
const SECOND_BATCH = '00000000-0000-4000-8000-000000000304';
const TARGET = '00000000-0000-4000-8000-000000000305';
const POLICY = '00000000-0000-4000-8000-000000000305';
const SESSION = '00000000-0000-4000-8000-000000000306';
const EVENT_V7 = '018f0000-0000-7000-8000-000000000001';
const DIGEST = `sha256:${'a'.repeat(64)}`;

function boundary(subjectId = SUBJECT): VerifiedRequestBoundary {
  return {
    correlationId: '00000000-0000-4000-8000-000000000001',
    environment: 'local',
    origin: 'http://farmer.test',
    installationId: 'farmer-installation',
    clientBuild: 'm2-test',
    clientSchemaVersion: 1,
    identity: {
      subjectId,
      subjectType: 'FARMER',
      environment: 'local',
      expiresAt: '2026-07-13T11:00:00.000Z',
      securityVersion: 1,
      mfaState: 'NOT_REQUIRED',
    },
    appCheck: {
      appId: 'farmer-app',
      environment: 'local',
      expiresAt: '2026-07-13T11:00:00.000Z',
    },
    roleContextId: ROLE_CONTEXT,
    authorization: {
      environment: 'local',
      subjectId,
      roleContextId: ROLE_CONTEXT,
      roleType: 'FARMER',
      purposeCode: 'farmer.self_service',
      authorizationVersion: 1,
      capabilitySetVersion: 1,
      capabilities: [],
    },
  };
}

function request(
  operationId: DomainOperationId,
  body?: unknown,
  params?: Readonly<Record<string, string>>,
  requestBoundary = boundary(),
): DomainOperationRequest {
  return {
    operationId,
    boundary: requestBoundary,
    ...(body === undefined ? {} : { body }),
    ...(params === undefined ? {} : { params }),
  };
}

function streamOpenBody() {
  return {
    streamProtocolVersion: 1,
    clientBuild: 'm2-test',
    localDatabaseSchemaVersion: 1,
    stakeholder: 'FARMER',
    deviceMode: 'PERSONAL',
    commandVersions: { minimum: 1, maximum: 1 },
    clientEventVersions: { minimum: 1, maximum: 1 },
    projectionVersions: { minimum: 1, maximum: 1 },
    mediaVersions: { minimum: 1, maximum: 1 },
  } as const;
}

function syncBatch(streamId: string, cursor: string) {
  const command = {
    commandId: COMMAND,
    clientEventIds: [CLIENT_EVENT],
    operation: 'RecordConsentDecision',
    commandSchemaVersion: 1,
    target: { type: 'consentDecision', id: TARGET },
    expectedRevision: 0,
    occurredAt: NOW,
    timezone: 'Asia/Kolkata',
    localSequence: 1,
    causalCommandIds: [],
    requestHash: DIGEST,
    payload: {
      decision: 'ALLOW',
      scopeKey: 'location.processing',
      purposeKey: 'farmer.self_service',
      targetKind: 'ACCOUNT',
      targetId: SUBJECT,
      policyVersionId: POLICY,
    },
  } as const;
  return {
    syncBatchVersion: 1,
    batchId: BATCH,
    streamId,
    cursor,
    clientBuild: 'm2-test',
    commands: [{ ...command, requestHash: syncCommandRequestHash(command) }],
    feedLimit: 25,
  } as const;
}

function operationFixture(now: () => Date = () => new Date(NOW)) {
  let counter = 400;
  const commandExecutor = {
    execute: vi.fn(() => Promise.resolve({ authoritativeRevision: 1, eventIds: [EVENT_V7] })),
  };
  const authorizeMedia = vi.fn(() => true);
  const inspectQuarantineObject = vi.fn(({ objectGeneration }: { objectGeneration: string }) =>
    Promise.resolve({
      objectGeneration,
      sha256: DIGEST,
      sizeBytes: 128,
      contentType: 'audio/wav',
    }),
  );
  const operations = new InMemoryMilestoneTwoOperations({
    commandExecutor,
    signServerTime: () => 'local-test-signature-0001',
    now,
    nextUuid: () => `00000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`,
    authorizeMedia,
    inspectQuarantineObject,
  });
  return { operations, commandExecutor, authorizeMedia, inspectQuarantineObject };
}

describe('Milestone 2 Domain API operations', () => {
  it('requires bootstrap, applies the M1 consent command once and replays the batch safely', async () => {
    const { operations, commandExecutor } = operationFixture();
    const opened = SyncStreamOpenResponseSchema.parse(
      await operations.execute(request('openFarmerSyncStream', streamOpenBody())),
    );
    expect(opened.bootstrapRequired).toBe(true);

    await expect(
      operations.execute(request('syncFarmerBatch', syncBatch(opened.streamId, opened.cursor))),
    ).rejects.toMatchObject({ code: 'SYNC_BOOTSTRAP_REQUIRED' });

    const bootstrap = SyncBootstrapResponseSchema.parse(
      await operations.execute(
        request('bootstrapFarmerSync', {
          bootstrapVersion: 1,
          streamId: opened.streamId,
          localDatabaseSchemaVersion: 1,
          supportedProjectionVersions: { minimum: 1, maximum: 1 },
        }),
      ),
    );
    expect(bootstrap.projections).toEqual([]);

    const batch = syncBatch(opened.streamId, bootstrap.cursor);
    const accepted = SyncBatchResponseV2Schema.parse(
      await operations.execute(request('syncFarmerBatch', batch)),
    );
    const replayed = SyncBatchResponseV2Schema.parse(
      await operations.execute(request('syncFarmerBatch', batch)),
    );
    expect(accepted.dispositions[0]).toMatchObject({ disposition: 'ACCEPTED' });
    expect(replayed).toEqual(accepted);
    expect(commandExecutor.execute).toHaveBeenCalledTimes(1);

    const alreadyAccepted = SyncBatchResponseV2Schema.parse(
      await operations.execute(
        request('syncFarmerBatch', {
          ...batch,
          batchId: SECOND_BATCH,
          cursor: accepted.nextCursor,
        }),
      ),
    );
    expect(alreadyAccepted.dispositions[0]).toMatchObject({ disposition: 'ALREADY_ACCEPTED' });
    expect(commandExecutor.execute).toHaveBeenCalledTimes(1);

    await expect(
      operations.execute(
        request('syncFarmerBatch', {
          ...batch,
          commands: [{ ...batch.commands[0], requestHash: `sha256:${'b'.repeat(64)}` }],
        }),
      ),
    ).rejects.toMatchObject({ code: 'SYNC_BATCH_ID_REUSED' });
  });

  it('binds a stream to the exact Farmer and installation', async () => {
    const { operations } = operationFixture();
    const opened = SyncStreamOpenResponseSchema.parse(
      await operations.execute(request('openFarmerSyncStream', streamOpenBody())),
    );
    await expect(
      operations.execute(
        request(
          'bootstrapFarmerSync',
          {
            bootstrapVersion: 1,
            streamId: opened.streamId,
            localDatabaseSchemaVersion: 1,
            supportedProjectionVersions: { minimum: 1, maximum: 1 },
          },
          undefined,
          boundary(OTHER_SUBJECT),
        ),
      ),
    ).rejects.toMatchObject({ code: 'SYNC_CURSOR_INVALID' });
  });

  it('rejects a tampered opaque cursor and a client-invented command hash', async () => {
    const { operations } = operationFixture();
    const opened = SyncStreamOpenResponseSchema.parse(
      await operations.execute(request('openFarmerSyncStream', streamOpenBody())),
    );
    const bootstrap = SyncBootstrapResponseSchema.parse(
      await operations.execute(
        request('bootstrapFarmerSync', {
          bootstrapVersion: 1,
          streamId: opened.streamId,
          localDatabaseSchemaVersion: 1,
          supportedProjectionVersions: { minimum: 1, maximum: 1 },
        }),
      ),
    );
    await expect(
      operations.execute(
        request('syncFarmerBatch', syncBatch(opened.streamId, `${bootstrap.cursor}x`)),
      ),
    ).rejects.toMatchObject({ code: 'SYNC_CURSOR_INVALID' });

    const batch = syncBatch(opened.streamId, bootstrap.cursor);
    await expect(
      operations.execute(
        request('syncFarmerBatch', {
          ...batch,
          batchId: SECOND_BATCH,
          commands: [{ ...batch.commands[0], requestHash: DIGEST }],
        }),
      ),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('distinguishes an expired stream cursor from a forged cursor', async () => {
    let currentTime = new Date(NOW);
    const { operations } = operationFixture(() => currentTime);
    const opened = SyncStreamOpenResponseSchema.parse(
      await operations.execute(request('openFarmerSyncStream', streamOpenBody())),
    );
    currentTime = new Date(Date.parse(NOW) + 15 * 60 * 1_000);
    await expect(
      operations.execute(
        request('bootstrapFarmerSync', {
          bootstrapVersion: 1,
          streamId: opened.streamId,
          localDatabaseSchemaVersion: 1,
          supportedProjectionVersions: { minimum: 1, maximum: 1 },
        }),
      ),
    ).rejects.toMatchObject({ code: 'SYNC_CURSOR_EXPIRED', status: 410 });
  });

  it('derives one stable device binding and rejects client mode or schema promotion', async () => {
    const { operations } = operationFixture();
    const first = SyncStreamOpenResponseSchema.parse(
      await operations.execute(
        request('openFarmerSyncStream', {
          ...streamOpenBody(),
          localDatabaseSchemaVersion: 2,
        }),
      ),
    );
    const bootstrap = SyncBootstrapResponseSchema.parse(
      await operations.execute(
        request('bootstrapFarmerSync', {
          bootstrapVersion: 1,
          streamId: first.streamId,
          localDatabaseSchemaVersion: 2,
          supportedProjectionVersions: { minimum: 1, maximum: 1 },
        }),
      ),
    );
    const resumed = SyncStreamOpenResponseSchema.parse(
      await operations.execute(
        request('openFarmerSyncStream', {
          ...streamOpenBody(),
          localDatabaseSchemaVersion: 2,
          priorStreamId: first.streamId,
          priorCursor: bootstrap.cursor,
        }),
      ),
    );
    expect(resumed.subjectDeviceBindingId).toBe(first.subjectDeviceBindingId);
    expect(resumed.bootstrapRequired).toBe(false);

    await expect(
      operations.execute(
        request('openFarmerSyncStream', { ...streamOpenBody(), deviceMode: 'RSK_ASSISTED' }),
      ),
    ).rejects.toMatchObject({ code: 'DEVICE_BINDING_MISMATCH' });
    await expect(
      operations.execute(
        request('openFarmerSyncStream', {
          ...streamOpenBody(),
          localDatabaseSchemaVersion: 3,
        }),
      ),
    ).rejects.toMatchObject({ code: 'SYNC_SCHEMA_UNSUPPORTED' });
  });

  it('keeps upload bytes quarantined and refuses mismatched finalization metadata', async () => {
    const { operations, authorizeMedia, inspectQuarantineObject } = operationFixture();
    const mediaRequest = {
      mediaProtocolVersion: 1,
      purpose: 'VOICE_OFFLINE_AUDIO',
      owner: { ownerType: 'VOICE_SESSION', ownerId: SESSION },
      expectedSha256: DIGEST,
      claimedMimeType: 'audio/wav',
      declaredSizeBytes: 128,
      declaredDurationSeconds: 2,
      consentAccessVersion: 1,
    } as const;
    const createBoundary = {
      ...boundary(),
      idempotencyKey: '00000000-0000-4000-8000-000000000498',
    };
    const intent = CreateMediaUploadIntentResponseSchema.parse(
      await operations.execute(
        request('createMediaUploadIntent', mediaRequest, undefined, createBoundary),
      ),
    );
    expect(Date.parse(intent.expiresAt) - Date.parse(NOW)).toBe(10 * 60 * 1_000);
    await expect(
      operations.execute(
        request('createMediaUploadIntent', mediaRequest, undefined, createBoundary),
      ),
    ).rejects.toMatchObject({ code: 'UPLOAD_INTENT_EXPIRED', status: 410 });

    await expect(
      operations.execute(
        request(
          'finalizeMediaUploadIntent',
          { objectGeneration: '17', sha256: `sha256:${'b'.repeat(64)}`, finalSizeBytes: 128 },
          { intentId: intent.intentId },
        ),
      ),
    ).rejects.toMatchObject({ code: 'MEDIA_INTEGRITY_MISMATCH', status: 422 });

    const accepted = MediaOperationAcceptedResponseSchema.parse(
      await operations.execute(
        request(
          'finalizeMediaUploadIntent',
          { objectGeneration: '17', sha256: DIGEST, finalSizeBytes: 128 },
          { intentId: intent.intentId },
          { ...boundary(), idempotencyKey: '00000000-0000-4000-8000-000000000499' },
        ),
      ),
    );
    expect(accepted).toMatchObject({ assetId: intent.assetId, state: 'SCANNING' });
    expect(inspectQuarantineObject).toHaveBeenCalledWith(
      expect.objectContaining({ objectGeneration: '17' }),
    );

    const replayed = MediaOperationAcceptedResponseSchema.parse(
      await operations.execute(
        request(
          'finalizeMediaUploadIntent',
          { objectGeneration: '17', sha256: DIGEST, finalSizeBytes: 128 },
          { intentId: intent.intentId },
          { ...boundary(), idempotencyKey: '00000000-0000-4000-8000-000000000499' },
        ),
      ),
    );
    expect(replayed).toEqual(accepted);

    await expect(
      operations.execute(
        request(
          'cancelMediaUploadIntent',
          undefined,
          { intentId: intent.intentId },
          { ...boundary(), idempotencyKey: '00000000-0000-4000-8000-000000000499' },
        ),
      ),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });

    authorizeMedia.mockReturnValue(false);
    await expect(
      operations.execute(request('getMediaAssetStatus', undefined, { assetId: intent.assetId })),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_DENIED', status: 404 });
  });

  it('issues a one-time upload capability once under concurrent idempotent replay', async () => {
    const { operations } = operationFixture();
    const mediaRequest = {
      mediaProtocolVersion: 1,
      purpose: 'VOICE_OFFLINE_AUDIO',
      owner: { ownerType: 'VOICE_SESSION', ownerId: SESSION },
      expectedSha256: DIGEST,
      claimedMimeType: 'audio/wav',
      declaredSizeBytes: 128,
      declaredDurationSeconds: 2,
      consentAccessVersion: 1,
    } as const;
    const createBoundary = {
      ...boundary(),
      idempotencyKey: '00000000-0000-4000-8000-000000000497',
    };
    const results = await Promise.allSettled([
      operations.execute(
        request('createMediaUploadIntent', mediaRequest, undefined, createBoundary),
      ),
      operations.execute(
        request('createMediaUploadIntent', mediaRequest, undefined, createBoundary),
      ),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejection = results.find((result) => result.status === 'rejected');
    expect(rejection).toMatchObject({
      status: 'rejected',
      reason: { code: 'UPLOAD_INTENT_EXPIRED', status: 410 },
    });
  });
});
