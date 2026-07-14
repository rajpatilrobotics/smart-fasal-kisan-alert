import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import type { SyncBatchResponse, SyncCommandEnvelope } from '@smart-fasal/contracts/schemas';

import {
  createPartitionDatabaseName,
  decryptJson,
  encryptJson,
  generatePartitionKey,
} from './crypto.js';
import { FarmerOfflineDatabase } from './database.js';
import {
  DeviceWrappedPartitionKeyProvider,
  type PartitionKeyEnvelopeStore,
  type PartitionWrappingKeySource,
} from './key-provider.js';
import {
  calculateBootstrapSnapshotChecksum,
  FarmerOfflineStore,
  LockedRecoveryRequiredError,
  type LocalCommitInput,
  type SyncBootstrapSnapshot,
} from './store.js';

const IDS = {
  binding: '10000000-0000-4000-8000-000000000001',
  stream: '10000000-0000-4000-8000-000000000002',
  target: '10000000-0000-4000-8000-000000000003',
  policy: '10000000-0000-4000-8000-000000000004',
  actor: '10000000-0000-4000-8000-000000000005',
  projection: '10000000-0000-4000-8000-000000000006',
  correlation: '10000000-0000-4000-8000-000000000007',
} as const;

function localCommit(sequence: number, suffix: string): LocalCommitInput {
  const eventId = `10000000-0000-7000-8000-${suffix.padStart(12, '0')}`;
  const commandId = `20000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
  const command = {
    commandId,
    clientEventIds: [eventId],
    operation: 'RecordConsentDecision',
    commandSchemaVersion: 1,
    target: { type: 'consentDecision', id: IDS.target },
    expectedRevision: 1,
    occurredAt: '2026-07-13T08:10:00.000Z',
    timezone: 'Asia/Kolkata',
    localSequence: sequence,
    causalCommandIds: [],
    requestHash: `sha256:${'a'.repeat(64)}`,
    payload: {
      decision: 'DENY',
      scopeKey: 'audio.storage',
      purposeKey: 'farmer.self_service',
      targetKind: 'ACCOUNT',
      targetId: IDS.target,
      policyVersionId: IDS.policy,
    },
  } as SyncCommandEnvelope;
  return {
    event: {
      eventId,
      eventName: 'consent.decision_saved_local',
      eventSchemaVersion: 1,
      commandId,
      actorRef: IDS.actor,
      deviceRef: IDS.binding,
      localSequence: sequence,
      aggregateType: 'consentDecision',
      aggregateId: IDS.target,
      occurredAt: command.occurredAt,
      clientRecordedAt: command.occurredAt,
      timezone: command.timezone,
      baseRevision: command.expectedRevision,
      dataMode: 'LIVE',
      provenanceTypes: ['FARMER_REPORTED'],
      correlationId: IDS.correlation,
      payload: { privateChoice: `secret-${suffix}` },
    },
    projection: {
      projectionType: 'consent',
      projectionId: IDS.projection,
      projectionSchemaVersion: 1,
      dataMode: 'LIVE',
      payload: { privateChoice: `secret-${suffix}` },
    },
    command,
  };
}

async function open(
  binding: string = IDS.binding,
  deviceMode: 'PERSONAL' | 'TRUSTED_FAMILY' | 'RSK_ASSISTED' = 'PERSONAL',
  key?: CryptoKey,
) {
  const partitionKey = key ?? (await generatePartitionKey());
  const store = await FarmerOfflineStore.open({
    environment: 'local',
    subjectDeviceBindingId: binding,
    deviceMode,
    key: partitionKey,
  });
  return { store, key: partitionKey };
}

class MemoryEnvelopeStore implements PartitionKeyEnvelopeStore {
  readonly values = new Map<string, Awaited<ReturnType<PartitionKeyEnvelopeStore['load']>>>();

  load(partition: string) {
    return Promise.resolve(this.values.get(partition));
  }

  putIfAbsent(
    partition: string,
    envelope: NonNullable<Awaited<ReturnType<PartitionKeyEnvelopeStore['load']>>>,
  ) {
    const stored = this.values.get(partition) ?? envelope;
    this.values.set(partition, stored);
    return Promise.resolve(stored);
  }
}

class StaticWrappingKeySource implements PartitionWrappingKeySource {
  locks = 0;

  constructor(private readonly key: CryptoKey) {}

  unlock() {
    return Promise.resolve(this.key);
  }

  lock() {
    this.locks += 1;
  }
}

function acceptedResponse(
  input: LocalCommitInput,
  cursor: string,
  overrides: Partial<SyncBatchResponse> = {},
): SyncBatchResponse {
  return {
    batchId: '30000000-0000-4000-8000-000000000001',
    dispositions: [
      {
        commandId: input.command.commandId,
        clientEventIds: [input.event.eventId],
        acknowledgementId: '30000000-0000-4000-8000-000000000002',
        serverReceivedAt: '2026-07-13T08:11:00.000Z',
        disposition: 'ACCEPTED',
        authoritativeRevision: 2,
        serverEventIds: ['30000000-0000-7000-8000-000000000003'],
      },
    ],
    feedEvents: [
      {
        feedEventId: '30000000-0000-7000-8000-000000000004',
        sequence: 1,
        integrationEvent: {} as never,
        projectionDeltas: [
          {
            projectionType: input.projection.projectionType,
            projectionId: input.projection.projectionId,
            projectionSchemaVersion: 1,
            authoritativeRevision: 2,
            changeType: 'UPSERT',
            dataMode: 'LIVE',
            payloadClassification: 'C2',
            payload: { privateChoice: 'server-confirmed' },
            payloadChecksum:
              'sha256:486697a1bf195ad4ee3dec88c0d1f4bd981f56b54535b8fb49aee38944816900',
          },
        ],
      },
    ],
    nextCursor: cursor,
    highWaterMark: cursor,
    hasMore: false,
    serverTime: '2026-07-13T08:11:00.000Z',
    authorizationVersion: 1,
    ...overrides,
  };
}

function responseApplyInput(response: SyncBatchResponse, expectedBatchId = response.batchId) {
  return { expectedBatchId, response };
}

describe('Farmer offline partition', () => {
  it('derives a stable physical name without exposing environment or binding', async () => {
    const first = await createPartitionDatabaseName('local', IDS.binding, 'PERSONAL');
    const second = await createPartitionDatabaseName('local', IDS.binding, 'PERSONAL');
    const other = await createPartitionDatabaseName(
      'local',
      '10000000-0000-4000-8000-000000000099',
      'PERSONAL',
    );
    expect(first).toBe(second);
    expect(first).not.toContain('local');
    expect(first).not.toContain(IDS.binding);
    expect(other).not.toBe(first);
    await expect(
      createPartitionDatabaseName('local', IDS.binding, 'TRUSTED_FAMILY'),
    ).resolves.not.toBe(first);
  });

  it('binds ciphertext to its partition, store, record and schema AAD', async () => {
    const key = await generatePartitionKey();
    const aad = {
      partition: 'partition',
      store: 'outbox',
      recordId: 'command',
      schemaVersion: 1,
      index: { priority: 100, transportState: 'QUEUED' },
    };
    const encrypted = await encryptJson(key, aad, { protected: 'secret' });
    await expect(decryptJson(key, aad, encrypted)).resolves.toEqual({ protected: 'secret' });
    await expect(
      decryptJson(key, { ...aad, recordId: 'another-command' }, encrypted),
    ).rejects.toThrow('ENCRYPTED_RECORD_AAD_MISMATCH');
    await expect(
      decryptJson(key, { ...aad, index: { priority: 100, transportState: 'REJECTED' } }, encrypted),
    ).rejects.toThrow('ENCRYPTED_RECORD_AAD_MISMATCH');
  });

  it('reloads a non-local partition only through a persisted device-wrapped key envelope', async () => {
    const binding = '10000000-0000-4000-8000-000000000070';
    const directKey = await generatePartitionKey();
    await expect(
      FarmerOfflineStore.open({
        environment: 'preview',
        subjectDeviceBindingId: binding,
        deviceMode: 'PERSONAL',
        key: directKey,
      }),
    ).rejects.toThrow('DEVICE_WRAPPED_PARTITION_KEY_REQUIRED');

    const wrappingKey = await globalThis.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    const envelopes = new MemoryEnvelopeStore();
    const wrappingSource = new StaticWrappingKeySource(wrappingKey);
    const firstProvider = new DeviceWrappedPartitionKeyProvider(envelopes, wrappingSource);
    const first = await FarmerOfflineStore.open({
      environment: 'preview',
      subjectDeviceBindingId: binding,
      deviceMode: 'PERSONAL',
      keyProvider: firstProvider,
    });
    const input = localCommit(1, '70');
    await first.commitLocalAction(input);
    first.close();
    expect(wrappingSource.locks).toBe(1);

    const restarted = await FarmerOfflineStore.open({
      environment: 'preview',
      subjectDeviceBindingId: binding,
      deviceMode: 'PERSONAL',
      keyProvider: new DeviceWrappedPartitionKeyProvider(envelopes, wrappingSource),
    });
    await expect(restarted.getLocalEvent(input.event.eventId)).resolves.toEqual(input.event);
    restarted.close();
    expect(JSON.stringify([...envelopes.values.values()])).not.toContain('secret-70');
  });

  it('commits event, projection and outbox atomically and restores them after restart', async () => {
    const { store, key } = await open();
    const input = localCommit(1, '1');
    await expect(store.commitLocalAction(input)).resolves.toEqual({
      eventId: input.event.eventId,
      commandId: input.command.commandId,
      state: 'SAVED_ON_THIS_PHONE',
    });
    const databaseName = store.databaseName;
    store.close();

    const raw = new FarmerOfflineDatabase(databaseName);
    await raw.open();
    const rawEvent = await raw.localEvents.get(input.event.eventId);
    expect(JSON.stringify(rawEvent)).not.toContain('secret-1');
    expect(rawEvent?.encrypted.ciphertext.length).toBeGreaterThan(20);
    raw.close();

    const restarted = await FarmerOfflineStore.open({
      environment: 'local',
      subjectDeviceBindingId: IDS.binding,
      deviceMode: 'PERSONAL',
      key,
    });
    await expect(restarted.getLocalEvent(input.event.eventId)).resolves.toEqual(input.event);
    await expect(restarted.getProjection('consent', IDS.projection)).resolves.toMatchObject({
      authorityState: 'CURRENT_LOCAL',
      payload: { privateChoice: 'secret-1' },
    });
    await expect(restarted.listPendingCommands()).resolves.toEqual([input.command]);
    restarted.close();
  });

  it('saves an advisory response locally as the canonical offline sync command', async () => {
    const binding = '10000000-0000-4000-8000-000000000012';
    const { store } = await open(binding);
    const advisoryId = '10000000-0000-4000-8000-000000000112';
    const receipt = await store.saveAdvisoryResponse({
      eventId: '10000000-0000-7000-8000-000000000012',
      commandId: '20000000-0000-4000-8000-000000000012',
      advisoryId,
      expectedRevision: 3,
      response: 'SNOOZE',
      snoozeUntil: '2026-07-14T12:30:00.000Z',
      clientRecordedAt: '2026-07-14T09:30:00.000Z',
      timezone: 'Asia/Kolkata',
      actorRef: IDS.actor,
      deviceRef: binding,
      localSequence: 1,
      correlationId: IDS.correlation,
      dataMode: 'LIVE',
    });
    expect(receipt).toMatchObject({
      commandId: '20000000-0000-4000-8000-000000000012',
      state: 'SAVED_ON_THIS_PHONE',
    });
    await expect(store.listPendingCommands()).resolves.toMatchObject([
      {
        operation: 'RespondToAdvisory',
        target: { type: 'advisory', id: advisoryId },
        expectedRevision: 3,
        payload: {
          response: 'SNOOZE',
          snoozeUntil: '2026-07-14T12:30:00.000Z',
          clientRecordedAt: '2026-07-14T09:30:00.000Z',
          timezone: 'Asia/Kolkata',
        },
      },
    ]);
    await expect(
      store.getProjection('farmer.advisory.response', advisoryId),
    ).resolves.toMatchObject({
      authorityState: 'CURRENT_LOCAL',
      payload: {
        advisoryId,
        status: 'SAVED_ON_THIS_PHONE',
        response: 'SNOOZE',
      },
    });
    store.close();
  });

  it('rolls back earlier writes when the outbox insert fails', async () => {
    const binding = '10000000-0000-4000-8000-000000000010';
    const { store } = await open(binding);
    const first = localCommit(1, '10');
    await store.commitLocalAction(first);
    const second = localCommit(2, '11');
    const duplicateCommand = {
      ...second,
      event: { ...second.event, commandId: first.command.commandId },
      command: { ...second.command, commandId: first.command.commandId },
    };
    await expect(store.commitLocalAction(duplicateCommand)).rejects.toThrow();
    await expect(store.getLocalEvent(second.event.eventId)).resolves.toBeUndefined();
    await expect(store.getProjection('consent', IDS.projection)).resolves.toMatchObject({
      payload: { privateChoice: 'secret-10' },
    });
    expect(await store.retentionCounts()).toMatchObject({ localEvents: 1, outbox: 1 });
    store.close();
  });

  it('applies acknowledgements, projections and cursor atomically with cursor last', async () => {
    const binding = '10000000-0000-4000-8000-000000000020';
    const { store } = await open(binding);
    const input = localCommit(1, '20');
    await store.commitLocalAction(input);
    await store.setSyncStream({
      streamId: IDS.stream,
      cursor: 'cursor-0',
      authorizationVersion: 1,
      subjectDeviceBindingId: binding,
      scope: 'FARMER_SELF_SERVICE',
    });
    await store.applySyncResponse(responseApplyInput(acceptedResponse(input, 'cursor-1')));
    await expect(store.listPendingCommands()).resolves.toEqual([]);
    await expect(store.getProjection('consent', IDS.projection)).resolves.toMatchObject({
      authorityState: 'SERVER_CONFIRMED',
      authoritativeRevision: 2,
      payload: { privateChoice: 'server-confirmed' },
    });
    await expect(store.getSyncState()).resolves.toMatchObject({ cursor: 'cursor-1' });
    store.close();
  });

  it('keeps a rejected command pending and marks its local projection for reconciliation', async () => {
    const binding = '10000000-0000-4000-8000-000000000025';
    const { store } = await open(binding);
    const input = localCommit(1, '25');
    await store.commitLocalAction(input);
    await store.setSyncStream({
      streamId: IDS.stream,
      cursor: 'cursor-before-rejection',
      authorizationVersion: 1,
      subjectDeviceBindingId: binding,
      scope: 'FARMER_SELF_SERVICE',
    });
    await store.applySyncResponse(
      responseApplyInput(
        acceptedResponse(input, 'cursor-after-rejection', {
          feedEvents: [],
          dispositions: [
            {
              commandId: input.command.commandId,
              clientEventIds: [input.event.eventId],
              acknowledgementId: '30000000-0000-4000-8000-000000000025',
              serverReceivedAt: '2026-07-13T08:11:00.000Z',
              disposition: 'REJECTED',
              problemCode: 'EXPECTED_REVISION_MISMATCH',
              authoritativeRevision: 3,
              serverEventIds: [],
            },
          ],
        }),
      ),
    );
    await expect(store.listPendingCommands()).resolves.toEqual([]);
    expect(await store.retentionCounts()).toMatchObject({ outbox: 1 });
    await expect(store.getProjection('consent', IDS.projection)).resolves.toMatchObject({
      authorityState: 'NEEDS_RECONCILIATION',
      payload: { privateChoice: 'secret-25' },
    });
    await expect(store.getSyncState()).resolves.toMatchObject({ cursor: 'cursor-after-rejection' });
    store.close();
  });

  it('rejects a response for another batch before changing the cursor or outbox', async () => {
    const binding = '10000000-0000-4000-8000-000000000026';
    const { store } = await open(binding);
    const input = localCommit(1, '26');
    await store.commitLocalAction(input);
    await store.setSyncStream({
      streamId: IDS.stream,
      cursor: 'cursor-before-batch-mismatch',
      authorizationVersion: 1,
      subjectDeviceBindingId: binding,
      scope: 'FARMER_SELF_SERVICE',
    });
    const response = acceptedResponse(input, 'cursor-must-not-commit');
    await expect(
      store.applySyncResponse(responseApplyInput(response, '30000000-0000-4000-8000-000000000999')),
    ).rejects.toThrow('SYNC_RESPONSE_BATCH_MISMATCH');
    await expect(store.getSyncState()).resolves.toMatchObject({
      cursor: 'cursor-before-batch-mismatch',
    });
    await expect(store.listPendingCommands()).resolves.toEqual([input.command]);
    expect(await store.retentionCounts()).toMatchObject({ outbox: 1 });
    store.close();
  });

  it('rejects a response for another authorization version before changing local state', async () => {
    const binding = '10000000-0000-4000-8000-000000000027';
    const { store } = await open(binding);
    const input = localCommit(1, '27');
    await store.commitLocalAction(input);
    await store.setSyncStream({
      streamId: IDS.stream,
      cursor: 'cursor-before-authorization-mismatch',
      authorizationVersion: 1,
      subjectDeviceBindingId: binding,
      scope: 'FARMER_SELF_SERVICE',
    });
    const response = acceptedResponse(input, 'cursor-must-not-commit', {
      authorizationVersion: 2,
    });
    await expect(store.applySyncResponse(responseApplyInput(response))).rejects.toThrow(
      'SYNC_AUTHORIZATION_VERSION_MISMATCH',
    );
    await expect(store.getSyncState()).resolves.toMatchObject({
      cursor: 'cursor-before-authorization-mismatch',
      authorizationVersion: 1,
    });
    await expect(store.listPendingCommands()).resolves.toEqual([input.command]);
    expect(await store.retentionCounts()).toMatchObject({ outbox: 1 });
    store.close();
  });

  it('retains the old cursor and outbox when any response write fails', async () => {
    const binding = '10000000-0000-4000-8000-000000000030';
    const { store } = await open(binding);
    const first = localCommit(1, '30');
    const second = localCommit(2, '31');
    await store.commitLocalAction(first);
    await store.commitLocalAction(second);
    await store.setSyncStream({
      streamId: IDS.stream,
      cursor: 'cursor-old',
      authorizationVersion: 1,
      subjectDeviceBindingId: binding,
      scope: 'FARMER_SELF_SERVICE',
    });
    const acknowledgementId = '30000000-0000-4000-8000-000000000099';
    const response = acceptedResponse(first, 'cursor-must-not-commit', {
      feedEvents: [],
      dispositions: [
        {
          commandId: first.command.commandId,
          clientEventIds: [first.event.eventId],
          acknowledgementId,
          serverReceivedAt: '2026-07-13T08:11:00.000Z',
          disposition: 'ACCEPTED',
          authoritativeRevision: 2,
          serverEventIds: ['30000000-0000-7000-8000-000000000030'],
        },
        {
          commandId: second.command.commandId,
          clientEventIds: [second.event.eventId],
          acknowledgementId,
          serverReceivedAt: '2026-07-13T08:11:00.000Z',
          disposition: 'ACCEPTED',
          authoritativeRevision: 2,
          serverEventIds: ['30000000-0000-7000-8000-000000000031'],
        },
      ],
    });
    await expect(store.applySyncResponse(responseApplyInput(response))).rejects.toThrow();
    await expect(store.getSyncState()).resolves.toMatchObject({ cursor: 'cursor-old' });
    expect(await store.retentionCounts()).toMatchObject({ outbox: 2 });
    store.close();
  });

  it('bootstraps the server base without deleting local work, media or tombstones', async () => {
    const binding = '10000000-0000-4000-8000-000000000040';
    const { store } = await open(binding);
    const input = localCommit(1, '40');
    await store.commitLocalAction(input);
    await store.reserveMedia({
      mediaId: '40000000-0000-4000-8000-000000000001',
      mediaSchemaVersion: 1,
      priority: 20,
      payload: { protectedMediaMetadata: 'kept' },
    });
    await store.setSyncStream({
      streamId: IDS.stream,
      cursor: 'cursor-before-bootstrap',
      authorizationVersion: 1,
      subjectDeviceBindingId: binding,
      scope: 'FARMER_SELF_SERVICE',
    });
    const bootstrapGeneratedAt = new Date().toISOString();
    const snapshotWithoutChecksum = {
      streamId: IDS.stream,
      snapshotSchemaVersion: 1,
      generatedAt: bootstrapGeneratedAt,
      expiresAt: new Date(Date.parse(bootstrapGeneratedAt) + 5 * 60_000).toISOString(),
      projections: [
        {
          projectionType: 'consent',
          projectionId: IDS.projection,
          projectionSchemaVersion: 1,
          authoritativeRevision: 5,
          changeType: 'UPSERT',
          dataMode: 'LIVE',
          payloadClassification: 'C2',
          payload: { privateChoice: 'bootstrap-base' },
          payloadChecksum:
            'sha256:536b77f9646be97ca0181a5bd8674b93f60ee1f3e8f78e8ab55aa90a009df525',
        },
      ],
      tombstones: [
        {
          projectionType: 'old-record',
          projectionId: '40000000-0000-4000-8000-000000000002',
          deletionEpoch: 3,
          minimumResurrectionRevision: 9,
        },
      ],
      highWaterMark: 'watermark-bootstrap',
      cursor: 'cursor-bootstrap',
      authorizationVersion: 1,
    } satisfies Omit<SyncBootstrapSnapshot, 'snapshotChecksum'>;
    const snapshot: SyncBootstrapSnapshot = {
      ...snapshotWithoutChecksum,
      snapshotChecksum: await calculateBootstrapSnapshotChecksum(snapshotWithoutChecksum),
    };
    await store.applyBootstrap(snapshot);
    expect(await store.retentionCounts()).toMatchObject({
      localEvents: 1,
      outbox: 1,
      mediaBlobs: 1,
      mediaUploads: 1,
      tombstones: 1,
    });
    await expect(store.getProjection('consent', IDS.projection)).resolves.toMatchObject({
      authorityState: 'CURRENT_LOCAL',
      authoritativeRevision: 5,
      payload: { privateChoice: 'secret-40' },
    });
    await expect(store.getSyncState()).resolves.toMatchObject({ cursor: 'cursor-bootstrap' });
    store.close();
  });

  it('rejects stale, tampered or authorization-rollback bootstraps before local writes', async () => {
    const binding = '10000000-0000-4000-8000-000000000041';
    const { store } = await open(binding);
    await store.setSyncStream({
      streamId: IDS.stream,
      cursor: 'cursor-protected',
      authorizationVersion: 2,
      subjectDeviceBindingId: binding,
      scope: 'FARMER_SELF_SERVICE',
    });
    const generatedAt = new Date().toISOString();
    const base = {
      streamId: IDS.stream,
      snapshotSchemaVersion: 1,
      generatedAt,
      expiresAt: new Date(Date.parse(generatedAt) + 5 * 60_000).toISOString(),
      projections: [],
      tombstones: [],
      highWaterMark: 'watermark-new',
      cursor: 'cursor-new',
      authorizationVersion: 2,
    } satisfies Omit<SyncBootstrapSnapshot, 'snapshotChecksum'>;
    const checksum = await calculateBootstrapSnapshotChecksum(base);

    await expect(
      store.applyBootstrap({ ...base, snapshotChecksum: `sha256:${'0'.repeat(64)}` }),
    ).rejects.toThrow('SYNC_BOOTSTRAP_CHECKSUM_MISMATCH');
    await expect(
      store.applyBootstrap({ ...base, authorizationVersion: 1, snapshotChecksum: checksum }),
    ).rejects.toThrow('SYNC_AUTHORIZATION_VERSION_MISMATCH');
    const expired = {
      ...base,
      generatedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      expiresAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    };
    await expect(
      store.applyBootstrap({
        ...expired,
        snapshotChecksum: await calculateBootstrapSnapshotChecksum(expired),
      }),
    ).rejects.toThrow('SYNC_BOOTSTRAP_EXPIRED');
    await expect(store.getSyncState()).resolves.toMatchObject({
      cursor: 'cursor-protected',
      authorizationVersion: 2,
    });
    store.close();
  });

  it('locks an unsupported queue for forward recovery without deleting it', async () => {
    const binding = '10000000-0000-4000-8000-000000000050';
    const { store, key } = await open(binding);
    const input = localCommit(1, '50');
    await store.commitLocalAction(input);
    const databaseName = store.databaseName;
    store.close();
    const raw = new FarmerOfflineDatabase(databaseName);
    await raw.open();
    const row = await raw.outbox.get(input.command.commandId);
    if (row === undefined) throw new Error('test outbox row missing');
    const unsupportedRow = { ...row, commandSchemaVersion: 99 };
    await raw.outbox.put({
      ...unsupportedRow,
      encrypted: await encryptJson(
        key,
        {
          partition: databaseName,
          store: 'outbox',
          recordId: unsupportedRow.commandId,
          schemaVersion: unsupportedRow.commandSchemaVersion,
          index: {
            attemptCount: unsupportedRow.attemptCount,
            localSequence: unsupportedRow.localSequence,
            nextAttemptAt: unsupportedRow.nextAttemptAt,
            priority: unsupportedRow.priority,
            transportState: unsupportedRow.transportState,
          },
        },
        input.command,
      ),
    });
    raw.close();

    const recovered = await FarmerOfflineStore.open({
      environment: 'local',
      subjectDeviceBindingId: binding,
      deviceMode: 'PERSONAL',
      key,
    });
    await expect(
      recovered.verifySchemaCompatibility({
        localDatabase: { minimum: 1, maximum: 2 },
        command: { minimum: 1, maximum: 1 },
        clientEvent: { minimum: 1, maximum: 1 },
        projection: { minimum: 1, maximum: 1 },
        media: { minimum: 1, maximum: 1 },
      }),
    ).resolves.toMatchObject({ status: 'LOCKED_RECOVERY' });
    await expect(recovered.listPendingCommands()).rejects.toBeInstanceOf(
      LockedRecoveryRequiredError,
    );
    expect(await recovered.retentionCounts()).toMatchObject({ outbox: 1, localEvents: 1 });
    recovered.close();
  });

  it('locks recovery when a clear IndexedDB routing index is altered', async () => {
    const binding = '10000000-0000-4000-8000-000000000071';
    const { store, key } = await open(binding);
    const input = localCommit(1, '71');
    await store.commitLocalAction(input);
    const databaseName = store.databaseName;
    store.close();
    const raw = new FarmerOfflineDatabase(databaseName);
    await raw.open();
    const row = await raw.outbox.get(input.command.commandId);
    if (row === undefined) throw new Error('test outbox row missing');
    await raw.outbox.put({ ...row, transportState: 'REJECTED' });
    raw.close();

    await expect(
      FarmerOfflineStore.open({
        environment: 'local',
        subjectDeviceBindingId: binding,
        deviceMode: 'PERSONAL',
        key,
      }),
    ).rejects.toThrow('LOCAL_INDEX_INTEGRITY_FAILED');
  });

  it('blocks a shared-user switch or locks pending work away from the next identity', async () => {
    const binding = '10000000-0000-4000-8000-000000000060';
    const { store, key } = await open(binding, 'TRUSTED_FAMILY');
    const input = localCommit(1, '60');
    await store.commitLocalAction(input);
    await expect(store.prepareForUserSwitch({ authorizeLockedRecovery: false })).resolves.toEqual({
      status: 'BLOCKED_UNSYNCED',
      pendingItems: 1,
    });
    await expect(store.getLocalEvent(input.event.eventId)).resolves.toBeDefined();
    await expect(store.prepareForUserSwitch({ authorizeLockedRecovery: true })).resolves.toEqual({
      status: 'LOCKED_RECOVERY',
      pendingItems: 1,
    });
    await expect(store.getLocalEvent(input.event.eventId)).rejects.toBeInstanceOf(
      LockedRecoveryRequiredError,
    );
    store.close();

    const locked = await FarmerOfflineStore.open({
      environment: 'local',
      subjectDeviceBindingId: binding,
      deviceMode: 'TRUSTED_FAMILY',
      key,
    });
    await expect(locked.unlock({ allowRecovery: false })).rejects.toBeInstanceOf(
      LockedRecoveryRequiredError,
    );
    await locked.unlock({ allowRecovery: true });
    await expect(locked.getLocalEvent(input.event.eventId)).resolves.toBeDefined();

    const other = await open(
      '10000000-0000-4000-8000-000000000061',
      'TRUSTED_FAMILY',
      await generatePartitionKey(),
    );
    expect(await other.store.retentionCounts()).toMatchObject({ localEvents: 0, outbox: 0 });
    locked.close();
    other.store.close();
  });
});
