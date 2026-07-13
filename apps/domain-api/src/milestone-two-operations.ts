import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import {
  CreateMediaUploadIntentRequestSchema,
  FinalizeMediaUploadIntentRequestSchema,
  SyncBatchSchema,
  SyncBootstrapRequestSchema,
  SyncConflictResolutionRequestSchema,
  SyncStreamOpenRequestSchema,
  type DeviceMode,
  type SyncBatch,
} from '@smart-fasal/contracts/schemas';
import { canonicalize } from 'json-canonicalize';

import {
  ApiBoundaryProblem,
  dependencyUnavailable,
  type DomainOperationAdapter,
  type DomainOperationRequest,
  type VerifiedRequestBoundary,
} from './boundary.js';

interface CommandAcceptance {
  authoritativeRevision: number;
  eventIds: readonly string[];
}

export interface MilestoneTwoCommandExecutor {
  execute(input: {
    boundary: VerifiedRequestBoundary;
    command: SyncBatch['commands'][number];
  }): Promise<CommandAcceptance>;
}

export interface MilestoneTwoOperationOptions {
  commandExecutor: MilestoneTwoCommandExecutor;
  signServerTime: (timestamp: string) => string | Promise<string>;
  now?: () => Date;
  nextUuid?: () => string;
  nextUuidV7?: () => string;
  uploadOrigin?: string;
  cursorSigningKey?: Uint8Array;
  authorizeMedia?: (input: {
    boundary: VerifiedRequestBoundary;
    action: 'CREATE' | 'FINALIZE' | 'STATUS' | 'CANCEL';
    subjectDeviceBindingId: string;
    purpose: string;
    ownerType: string;
    ownerId: string;
    consentAccessVersion: number;
  }) => boolean | Promise<boolean>;
  inspectQuarantineObject?: (input: {
    storageObjectName: string;
    objectGeneration: string;
  }) => Promise<{
    objectGeneration: string;
    sha256: string;
    sizeBytes: number;
    contentType: string;
  }>;
  resolveDeviceBinding?: (input: { boundary: VerifiedRequestBoundary }) => {
    subjectDeviceBindingId: string;
    deviceMode: DeviceMode;
  };
}

interface StreamState {
  streamId: string;
  environment: string;
  subjectId: string;
  installationId: string;
  subjectDeviceBindingId: string;
  deviceMode: DeviceMode;
  authorizationVersion: number;
  cursor: number;
  highWaterMark: number;
  expiresAt: number;
  bootstrapRequired: boolean;
}

interface StoredBatch {
  requestHash: string;
  response: unknown;
  denySensitiveReplay?: boolean;
}

interface StoredCommand {
  requestHash: string;
  response: {
    commandId: string;
    clientEventIds: readonly string[];
    acknowledgementId: string;
    disposition: 'ACCEPTED';
    authoritativeRevision: number;
    serverEventIds: readonly string[];
    serverReceivedAt: string;
  };
  subjectDeviceBindingId: string;
  authorizationVersion: number;
}

interface InFlightMediaOperation {
  requestHash: string;
  result: Promise<unknown>;
}

interface MediaState {
  intentId: string;
  assetId: string;
  subjectId: string;
  subjectDeviceBindingId: string;
  authorizationVersion: number;
  ownerType: string;
  ownerId: string;
  consentAccessVersion: number;
  storageObjectName: string;
  claimedMimeType: string;
  purpose: string;
  expectedSha256: string;
  expectedSizeBytes: number;
  generationPrecondition: string;
  state: 'INTENT_ISSUED' | 'SCANNING' | 'CANCELLED';
  revision: number;
  failureCode?: string;
  verifiedMimeType?: string;
  verifiedSizeBytes?: number;
  derivativeSha256?: string;
  updatedAt: string;
  expiresAt: string;
}

const STREAM_TTL_MS = 15 * 60 * 1_000;
const INTENT_TTL_MS = 10 * 60 * 1_000;
const LOCAL_DATABASE_SCHEMA_VERSION = 2;
const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function uuidV7(now = Date.now()): string {
  const timestamp = now.toString(16).padStart(12, '0').slice(-12);
  const entropy = randomBytes(10).toString('hex');
  const variant = ((Number.parseInt(entropy.charAt(3), 16) & 0x3) | 0x8).toString(16);
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8)}-7${entropy.slice(0, 3)}-${variant}${entropy.slice(4, 7)}-${entropy.slice(7, 19)}`;
}

function digest(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalize(value), 'utf8').digest('hex')}`;
}

export function syncCommandRequestHash(
  command: Pick<
    SyncBatch['commands'][number],
    'operation' | 'commandSchemaVersion' | 'target' | 'expectedRevision' | 'payload'
  >,
): string {
  return digest({
    operation: command.operation,
    commandSchemaVersion: command.commandSchemaVersion,
    target: command.target,
    expectedRevision: command.expectedRevision,
    payload: command.payload,
  });
}

function deterministicUuid(value: string): string {
  const bytes = createHash('sha256').update(value, 'utf8').digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function redactUploadCapability(response: unknown): unknown {
  if (typeof response !== 'object' || response === null || Array.isArray(response)) {
    throw dependencyUnavailable();
  }
  const { resumableUploadUri: _discarded, ...safeReceipt } = response as Record<string, unknown>;
  if (typeof _discarded !== 'string') throw dependencyUnavailable();
  return safeReceipt;
}

function requireIdentity(boundary: VerifiedRequestBoundary): {
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

function bodyFor<T>(request: DomainOperationRequest, schema: { parse(value: unknown): T }): T {
  return schema.parse(request.body);
}

function pathId(request: DomainOperationRequest, name: string): string {
  const value = request.params?.[name];
  if (value === undefined) throw dependencyUnavailable();
  return value;
}

function syncProblem(
  code:
    | 'SYNC_BATCH_ID_REUSED'
    | 'SYNC_CURSOR_INVALID'
    | 'SYNC_CURSOR_EXPIRED'
    | 'SYNC_BOOTSTRAP_REQUIRED'
    | 'SYNC_SCHEMA_UNSUPPORTED',
): never {
  throw new ApiBoundaryProblem({
    code,
    status: code === 'SYNC_CURSOR_EXPIRED' ? 410 : 409,
    title: 'The sync request cannot be applied to this stream.',
  });
}

export class InMemoryMilestoneTwoOperations implements DomainOperationAdapter {
  readonly #streams = new Map<string, StreamState>();
  readonly #batches = new Map<string, StoredBatch>();
  readonly #commands = new Map<string, StoredCommand>();
  readonly #mediaByIntent = new Map<string, MediaState>();
  readonly #mediaByAsset = new Map<string, MediaState>();
  readonly #mediaOperations = new Map<string, StoredBatch>();
  readonly #inFlightMediaOperations = new Map<string, InFlightMediaOperation>();
  readonly #cursorSigningKey: Uint8Array;
  readonly #options: Required<
    Pick<
      MilestoneTwoOperationOptions,
      'now' | 'nextUuid' | 'nextUuidV7' | 'uploadOrigin' | 'resolveDeviceBinding'
    >
  > &
    Omit<
      MilestoneTwoOperationOptions,
      'now' | 'nextUuid' | 'nextUuidV7' | 'uploadOrigin' | 'resolveDeviceBinding'
    >;

  constructor(options: MilestoneTwoOperationOptions) {
    this.#cursorSigningKey = options.cursorSigningKey ?? randomBytes(32);
    this.#options = {
      ...options,
      now: options.now ?? (() => new Date()),
      nextUuid: options.nextUuid ?? randomUUID,
      nextUuidV7: options.nextUuidV7 ?? (() => uuidV7()),
      uploadOrigin: options.uploadOrigin ?? 'https://quarantine-upload.invalid',
      resolveDeviceBinding:
        options.resolveDeviceBinding ??
        (({ boundary }) => ({
          subjectDeviceBindingId: deterministicUuid(
            `${boundary.environment}\u0000${boundary.identity?.subjectId ?? ''}\u0000${boundary.installationId}`,
          ),
          deviceMode: 'PERSONAL',
        })),
    };
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
      case 'resolveFarmerSyncConflict':
        return this.#noConflict(request);
      case 'createMediaUploadIntent':
        return this.#idempotentMediaOperation(
          request,
          () => this.#createMediaIntent(request),
          true,
        );
      case 'finalizeMediaUploadIntent':
        return this.#idempotentMediaOperation(request, () => this.#finalizeMediaIntent(request));
      case 'getMediaAssetStatus':
        return this.#mediaStatus(request);
      case 'cancelMediaUploadIntent':
        return this.#idempotentMediaOperation(request, () => this.#cancelMediaIntent(request));
      default:
        throw dependencyUnavailable();
    }
  }

  #cursorFor(stream: StreamState): string {
    const payload = Buffer.from(
      canonicalize({
        authorizationVersion: stream.authorizationVersion,
        environment: stream.environment,
        expiresAt: stream.expiresAt,
        position: stream.cursor,
        scope: 'FARMER_SELF_SERVICE',
        stakeholder: 'FARMER',
        streamId: stream.streamId,
        subjectDeviceBindingId: stream.subjectDeviceBindingId,
      }),
      'utf8',
    ).toString('base64url');
    const signature = createHmac('sha256', this.#cursorSigningKey)
      .update(payload, 'utf8')
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  #cursorMatches(stream: StreamState, candidate: string | undefined): boolean {
    if (candidate === undefined) return false;
    const separator = candidate.lastIndexOf('.');
    if (separator <= 0 || separator === candidate.length - 1) return false;
    const payload = candidate.slice(0, separator);
    const supplied = candidate.slice(separator + 1);
    const expected = createHmac('sha256', this.#cursorSigningKey).update(payload, 'utf8').digest();
    let suppliedBytes: Buffer;
    try {
      suppliedBytes = Buffer.from(supplied, 'base64url');
    } catch {
      return false;
    }
    if (
      suppliedBytes.byteLength !== expected.byteLength ||
      !timingSafeEqual(suppliedBytes, expected)
    ) {
      return false;
    }
    return candidate === this.#cursorFor(stream);
  }

  async #openStream(request: DomainOperationRequest): Promise<unknown> {
    const body = bodyFor(request, SyncStreamOpenRequestSchema);
    const { subjectId, authorizationVersion } = requireIdentity(request.boundary);
    if (
      body.localDatabaseSchemaVersion > LOCAL_DATABASE_SCHEMA_VERSION ||
      ![
        body.commandVersions,
        body.clientEventVersions,
        body.projectionVersions,
        body.mediaVersions,
      ].every((range) => range.minimum <= 1 && range.maximum >= 1)
    ) {
      syncProblem('SYNC_SCHEMA_UNSUPPORTED');
    }
    const now = this.#options.now();
    const streamId = this.#options.nextUuid();
    const prior =
      body.priorStreamId === undefined ? undefined : this.#streams.get(body.priorStreamId);
    const deviceBinding = this.#options.resolveDeviceBinding({ boundary: request.boundary });
    if (body.deviceMode !== deviceBinding.deviceMode) {
      throw new ApiBoundaryProblem({
        code: 'DEVICE_BINDING_MISMATCH',
        status: 403,
        title: 'The server device mode does not match this sync request.',
      });
    }
    const priorReusable =
      prior?.subjectId === subjectId &&
      prior.environment === request.boundary.environment &&
      prior.installationId === request.boundary.installationId &&
      prior.subjectDeviceBindingId === deviceBinding.subjectDeviceBindingId &&
      prior.authorizationVersion === authorizationVersion &&
      prior.expiresAt > now.getTime() &&
      this.#cursorMatches(prior, body.priorCursor);
    const bootstrapRequired = !priorReusable;
    const state: StreamState = {
      streamId,
      subjectId,
      environment: request.boundary.environment,
      installationId: request.boundary.installationId,
      subjectDeviceBindingId: deviceBinding.subjectDeviceBindingId,
      deviceMode: deviceBinding.deviceMode,
      authorizationVersion,
      cursor: priorReusable ? prior.cursor : 0,
      highWaterMark: priorReusable ? prior.highWaterMark : 0,
      expiresAt: now.getTime() + STREAM_TTL_MS,
      bootstrapRequired,
    };
    this.#streams.set(streamId, state);
    const serverTime = now.toISOString();
    return {
      streamId,
      subjectDeviceBindingId: state.subjectDeviceBindingId,
      stakeholder: 'FARMER',
      scope: 'FARMER_SELF_SERVICE',
      authorizationVersion,
      acceptedCommandVersions: { minimum: 1, maximum: 1 },
      acceptedClientEventVersions: { minimum: 1, maximum: 1 },
      acceptedProjectionVersions: { minimum: 1, maximum: 1 },
      acceptedMediaVersions: { minimum: 1, maximum: 1 },
      maximumBatchCommands: 100,
      maximumBatchBytes: 524_288,
      serverTime,
      serverTimeSignature: await this.#options.signServerTime(serverTime),
      cursor: this.#cursorFor(state),
      bootstrapRequired,
    };
  }

  #boundStream(request: DomainOperationRequest, streamId: string): StreamState {
    const { subjectId, authorizationVersion } = requireIdentity(request.boundary);
    const stream = this.#streams.get(streamId);
    const deviceBinding = this.#options.resolveDeviceBinding({ boundary: request.boundary });
    if (
      stream?.subjectId !== subjectId ||
      stream.environment !== request.boundary.environment ||
      stream.installationId !== request.boundary.installationId ||
      stream.subjectDeviceBindingId !== deviceBinding.subjectDeviceBindingId ||
      stream.deviceMode !== deviceBinding.deviceMode ||
      stream.authorizationVersion !== authorizationVersion
    ) {
      syncProblem('SYNC_CURSOR_INVALID');
    }
    if (stream.expiresAt <= this.#options.now().getTime()) syncProblem('SYNC_CURSOR_EXPIRED');
    return stream;
  }

  #bootstrap(request: DomainOperationRequest): unknown {
    const body = bodyFor(request, SyncBootstrapRequestSchema);
    const stream = this.#boundStream(request, body.streamId);
    const now = this.#options.now();
    stream.bootstrapRequired = false;
    stream.cursor = stream.highWaterMark;
    const emptySnapshot = {
      projections: [],
      tombstones: [],
      highWaterMark: String(stream.highWaterMark),
    };
    return {
      streamId: stream.streamId,
      snapshotSchemaVersion: 1,
      snapshotChecksum: digest(emptySnapshot),
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 5 * 60 * 1_000).toISOString(),
      projections: [],
      tombstones: [],
      highWaterMark: String(stream.highWaterMark),
      cursor: this.#cursorFor(stream),
      authorizationVersion: stream.authorizationVersion,
    };
  }

  async #syncBatch(request: DomainOperationRequest): Promise<unknown> {
    const body = bodyFor(request, SyncBatchSchema);
    const stream = this.#boundStream(request, body.streamId);
    const requestHash = digest(body);
    const batchKey = `${stream.streamId}:${body.batchId}`;
    const existing = this.#batches.get(batchKey);
    if (existing !== undefined) {
      if (existing.requestHash !== requestHash) syncProblem('SYNC_BATCH_ID_REUSED');
      return existing.response;
    }
    if (stream.bootstrapRequired) syncProblem('SYNC_BOOTSTRAP_REQUIRED');
    if (!this.#cursorMatches(stream, body.cursor)) syncProblem('SYNC_CURSOR_INVALID');

    const dispositions = [];
    for (const command of body.commands) {
      const verifiedRequestHash = syncCommandRequestHash(command);
      if (command.requestHash !== verifiedRequestHash) {
        throw new ApiBoundaryProblem({
          code: 'IDEMPOTENCY_KEY_REUSED',
          status: 409,
          title: 'The sync command request hash does not match its canonical semantic input.',
        });
      }
      const commandKey = `${stream.subjectId}:${command.commandId}`;
      const prior = this.#commands.get(commandKey);
      if (prior !== undefined) {
        if (prior.requestHash !== verifiedRequestHash) {
          throw new ApiBoundaryProblem({
            code: 'IDEMPOTENCY_KEY_REUSED',
            status: 409,
            title: 'The sync command identity was already used for different semantic input.',
          });
        }
        dispositions.push({ ...prior.response, disposition: 'ALREADY_ACCEPTED' as const });
        continue;
      }
      const accepted = await this.#options.commandExecutor.execute({
        boundary: request.boundary,
        command,
      });
      if (!accepted.eventIds.every((eventId) => UUID_V7_PATTERN.test(eventId))) {
        throw dependencyUnavailable();
      }
      const disposition = {
        commandId: command.commandId,
        clientEventIds: command.clientEventIds,
        acknowledgementId: this.#options.nextUuid(),
        disposition: 'ACCEPTED' as const,
        authoritativeRevision: accepted.authoritativeRevision,
        serverEventIds: accepted.eventIds,
        serverReceivedAt: this.#options.now().toISOString(),
      };
      this.#commands.set(commandKey, {
        requestHash: verifiedRequestHash,
        response: disposition,
        subjectDeviceBindingId: stream.subjectDeviceBindingId,
        authorizationVersion: stream.authorizationVersion,
      });
      dispositions.push(disposition);
      stream.highWaterMark += 1;
    }
    stream.cursor = stream.highWaterMark;
    const response = {
      batchId: body.batchId,
      dispositions,
      feedEvents: [],
      nextCursor: this.#cursorFor(stream),
      highWaterMark: String(stream.highWaterMark),
      hasMore: false,
      serverTime: this.#options.now().toISOString(),
      authorizationVersion: stream.authorizationVersion,
    };
    this.#batches.set(batchKey, { requestHash, response });
    return response;
  }

  #feed(request: DomainOperationRequest): unknown {
    const streamId = pathId(request, 'streamId');
    const stream = this.#boundStream(request, streamId);
    if (stream.bootstrapRequired) syncProblem('SYNC_BOOTSTRAP_REQUIRED');
    if (!this.#cursorMatches(stream, pathId(request, 'cursor'))) {
      syncProblem('SYNC_CURSOR_INVALID');
    }
    return {
      feedEvents: [],
      nextCursor: this.#cursorFor(stream),
      highWaterMark: String(stream.highWaterMark),
      hasMore: false,
      serverTime: this.#options.now().toISOString(),
      authorizationVersion: stream.authorizationVersion,
    };
  }

  #command(request: DomainOperationRequest): unknown {
    const { subjectId, authorizationVersion } = requireIdentity(request.boundary);
    const command = this.#commands.get(`${subjectId}:${pathId(request, 'commandId')}`);
    const deviceBinding = this.#options.resolveDeviceBinding({ boundary: request.boundary });
    if (command === undefined) {
      throw new ApiBoundaryProblem({
        code: 'AUTHORIZATION_DENIED',
        status: 404,
        title: 'The command is not available.',
      });
    }
    if (
      command.authorizationVersion !== authorizationVersion ||
      command.subjectDeviceBindingId !== deviceBinding.subjectDeviceBindingId
    ) {
      throw new ApiBoundaryProblem({
        code: 'AUTHORIZATION_DENIED',
        status: 404,
        title: 'The command is not available.',
      });
    }
    return { command: command.response };
  }

  #noConflict(request: DomainOperationRequest): never {
    if (request.operationId === 'resolveFarmerSyncConflict') {
      bodyFor(request, SyncConflictResolutionRequestSchema);
    }
    throw new ApiBoundaryProblem({
      code: 'AUTHORIZATION_DENIED',
      status: 404,
      title: 'The conflict is not available.',
    });
  }

  #listConflicts(request: DomainOperationRequest): { conflicts: never[] } {
    requireIdentity(request.boundary);
    if (request.params?.['cursor'] !== undefined) {
      throw new ApiBoundaryProblem({
        code: 'SYNC_CURSOR_INVALID',
        status: 400,
        title: 'The conflict cursor was not issued for this empty authorized result set.',
      });
    }
    return { conflicts: [] };
  }

  async #createMediaIntent(request: DomainOperationRequest): Promise<unknown> {
    const body = bodyFor(request, CreateMediaUploadIntentRequestSchema);
    const { subjectId, authorizationVersion } = requireIdentity(request.boundary);
    const deviceBinding = this.#options.resolveDeviceBinding({ boundary: request.boundary });
    await this.#authorizeMedia(request, 'CREATE', {
      subjectDeviceBindingId: deviceBinding.subjectDeviceBindingId,
      purpose: body.purpose,
      ownerType: body.owner.ownerType,
      ownerId: body.owner.ownerId,
      consentAccessVersion: body.consentAccessVersion,
    });
    const now = this.#options.now();
    const intentId = this.#options.nextUuid();
    const assetId = this.#options.nextUuid();
    const generationPrecondition = '0';
    const storageObjectName = `quarantine/${request.boundary.environment}/${subjectId}/${assetId}`;
    const state: MediaState = {
      intentId,
      assetId,
      subjectId,
      subjectDeviceBindingId: deviceBinding.subjectDeviceBindingId,
      authorizationVersion,
      ownerType: body.owner.ownerType,
      ownerId: body.owner.ownerId,
      consentAccessVersion: body.consentAccessVersion,
      storageObjectName,
      claimedMimeType: body.claimedMimeType,
      purpose: body.purpose,
      expectedSha256: body.expectedSha256,
      expectedSizeBytes: body.declaredSizeBytes,
      generationPrecondition,
      state: 'INTENT_ISSUED',
      revision: 0,
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + INTENT_TTL_MS).toISOString(),
    };
    this.#mediaByIntent.set(intentId, state);
    this.#mediaByAsset.set(assetId, state);
    return {
      intentId,
      assetId,
      state: 'INTENT_ISSUED',
      resumableUploadUri: `${this.#options.uploadOrigin}/v1/${randomBytes(32).toString('base64url')}`,
      generationPrecondition,
      expiresAt: state.expiresAt,
    };
  }

  async #idempotentMediaOperation(
    request: DomainOperationRequest,
    apply: () => Promise<unknown>,
    denySensitiveReplay = false,
  ): Promise<unknown> {
    const idempotencyKey = request.boundary.idempotencyKey;
    if (idempotencyKey === undefined) return apply();
    const { subjectId } = requireIdentity(request.boundary);
    const operationKey = `${subjectId}:${idempotencyKey}`;
    const requestHash = digest({
      operationId: request.operationId,
      body: request.body ?? null,
      params: request.params ?? null,
    });
    const existing = this.#mediaOperations.get(operationKey);
    if (existing !== undefined) {
      if (existing.requestHash !== requestHash) {
        throw new ApiBoundaryProblem({
          code: 'IDEMPOTENCY_KEY_REUSED',
          status: 409,
          title: 'The idempotency key was already used for different media input.',
        });
      }
      if (existing.denySensitiveReplay) {
        throw new ApiBoundaryProblem({
          code: 'UPLOAD_INTENT_EXPIRED',
          status: 410,
          title: 'The one-time upload capability cannot be disclosed again.',
        });
      }
      return existing.response;
    }
    const inFlight = this.#inFlightMediaOperations.get(operationKey);
    if (inFlight !== undefined) {
      if (inFlight.requestHash !== requestHash) {
        throw new ApiBoundaryProblem({
          code: 'IDEMPOTENCY_KEY_REUSED',
          status: 409,
          title: 'The idempotency key is currently applying different media input.',
        });
      }
      await inFlight.result;
      const stored = this.#mediaOperations.get(operationKey);
      if (stored?.denySensitiveReplay) {
        throw new ApiBoundaryProblem({
          code: 'UPLOAD_INTENT_EXPIRED',
          status: 410,
          title: 'The one-time upload capability cannot be disclosed again.',
        });
      }
      if (stored === undefined) throw dependencyUnavailable();
      return stored.response;
    }
    const result = Promise.resolve().then(apply);
    this.#inFlightMediaOperations.set(operationKey, { requestHash, result });
    try {
      const response = await result;
      this.#mediaOperations.set(operationKey, {
        requestHash,
        response: denySensitiveReplay ? redactUploadCapability(response) : response,
        denySensitiveReplay,
      });
      return response;
    } finally {
      this.#inFlightMediaOperations.delete(operationKey);
    }
  }

  async #authorizeMedia(
    request: DomainOperationRequest,
    action: 'CREATE' | 'FINALIZE' | 'STATUS' | 'CANCEL',
    state: Pick<
      MediaState,
      'subjectDeviceBindingId' | 'purpose' | 'ownerType' | 'ownerId' | 'consentAccessVersion'
    >,
  ): Promise<void> {
    const authorizeMedia = this.#options.authorizeMedia;
    if (authorizeMedia === undefined) throw dependencyUnavailable();
    if (!(await authorizeMedia({ boundary: request.boundary, action, ...state }))) {
      throw new ApiBoundaryProblem({
        code: 'AUTHORIZATION_DENIED',
        status: 404,
        title: 'The media resource is not available.',
      });
    }
  }

  #assertCurrentMediaAccess(request: DomainOperationRequest, state: MediaState): void {
    const { subjectId, authorizationVersion } = requireIdentity(request.boundary);
    const deviceBinding = this.#options.resolveDeviceBinding({ boundary: request.boundary });
    if (
      state.subjectId !== subjectId ||
      state.authorizationVersion !== authorizationVersion ||
      state.subjectDeviceBindingId !== deviceBinding.subjectDeviceBindingId
    ) {
      throw new ApiBoundaryProblem({
        code: 'AUTHORIZATION_DENIED',
        status: 404,
        title: 'The media resource is not available.',
      });
    }
  }

  async #ownedIntent(
    request: DomainOperationRequest,
    action: 'FINALIZE' | 'CANCEL',
  ): Promise<MediaState> {
    const state = this.#mediaByIntent.get(pathId(request, 'intentId'));
    if (state === undefined) {
      throw new ApiBoundaryProblem({
        code: 'AUTHORIZATION_DENIED',
        status: 404,
        title: 'The upload intent is not available.',
      });
    }
    this.#assertCurrentMediaAccess(request, state);
    await this.#authorizeMedia(request, action, state);
    return state;
  }

  async #finalizeMediaIntent(request: DomainOperationRequest): Promise<unknown> {
    const body = bodyFor(request, FinalizeMediaUploadIntentRequestSchema);
    const state = await this.#ownedIntent(request, 'FINALIZE');
    if (
      state.state !== 'INTENT_ISSUED' ||
      Date.parse(state.expiresAt) <= this.#options.now().getTime()
    ) {
      throw new ApiBoundaryProblem({
        code: 'UPLOAD_INTENT_EXPIRED',
        status: 410,
        title: 'The upload intent is no longer current.',
      });
    }
    const inspectQuarantineObject = this.#options.inspectQuarantineObject;
    if (inspectQuarantineObject === undefined) throw dependencyUnavailable();
    let observed;
    try {
      observed = await inspectQuarantineObject({
        storageObjectName: state.storageObjectName,
        objectGeneration: body.objectGeneration,
      });
    } catch {
      throw dependencyUnavailable();
    }
    if (
      observed.objectGeneration !== body.objectGeneration ||
      observed.sha256 !== state.expectedSha256 ||
      observed.sizeBytes !== state.expectedSizeBytes ||
      observed.contentType !== state.claimedMimeType
    ) {
      throw new ApiBoundaryProblem({
        code: 'MEDIA_INTEGRITY_MISMATCH',
        status: 422,
        title: 'The quarantine object does not match its bound upload intent.',
      });
    }
    if (
      !/^[1-9][0-9]*$/u.test(body.objectGeneration) ||
      body.sha256 !== state.expectedSha256 ||
      body.finalSizeBytes !== state.expectedSizeBytes
    ) {
      throw new ApiBoundaryProblem({
        code: 'MEDIA_INTEGRITY_MISMATCH',
        status: 422,
        title: 'The uploaded object does not match its declared integrity metadata.',
      });
    }
    state.state = 'SCANNING';
    state.revision += 1;
    state.updatedAt = this.#options.now().toISOString();
    return {
      operationId: request.boundary.idempotencyKey ?? this.#options.nextUuid(),
      assetId: state.assetId,
      state: 'SCANNING',
      acceptedAt: state.updatedAt,
    };
  }

  async #mediaStatus(request: DomainOperationRequest): Promise<unknown> {
    const state = this.#mediaByAsset.get(pathId(request, 'assetId'));
    if (state === undefined) {
      throw new ApiBoundaryProblem({
        code: 'AUTHORIZATION_DENIED',
        status: 404,
        title: 'The media asset is not available.',
      });
    }
    this.#assertCurrentMediaAccess(request, state);
    await this.#authorizeMedia(request, 'STATUS', state);
    return {
      assetId: state.assetId,
      purpose: state.purpose,
      state: state.state,
      revision: state.revision,
      ...(state.failureCode === undefined ? {} : { failureCode: state.failureCode }),
      ...(state.verifiedMimeType === undefined ? {} : { verifiedMimeType: state.verifiedMimeType }),
      ...(state.verifiedSizeBytes === undefined
        ? {}
        : { verifiedSizeBytes: state.verifiedSizeBytes }),
      ...(state.derivativeSha256 === undefined ? {} : { derivativeSha256: state.derivativeSha256 }),
      updatedAt: state.updatedAt,
    };
  }

  async #cancelMediaIntent(request: DomainOperationRequest): Promise<unknown> {
    const state = await this.#ownedIntent(request, 'CANCEL');
    if (state.state !== 'INTENT_ISSUED') {
      throw new ApiBoundaryProblem({
        code: 'INVALID_STATE_TRANSITION',
        status: 409,
        title: 'Only an unfinalized upload intent can be cancelled.',
      });
    }
    state.state = 'CANCELLED';
    state.revision += 1;
    state.updatedAt = this.#options.now().toISOString();
    return { intentId: state.intentId, state: 'CANCELLED', cancelledAt: state.updatedAt };
  }
}
