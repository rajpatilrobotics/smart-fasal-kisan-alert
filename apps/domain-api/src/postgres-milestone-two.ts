import { createHash, randomUUID } from 'node:crypto';

import {
  CreateMediaUploadIntentRequestSchema,
  FinalizeMediaUploadIntentRequestSchema,
  SyncBatchSchema,
  SyncBootstrapRequestSchema,
  SyncConflictResolutionRequestSchema,
  SyncStreamOpenRequestSchema,
  type DeviceMode,
  type SyncBatch,
  type SyncCommandDisposition,
} from '@smart-fasal/contracts/schemas';
import { canonicalize } from 'json-canonicalize';

import {
  ApiBoundaryProblem,
  dependencyUnavailable,
  type DomainOperationAdapter,
  type DomainOperationRequest,
  type VerifiedRequestBoundary,
} from './boundary.js';

const STREAM_TTL_MS = 15 * 60 * 1_000;
const INTENT_TTL_MS = 10 * 60 * 1_000;
const LOCAL_DATABASE_SCHEMA_VERSION = 2;
const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export interface PostgresMilestoneTwoCommandExecutor {
  execute(input: {
    boundary: VerifiedRequestBoundary;
    command: SyncBatch['commands'][number];
  }): Promise<{ authoritativeRevision: number; eventIds: readonly string[] }>;
}

export interface ResumableUploadCapabilityProvider {
  initiate(input: {
    intentId: string;
    assetId: string;
    purpose: string;
    claimedMimeType: string;
    declaredSizeBytes: number;
    expectedSha256: string;
    expiresAt: string;
  }): Promise<{
    resumableUploadUri: string;
    storageObjectName: string;
    generationPrecondition: '0';
  }>;
  inspect(input: { storageObjectName: string; objectGeneration: string }): Promise<{
    objectGeneration: string;
    sha256: string;
    sizeBytes: number;
    contentType: string;
  }>;
}

export interface MilestoneTwoDeviceBinding {
  subjectDeviceBindingId: string;
  deviceMode: DeviceMode;
}

export interface MilestoneTwoStreamRecord {
  streamId: string;
  environment: string;
  subjectId: string;
  subjectDeviceBindingId: string;
  authorizationVersion: number;
  deviceMode: DeviceMode;
  clientBuild: string;
  localDatabaseSchemaVersion: number;
  commandVersion: number;
  clientEventVersion: number;
  projectionVersion: number;
  mediaVersion: number;
  cursor: string;
  highWaterMark: string;
  state: 'OPEN' | 'BOOTSTRAP_REQUIRED' | 'LOCKED_RECOVERY' | 'CLOSED';
  openedAt: string;
  expiresAt: string;
}

export interface MilestoneTwoMediaRecord {
  intentId: string;
  assetId: string;
  purpose: string;
  ownerType: string;
  ownerId: string;
  consentAccessVersion: number;
  expectedSha256: string;
  expectedSizeBytes: number;
  claimedMimeType: string;
  storageObjectName: string;
  state:
    | 'INTENT_ISSUED'
    | 'UPLOADED_UNVERIFIED'
    | 'SCANNING'
    | 'VERIFIED'
    | 'ATTACHED'
    | 'FAILED_RETRYABLE'
    | 'REJECTED'
    | 'EXPIRED'
    | 'CANCELLED';
  revision: number;
  expiresAt: string;
  updatedAt: string;
  failureCode?: string;
  verifiedMimeType?: string;
  verifiedSizeBytes?: number;
  derivativeSha256?: string;
}

export interface MilestoneTwoConflictRecord {
  conflictId: string;
  conflictType: string;
  revision: number;
  commandId: string;
  clientEventIds: readonly string[];
  targetType: string;
  targetId: string;
  localRevision: number;
  authoritativeRevision: number;
  localSummary: Record<string, unknown>;
  authoritativeSummary: Record<string, unknown>;
  state: 'OPEN' | 'RESOLUTION_PENDING' | 'RESOLVED' | 'LOCKED_RECOVERY';
  createdAt: string;
}

export interface MilestoneTwoOperationReceipt {
  requestHash: string;
  response?: unknown;
}

export interface PostgresMilestoneTwoTransaction {
  readonly binding: MilestoneTwoDeviceBinding;
  findStream(streamId: string, lock: boolean): Promise<MilestoneTwoStreamRecord | undefined>;
  insertStream(stream: MilestoneTwoStreamRecord): Promise<void>;
  updateStream(input: {
    streamId: string;
    state: MilestoneTwoStreamRecord['state'];
    cursor: string;
    highWaterMark: string;
  }): Promise<void>;
  findBatchReceipt(
    streamId: string,
    batchId: string,
  ): Promise<MilestoneTwoOperationReceipt | undefined>;
  insertBatchReceipt(input: {
    streamId: string;
    batchId: string;
    requestHash: string;
    response: unknown;
  }): Promise<void>;
  findAcknowledgement(commandId: string): Promise<
    | {
        requestHash: string;
        response: SyncCommandDisposition;
      }
    | undefined
  >;
  insertAcknowledgement(input: {
    streamId: string;
    requestHash: string;
    response: SyncCommandDisposition;
  }): Promise<void>;
  listFeedEvents(afterSequence: number, limit: number): Promise<readonly unknown[]>;
  listConflicts(limit: number): Promise<readonly MilestoneTwoConflictRecord[]>;
  findConflict(conflictId: string): Promise<MilestoneTwoConflictRecord | undefined>;
  lockOperation(commandId: string): Promise<void>;
  findOperation(commandId: string): Promise<MilestoneTwoOperationReceipt | undefined>;
  insertOperation(input: {
    commandId: string;
    operation: string;
    requestHash: string;
    response?: unknown;
  }): Promise<void>;
  mediaOwnerAuthorized(input: {
    purpose: string;
    ownerType: string;
    ownerId: string;
    consentAccessVersion: number;
  }): Promise<boolean>;
  insertMedia(input: {
    intentId: string;
    assetId: string;
    purpose: string;
    ownerType: string;
    ownerId: string;
    expectedSha256: string;
    claimedMimeType: string;
    declaredSizeBytes: number;
    declaredWidth?: number;
    declaredHeight?: number;
    declaredDurationSeconds?: number;
    consentAccessVersion: number;
    storageObjectName: string;
    generationPrecondition: number;
    expiresAt: string;
  }): Promise<void>;
  findMediaByIntent(intentId: string, lock: boolean): Promise<MilestoneTwoMediaRecord | undefined>;
  findMediaByAsset(assetId: string): Promise<MilestoneTwoMediaRecord | undefined>;
  finalizeMedia(input: {
    intentId: string;
    objectGeneration: number;
    sha256: string;
    finalSizeBytes: number;
    updatedAt: string;
  }): Promise<void>;
  cancelMedia(input: { intentId: string; cancelledAt: string }): Promise<void>;
}

export interface PostgresMilestoneTwoPort {
  readonly persistence: 'postgresql';
  transaction<Result>(
    boundary: VerifiedRequestBoundary,
    work: (transaction: PostgresMilestoneTwoTransaction) => Promise<Result>,
  ): Promise<Result>;
  ready(): Promise<boolean>;
}

export interface PostgresMilestoneTwoOptions {
  port: PostgresMilestoneTwoPort;
  commandExecutor: PostgresMilestoneTwoCommandExecutor;
  signServerTime: (timestamp: string) => string | Promise<string>;
  uploadCapabilityProvider?: ResumableUploadCapabilityProvider;
  now?: () => Date;
  nextUuid?: () => string;
  nextCursor?: () => string;
}

function digest(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalize(value), 'utf8').digest('hex')}`;
}

function commandDigest(command: SyncBatch['commands'][number]): string {
  return digest({
    operation: command.operation,
    commandSchemaVersion: command.commandSchemaVersion,
    target: command.target,
    expectedRevision: command.expectedRevision,
    payload: command.payload,
  });
}

function requestBody<T>(request: DomainOperationRequest, schema: { parse(value: unknown): T }): T {
  return schema.parse(request.body);
}

function pathValue(request: DomainOperationRequest, name: string): string {
  const value = request.params?.[name];
  if (value === undefined) throw dependencyUnavailable();
  return value;
}

function identity(boundary: VerifiedRequestBoundary): {
  subjectId: string;
  authorizationVersion: number;
} {
  const subjectId = boundary.identity?.subjectId;
  const authorizationVersion = boundary.authorization?.authorizationVersion;
  if (subjectId === undefined || authorizationVersion === undefined) {
    throw new ApiBoundaryProblem({
      code: 'AUTHORIZATION_DENIED',
      status: 403,
      title: 'A current Farmer role context is required.',
    });
  }
  return { subjectId, authorizationVersion };
}

function conflict(
  code:
    | 'SYNC_BATCH_ID_REUSED'
    | 'SYNC_CURSOR_INVALID'
    | 'SYNC_BOOTSTRAP_REQUIRED'
    | 'SYNC_SCHEMA_UNSUPPORTED',
): never {
  throw new ApiBoundaryProblem({
    code,
    status: 409,
    title: 'The sync request cannot be applied to this stream.',
  });
}

function unavailableResource(title: string): never {
  throw new ApiBoundaryProblem({ code: 'AUTHORIZATION_DENIED', status: 404, title });
}

function reusedIdempotency(title: string): never {
  throw new ApiBoundaryProblem({ code: 'IDEMPOTENCY_KEY_REUSED', status: 409, title });
}

function commandId(request: DomainOperationRequest): string {
  const value = request.boundary.idempotencyKey;
  if (value === undefined) throw dependencyUnavailable();
  return value;
}

function streamIsCurrent(
  stream: MilestoneTwoStreamRecord | undefined,
  request: DomainOperationRequest,
  binding: MilestoneTwoDeviceBinding,
  now: Date,
): stream is MilestoneTwoStreamRecord {
  const principal = identity(request.boundary);
  return (
    stream?.environment === request.boundary.environment &&
    stream.subjectId === principal.subjectId &&
    stream.subjectDeviceBindingId === binding.subjectDeviceBindingId &&
    stream.authorizationVersion === principal.authorizationVersion &&
    stream.deviceMode === binding.deviceMode &&
    Date.parse(stream.expiresAt) > now.getTime() &&
    stream.state !== 'CLOSED' &&
    stream.state !== 'LOCKED_RECOVERY'
  );
}

function conflictResponse(record: MilestoneTwoConflictRecord): Record<string, unknown> {
  return {
    conflictId: record.conflictId,
    conflictType: record.conflictType,
    revision: record.revision,
    commandId: record.commandId,
    clientEventIds: record.clientEventIds,
    targetType: record.targetType,
    targetId: record.targetId,
    localRevision: record.localRevision,
    authoritativeRevision: record.authoritativeRevision,
    localSummary: record.localSummary,
    authoritativeSummary: record.authoritativeSummary,
    allowedActions: ['CREATE_NEW_COMMAND', 'DISCARD_LOCAL_PROPOSAL'],
    state: record.state,
    createdAt: record.createdAt,
  };
}

export class PostgresMilestoneTwoOperations implements DomainOperationAdapter {
  readonly persistence = 'postgresql' as const;
  readonly #options: PostgresMilestoneTwoOptions & {
    now: () => Date;
    nextUuid: () => string;
    nextCursor: () => string;
  };

  constructor(options: PostgresMilestoneTwoOptions) {
    this.#options = {
      ...options,
      now: options.now ?? (() => new Date()),
      nextUuid: options.nextUuid ?? randomUUID,
      nextCursor: options.nextCursor ?? (() => `cursor:${randomUUID()}`),
    };
  }

  ready(): Promise<boolean> {
    return this.#options.port.ready();
  }

  async execute(request: DomainOperationRequest): Promise<unknown> {
    switch (request.operationId) {
      case 'openFarmerSyncStream':
        return this.#openStream(request);
      case 'bootstrapFarmerSync':
        return this.#bootstrap(request);
      case 'syncFarmerBatch':
        return this.#syncBatch(request);
      case 'getFarmerSyncFeed':
        return this.#feed(request);
      case 'getFarmerSyncCommand':
        return this.#command(request);
      case 'listFarmerSyncConflicts':
        return this.#listConflicts(request);
      case 'getFarmerSyncConflict':
        return this.#getConflict(request);
      case 'resolveFarmerSyncConflict':
        requestBody(request, SyncConflictResolutionRequestSchema);
        throw dependencyUnavailable();
      case 'createMediaUploadIntent':
        return this.#createMediaIntent(request);
      case 'finalizeMediaUploadIntent':
        return this.#finalizeMedia(request);
      case 'getMediaAssetStatus':
        return this.#mediaStatus(request);
      case 'cancelMediaUploadIntent':
        return this.#cancelMedia(request);
      default:
        throw dependencyUnavailable();
    }
  }

  async #openStream(request: DomainOperationRequest): Promise<unknown> {
    const body = requestBody(request, SyncStreamOpenRequestSchema);
    const principal = identity(request.boundary);
    if (
      body.localDatabaseSchemaVersion > LOCAL_DATABASE_SCHEMA_VERSION ||
      ![
        body.commandVersions,
        body.clientEventVersions,
        body.projectionVersions,
        body.mediaVersions,
      ].every((range) => range.minimum <= 1 && range.maximum >= 1)
    ) {
      conflict('SYNC_SCHEMA_UNSUPPORTED');
    }
    const now = this.#options.now();
    const stream = await this.#options.port.transaction(request.boundary, async (transaction) => {
      if (body.deviceMode !== transaction.binding.deviceMode) {
        throw new ApiBoundaryProblem({
          code: 'DEVICE_BINDING_MISMATCH',
          status: 403,
          title: 'The server device mode does not match this sync request.',
        });
      }
      const prior =
        body.priorStreamId === undefined
          ? undefined
          : await transaction.findStream(body.priorStreamId, true);
      const priorReusable =
        streamIsCurrent(prior, request, transaction.binding, now) &&
        prior.clientBuild === body.clientBuild &&
        prior.cursor === body.priorCursor &&
        prior.state === 'OPEN';
      const created: MilestoneTwoStreamRecord = {
        streamId: this.#options.nextUuid(),
        environment: request.boundary.environment,
        subjectId: principal.subjectId,
        subjectDeviceBindingId: transaction.binding.subjectDeviceBindingId,
        authorizationVersion: principal.authorizationVersion,
        deviceMode: transaction.binding.deviceMode,
        clientBuild: body.clientBuild,
        localDatabaseSchemaVersion: body.localDatabaseSchemaVersion,
        commandVersion: 1,
        clientEventVersion: 1,
        projectionVersion: 1,
        mediaVersion: 1,
        cursor: this.#options.nextCursor(),
        highWaterMark: priorReusable ? prior.highWaterMark : '0',
        state: priorReusable ? 'OPEN' : 'BOOTSTRAP_REQUIRED',
        openedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + STREAM_TTL_MS).toISOString(),
      };
      await transaction.insertStream(created);
      return created;
    });
    const serverTime = now.toISOString();
    return {
      streamId: stream.streamId,
      subjectDeviceBindingId: stream.subjectDeviceBindingId,
      stakeholder: 'FARMER',
      scope: 'FARMER_SELF_SERVICE',
      authorizationVersion: stream.authorizationVersion,
      acceptedCommandVersions: { minimum: 1, maximum: 1 },
      acceptedClientEventVersions: { minimum: 1, maximum: 1 },
      acceptedProjectionVersions: { minimum: 1, maximum: 1 },
      acceptedMediaVersions: { minimum: 1, maximum: 1 },
      maximumBatchCommands: 100,
      maximumBatchBytes: 524_288,
      serverTime,
      serverTimeSignature: await this.#options.signServerTime(serverTime),
      cursor: stream.cursor,
      bootstrapRequired: stream.state === 'BOOTSTRAP_REQUIRED',
    };
  }

  async #bootstrap(request: DomainOperationRequest): Promise<unknown> {
    const body = requestBody(request, SyncBootstrapRequestSchema);
    if (
      body.localDatabaseSchemaVersion > LOCAL_DATABASE_SCHEMA_VERSION ||
      body.supportedProjectionVersions.minimum > 1 ||
      body.supportedProjectionVersions.maximum < 1
    ) {
      conflict('SYNC_SCHEMA_UNSUPPORTED');
    }
    const now = this.#options.now();
    return this.#options.port.transaction(request.boundary, async (transaction) => {
      const stream = await transaction.findStream(body.streamId, true);
      if (!streamIsCurrent(stream, request, transaction.binding, now))
        conflict('SYNC_CURSOR_INVALID');
      const cursor = this.#options.nextCursor();
      await transaction.updateStream({
        streamId: stream.streamId,
        state: 'OPEN',
        cursor,
        highWaterMark: stream.highWaterMark,
      });
      const snapshot = { projections: [], tombstones: [], highWaterMark: stream.highWaterMark };
      return {
        streamId: stream.streamId,
        snapshotSchemaVersion: 1,
        snapshotChecksum: digest(snapshot),
        generatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 5 * 60 * 1_000).toISOString(),
        projections: [],
        tombstones: [],
        highWaterMark: stream.highWaterMark,
        cursor,
        authorizationVersion: stream.authorizationVersion,
      };
    });
  }

  async #syncBatch(request: DomainOperationRequest): Promise<unknown> {
    const body = requestBody(request, SyncBatchSchema);
    const requestHash = digest(body);
    const now = this.#options.now();
    return this.#options.port.transaction(request.boundary, async (transaction) => {
      const stream = await transaction.findStream(body.streamId, true);
      if (!streamIsCurrent(stream, request, transaction.binding, now))
        conflict('SYNC_CURSOR_INVALID');
      const receipt = await transaction.findBatchReceipt(body.streamId, body.batchId);
      if (receipt !== undefined) {
        if (receipt.requestHash !== requestHash) conflict('SYNC_BATCH_ID_REUSED');
        return receipt.response;
      }
      if (stream.state === 'BOOTSTRAP_REQUIRED') conflict('SYNC_BOOTSTRAP_REQUIRED');
      if (stream.state !== 'OPEN' || stream.cursor !== body.cursor) conflict('SYNC_CURSOR_INVALID');

      const dispositions: SyncCommandDisposition[] = [];
      let acceptedCount = 0;
      for (const command of body.commands) {
        const verifiedHash = commandDigest(command);
        if (command.requestHash !== verifiedHash)
          reusedIdempotency('The command hash is not canonical.');
        const prior = await transaction.findAcknowledgement(command.commandId);
        if (prior !== undefined) {
          if (prior.requestHash !== verifiedHash) {
            reusedIdempotency('The command identity was already used for different input.');
          }
          if (
            prior.response.disposition !== 'ACCEPTED' &&
            prior.response.disposition !== 'ALREADY_ACCEPTED'
          ) {
            dispositions.push(prior.response);
          } else {
            dispositions.push({ ...prior.response, disposition: 'ALREADY_ACCEPTED' });
          }
          continue;
        }
        const accepted = await this.#options.commandExecutor.execute({
          boundary: request.boundary,
          command,
        });
        if (!accepted.eventIds.every((eventId) => UUID_V7_PATTERN.test(eventId))) {
          throw dependencyUnavailable();
        }
        const response: SyncCommandDisposition = {
          commandId: command.commandId,
          clientEventIds: command.clientEventIds,
          acknowledgementId: this.#options.nextUuid(),
          disposition: 'ACCEPTED',
          authoritativeRevision: accepted.authoritativeRevision,
          serverEventIds: [...accepted.eventIds],
          serverReceivedAt: this.#options.now().toISOString(),
        };
        await transaction.insertAcknowledgement({
          streamId: stream.streamId,
          requestHash: verifiedHash,
          response,
        });
        dispositions.push(response);
        acceptedCount += 1;
      }
      const highWaterMark = String(Number(stream.highWaterMark) + acceptedCount);
      const cursor = this.#options.nextCursor();
      await transaction.updateStream({
        streamId: stream.streamId,
        state: 'OPEN',
        cursor,
        highWaterMark,
      });
      const response = {
        batchId: body.batchId,
        dispositions,
        feedEvents: [],
        nextCursor: cursor,
        highWaterMark,
        hasMore: false,
        serverTime: this.#options.now().toISOString(),
        authorizationVersion: stream.authorizationVersion,
      };
      await transaction.insertBatchReceipt({
        streamId: stream.streamId,
        batchId: body.batchId,
        requestHash,
        response,
      });
      return response;
    });
  }

  async #feed(request: DomainOperationRequest): Promise<unknown> {
    const now = this.#options.now();
    return this.#options.port.transaction(request.boundary, async (transaction) => {
      const stream = await transaction.findStream(pathValue(request, 'streamId'), false);
      if (!streamIsCurrent(stream, request, transaction.binding, now))
        conflict('SYNC_CURSOR_INVALID');
      if (stream.state === 'BOOTSTRAP_REQUIRED') conflict('SYNC_BOOTSTRAP_REQUIRED');
      if (stream.cursor !== pathValue(request, 'cursor')) conflict('SYNC_CURSOR_INVALID');
      const limit = Math.min(100, Number(request.params?.['limit'] ?? 100));
      const feedEvents = await transaction.listFeedEvents(Number(stream.highWaterMark), limit);
      return {
        feedEvents,
        nextCursor: stream.cursor,
        highWaterMark: stream.highWaterMark,
        hasMore: false,
        serverTime: now.toISOString(),
        authorizationVersion: stream.authorizationVersion,
      };
    });
  }

  async #command(request: DomainOperationRequest): Promise<unknown> {
    return this.#options.port.transaction(request.boundary, async (transaction) => {
      const acknowledgement = await transaction.findAcknowledgement(
        pathValue(request, 'commandId'),
      );
      if (acknowledgement === undefined) unavailableResource('The command is not available.');
      return { command: acknowledgement.response };
    });
  }

  async #listConflicts(request: DomainOperationRequest): Promise<unknown> {
    return this.#options.port.transaction(request.boundary, async (transaction) => ({
      conflicts: (
        await transaction.listConflicts(Math.min(100, Number(request.params?.['limit'] ?? 100)))
      ).map(conflictResponse),
    }));
  }

  async #getConflict(request: DomainOperationRequest): Promise<unknown> {
    return this.#options.port.transaction(request.boundary, async (transaction) => {
      const row = await transaction.findConflict(pathValue(request, 'conflictId'));
      if (row === undefined) unavailableResource('The conflict is not available.');
      return conflictResponse(row);
    });
  }

  async #createMediaIntent(request: DomainOperationRequest): Promise<unknown> {
    const body = requestBody(request, CreateMediaUploadIntentRequestSchema);
    const provider = this.#options.uploadCapabilityProvider;
    if (provider === undefined) throw dependencyUnavailable();
    const operationId = commandId(request);
    const requestHash = digest({ operationId: request.operationId, body });
    const now = this.#options.now();
    return this.#options.port.transaction(request.boundary, async (transaction) => {
      await transaction.lockOperation(operationId);
      const prior = await transaction.findOperation(operationId);
      if (prior !== undefined) {
        if (prior.requestHash !== requestHash)
          reusedIdempotency('The media command identity was reused.');
        throw new ApiBoundaryProblem({
          code: 'UPLOAD_INTENT_EXPIRED',
          status: 410,
          title: 'The one-time upload capability cannot be disclosed again.',
        });
      }
      if (
        !(await transaction.mediaOwnerAuthorized({
          purpose: body.purpose,
          ownerType: body.owner.ownerType,
          ownerId: body.owner.ownerId,
          consentAccessVersion: body.consentAccessVersion,
        }))
      ) {
        throw new ApiBoundaryProblem({
          code: 'CONSENT_OR_ACCESS_VERSION_CHANGED',
          status: 409,
          title: 'Current media ownership and consent are required.',
        });
      }
      const intentId = this.#options.nextUuid();
      const assetId = this.#options.nextUuid();
      const expiresAt = new Date(now.getTime() + INTENT_TTL_MS).toISOString();
      const capability = await provider.initiate({
        intentId,
        assetId,
        purpose: body.purpose,
        claimedMimeType: body.claimedMimeType,
        declaredSizeBytes: body.declaredSizeBytes,
        expectedSha256: body.expectedSha256,
        expiresAt,
      });
      if (!capability.storageObjectName.startsWith('quarantine/')) {
        throw dependencyUnavailable();
      }
      await transaction.insertMedia({
        intentId,
        assetId,
        purpose: body.purpose,
        ownerType: body.owner.ownerType,
        ownerId: body.owner.ownerId,
        expectedSha256: body.expectedSha256,
        claimedMimeType: body.claimedMimeType,
        declaredSizeBytes: body.declaredSizeBytes,
        ...(body.declaredWidth === undefined ? {} : { declaredWidth: body.declaredWidth }),
        ...(body.declaredHeight === undefined ? {} : { declaredHeight: body.declaredHeight }),
        ...(body.declaredDurationSeconds === undefined
          ? {}
          : { declaredDurationSeconds: body.declaredDurationSeconds }),
        consentAccessVersion: body.consentAccessVersion,
        storageObjectName: capability.storageObjectName,
        generationPrecondition: 0,
        expiresAt,
      });
      await transaction.insertOperation({
        commandId: operationId,
        operation: request.operationId,
        requestHash,
        response: { intentId, assetId, state: 'INTENT_ISSUED', expiresAt },
      });
      return {
        intentId,
        assetId,
        state: 'INTENT_ISSUED',
        resumableUploadUri: capability.resumableUploadUri,
        generationPrecondition: capability.generationPrecondition,
        expiresAt,
      };
    });
  }

  async #finalizeMedia(request: DomainOperationRequest): Promise<unknown> {
    const body = requestBody(request, FinalizeMediaUploadIntentRequestSchema);
    const operationId = commandId(request);
    const requestHash = digest({ operationId: request.operationId, params: request.params, body });
    const now = this.#options.now();
    return this.#options.port.transaction(request.boundary, async (transaction) => {
      await transaction.lockOperation(operationId);
      const prior = await transaction.findOperation(operationId);
      if (prior !== undefined) {
        if (prior.requestHash !== requestHash)
          reusedIdempotency('The media command identity was reused.');
        return prior.response;
      }
      const media = await transaction.findMediaByIntent(pathValue(request, 'intentId'), true);
      if (media === undefined) unavailableResource('The upload intent is not available.');
      if (media.state !== 'INTENT_ISSUED' || Date.parse(media.expiresAt) <= now.getTime()) {
        throw new ApiBoundaryProblem({
          code: 'UPLOAD_INTENT_EXPIRED',
          status: 410,
          title: 'The upload intent is no longer current.',
        });
      }
      if (!(await transaction.mediaOwnerAuthorized(media))) {
        throw new ApiBoundaryProblem({
          code: 'CONSENT_OR_ACCESS_VERSION_CHANGED',
          status: 409,
          title: 'Current media ownership and consent are required.',
        });
      }
      const generation = Number(body.objectGeneration);
      const provider = this.#options.uploadCapabilityProvider;
      if (provider === undefined) throw dependencyUnavailable();
      let observed;
      try {
        observed = await provider.inspect({
          storageObjectName: media.storageObjectName,
          objectGeneration: body.objectGeneration,
        });
      } catch {
        throw dependencyUnavailable();
      }
      if (
        !Number.isSafeInteger(generation) ||
        generation <= 0 ||
        observed.objectGeneration !== body.objectGeneration ||
        observed.sha256 !== media.expectedSha256 ||
        observed.sizeBytes !== media.expectedSizeBytes ||
        observed.contentType !== media.claimedMimeType ||
        body.sha256 !== media.expectedSha256 ||
        body.finalSizeBytes !== media.expectedSizeBytes
      ) {
        throw new ApiBoundaryProblem({
          code: 'MEDIA_INTEGRITY_MISMATCH',
          status: 422,
          title: 'The uploaded object does not match its declared integrity metadata.',
        });
      }
      await transaction.finalizeMedia({
        intentId: media.intentId,
        objectGeneration: generation,
        sha256: body.sha256,
        finalSizeBytes: body.finalSizeBytes,
        updatedAt: now.toISOString(),
      });
      const response = {
        operationId,
        assetId: media.assetId,
        state: 'SCANNING',
        acceptedAt: now.toISOString(),
      };
      await transaction.insertOperation({
        commandId: operationId,
        operation: request.operationId,
        requestHash,
        response,
      });
      return response;
    });
  }

  async #mediaStatus(request: DomainOperationRequest): Promise<unknown> {
    return this.#options.port.transaction(request.boundary, async (transaction) => {
      const media = await transaction.findMediaByAsset(pathValue(request, 'assetId'));
      if (media === undefined) unavailableResource('The media asset is not available.');
      if (!(await transaction.mediaOwnerAuthorized(media))) {
        unavailableResource('The media asset is not available.');
      }
      return {
        assetId: media.assetId,
        purpose: media.purpose,
        state: media.state,
        revision: media.revision,
        ...(media.failureCode === undefined ? {} : { failureCode: media.failureCode }),
        ...(media.verifiedMimeType === undefined
          ? {}
          : { verifiedMimeType: media.verifiedMimeType }),
        ...(media.verifiedSizeBytes === undefined
          ? {}
          : { verifiedSizeBytes: media.verifiedSizeBytes }),
        ...(media.derivativeSha256 === undefined
          ? {}
          : { derivativeSha256: media.derivativeSha256 }),
        updatedAt: media.updatedAt,
      };
    });
  }

  async #cancelMedia(request: DomainOperationRequest): Promise<unknown> {
    const operationId = commandId(request);
    const requestHash = digest({ operationId: request.operationId, params: request.params });
    const now = this.#options.now();
    return this.#options.port.transaction(request.boundary, async (transaction) => {
      await transaction.lockOperation(operationId);
      const prior = await transaction.findOperation(operationId);
      if (prior !== undefined) {
        if (prior.requestHash !== requestHash)
          reusedIdempotency('The media command identity was reused.');
        return prior.response;
      }
      const media = await transaction.findMediaByIntent(pathValue(request, 'intentId'), true);
      if (media === undefined) unavailableResource('The upload intent is not available.');
      if (media.state !== 'INTENT_ISSUED') {
        throw new ApiBoundaryProblem({
          code: 'INVALID_STATE_TRANSITION',
          status: 409,
          title: 'Only an unfinalized upload intent can be cancelled.',
        });
      }
      if (!(await transaction.mediaOwnerAuthorized(media))) {
        unavailableResource('The upload intent is not available.');
      }
      await transaction.cancelMedia({ intentId: media.intentId, cancelledAt: now.toISOString() });
      const response = {
        intentId: media.intentId,
        state: 'CANCELLED',
        cancelledAt: now.toISOString(),
      };
      await transaction.insertOperation({
        commandId: operationId,
        operation: request.operationId,
        requestHash,
        response,
      });
      return response;
    });
  }
}
