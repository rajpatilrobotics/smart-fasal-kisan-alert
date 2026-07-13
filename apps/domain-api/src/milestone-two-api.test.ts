import {
  CreateMediaUploadIntentResponseSchema,
  SyncBootstrapResponseSchema,
  SyncStreamOpenResponseSchema,
} from '@smart-fasal/contracts/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildDomainApi } from './app';
import type {
  DomainOperationId,
  ProtectedMediaContentService,
  RequestAuthorizer,
} from './boundary';
import { InMemoryMilestoneTwoOperations } from './milestone-two-operations';

const SUBJECT = '00000000-0000-4000-8000-000000000101';
const ROLE_CONTEXT = '00000000-0000-4000-8000-000000000201';
const SESSION = '00000000-0000-4000-8000-000000000301';
const ATTACHMENT = '00000000-0000-4000-8000-000000000302';
const NOW = '2026-07-13T10:00:00.000Z';
const FUTURE = '2099-07-13T10:00:00.000Z';
const DIGEST = `sha256:${'a'.repeat(64)}`;
const openApps: ReturnType<typeof buildDomainApi>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

function headers(command = false, idempotencyKey = '00000000-0000-4000-8000-000000000401') {
  return {
    origin: 'http://farmer.test',
    authorization: 'Bearer known-identity',
    'x-firebase-appcheck': 'known-app-check',
    'x-client-installation-id': 'installation.synthetic.1',
    'x-client-build': 'm2-test',
    'x-client-schema-version': '1',
    'x-role-context-id': ROLE_CONTEXT,
    ...(command ? { 'idempotency-key': idempotencyKey } : {}),
  };
}

function authorizer(onOperation?: (operationId: DomainOperationId) => void): RequestAuthorizer {
  return {
    authorize: (request) => {
      onOperation?.(request.operationId);
      return Promise.resolve({
        allowed: true,
        context: {
          environment: 'local',
          subjectId: SUBJECT,
          roleContextId: ROLE_CONTEXT,
          roleType: 'FARMER',
          purposeCode: 'farmer.self_service',
          authorizationVersion: 1,
          capabilitySetVersion: 1,
          capabilities: [],
        },
      });
    },
  };
}

function openApp(
  protectedMediaContent?: ProtectedMediaContentService,
  onOperation?: (operationId: DomainOperationId) => void,
  now: () => Date = () => new Date(NOW),
) {
  let id = 500;
  const operations = new InMemoryMilestoneTwoOperations({
    commandExecutor: {
      execute: () =>
        Promise.resolve({
          authoritativeRevision: 1,
          eventIds: ['018f0000-0000-7000-8000-000000000001'],
        }),
    },
    signServerTime: () => 'local-test-signature-0001',
    now,
    nextUuid: () => `00000000-0000-4000-8000-${String(id++).padStart(12, '0')}`,
    authorizeMedia: () => true,
    inspectQuarantineObject: ({ objectGeneration }) =>
      Promise.resolve({
        objectGeneration,
        sha256: DIGEST,
        sizeBytes: 128,
        contentType: 'audio/wav',
      }),
  });
  const app = buildDomainApi({
    environment: 'local',
    runtimeMode: 'test',
    origins: { farmer: ['http://farmer.test'], rsk: ['http://rsk.test'], mp: ['http://mp.test'] },
    appIds: { farmer: ['farmer-app'], rsk: ['rsk-app'], mp: ['mp-app'] },
    identityVerifier: {
      mode: 'synthetic-test',
      verifyIdToken: () =>
        Promise.resolve({
          subjectId: SUBJECT,
          subjectType: 'FARMER',
          environment: 'local',
          expiresAt: FUTURE,
          securityVersion: 1,
          mfaState: 'NOT_REQUIRED',
        }),
    },
    appCheckVerifier: {
      mode: 'synthetic-test',
      verifyAppCheckToken: () =>
        Promise.resolve({ appId: 'farmer-app', environment: 'local', expiresAt: FUTURE }),
    },
    authorizer: authorizer(onOperation),
    operations,
    ...(protectedMediaContent === undefined ? {} : { protectedMediaContent }),
  });
  openApps.push(app);
  return app;
}

function mediaIntentBody() {
  return {
    mediaProtocolVersion: 1,
    purpose: 'VOICE_OFFLINE_AUDIO',
    owner: { ownerType: 'VOICE_SESSION', ownerId: SESSION },
    expectedSha256: DIGEST,
    claimedMimeType: 'audio/wav',
    declaredSizeBytes: 128,
    declaredDurationSeconds: 2,
    consentAccessVersion: 1,
  } as const;
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
  };
}

describe('Milestone 2 HTTP boundaries', () => {
  it('opens and bootstraps an installation-bound Farmer sync stream', async () => {
    const app = openApp();
    const openedResponse = await app.inject({
      method: 'POST',
      url: '/v1/sync/streams',
      headers: headers(),
      payload: streamOpenBody(),
    });
    expect(openedResponse.statusCode).toBe(200);
    const opened = SyncStreamOpenResponseSchema.parse(openedResponse.json());

    const bootstrapResponse = await app.inject({
      method: 'POST',
      url: '/v1/sync/bootstrap',
      headers: headers(),
      payload: {
        bootstrapVersion: 1,
        streamId: opened.streamId,
        localDatabaseSchemaVersion: 1,
        supportedProjectionVersions: { minimum: 1, maximum: 1 },
      },
    });
    expect(bootstrapResponse.statusCode).toBe(200);
    expect(SyncBootstrapResponseSchema.parse(bootstrapResponse.json())).toMatchObject({
      streamId: opened.streamId,
      projections: [],
    });
  });

  it('requires a role context and moves only matching upload metadata into scanning', async () => {
    const authorizedOperations: DomainOperationId[] = [];
    const app = openApp(undefined, (operationId) => authorizedOperations.push(operationId));
    const noContext = headers(true) as Record<string, string>;
    delete noContext['x-role-context-id'];
    const denied = await app.inject({
      method: 'POST',
      url: '/v1/media/upload-intents',
      headers: noContext,
      payload: {},
    });
    expect(denied.statusCode).toBe(400);

    const createdResponse = await app.inject({
      method: 'POST',
      url: '/v1/media/upload-intents',
      headers: headers(true),
      payload: mediaIntentBody(),
    });
    expect(createdResponse.statusCode).toBe(201);
    const created = CreateMediaUploadIntentResponseSchema.parse(createdResponse.json());

    const finalized = await app.inject({
      method: 'POST',
      url: `/v1/media/upload-intents/${created.intentId}:finalize`,
      headers: headers(true, '00000000-0000-4000-8000-000000000402'),
      payload: { objectGeneration: '17', sha256: DIGEST, finalSizeBytes: 128 },
    });
    expect(finalized.statusCode, finalized.body).toBe(202);
    expect(finalized.json()).toMatchObject({ assetId: created.assetId, state: 'SCANNING' });

    const status = await app.inject({
      method: 'GET',
      url: `/v1/media/assets/${created.assetId}/status`,
      headers: headers(),
    });
    expect(status.statusCode, status.body).toBe(200);
    expect(authorizedOperations.at(-1)).toBe('getMediaAssetStatus');
  });

  it.each(['0', '00', '01', '101', '999', '-1', '1.5'])(
    'rejects out-of-contract sync feed limit %s',
    async (limit) => {
      const app = openApp();
      const response = await app.inject({
        method: 'GET',
        url: `/v1/sync/feed?streamId=${SUBJECT}&cursor=opaque&limit=${limit}`,
        headers: headers(),
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        code: 'INVALID_STATE_TRANSITION',
        fieldErrors: [{ field: 'query.limit', code: 'invalid_query' }],
      });
    },
  );

  it('accepts only one canonical bounded feed limit and rejects unknown query keys', async () => {
    const app = openApp();
    const openedResponse = await app.inject({
      method: 'POST',
      url: '/v1/sync/streams',
      headers: headers(),
      payload: streamOpenBody(),
    });
    const opened = SyncStreamOpenResponseSchema.parse(openedResponse.json());
    const bootstrapResponse = await app.inject({
      method: 'POST',
      url: '/v1/sync/bootstrap',
      headers: headers(),
      payload: {
        bootstrapVersion: 1,
        streamId: opened.streamId,
        localDatabaseSchemaVersion: 1,
        supportedProjectionVersions: { minimum: 1, maximum: 1 },
      },
    });
    const bootstrap = SyncBootstrapResponseSchema.parse(bootstrapResponse.json());

    for (const limit of ['1', '100']) {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/sync/feed?streamId=${opened.streamId}&cursor=${bootstrap.cursor}&limit=${limit}`,
        headers: headers(),
      });
      expect(response.statusCode, response.body).toBe(200);
    }

    for (const suffix of ['extra=value', 'limit=1&limit=2']) {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/sync/feed?streamId=${opened.streamId}&cursor=${bootstrap.cursor}&${suffix}`,
        headers: headers(),
      });
      expect(response.statusCode).toBe(400);
    }
  });

  it('enforces the reviewed cursor and limit metadata on the conflict list', async () => {
    const app = openApp();
    const valid = await app.inject({
      method: 'GET',
      url: '/v1/sync/conflicts?limit=100',
      headers: headers(),
    });
    expect(valid.statusCode, valid.body).toBe(200);
    expect(valid.json()).toEqual({ conflicts: [] });

    for (const query of ['limit=0', 'cursor=', 'cursor=opaque-next', 'page=2']) {
      const invalid = await app.inject({
        method: 'GET',
        url: `/v1/sync/conflicts?${query}`,
        headers: headers(),
      });
      expect(invalid.statusCode).toBe(400);
    }
  });

  it('uses 410 for an expired upload intent and 422 for integrity mismatch', async () => {
    let currentTime = new Date(NOW);
    const app = openApp(undefined, undefined, () => currentTime);
    const expiredCreatedResponse = await app.inject({
      method: 'POST',
      url: '/v1/media/upload-intents',
      headers: headers(true),
      payload: mediaIntentBody(),
    });
    const expiredCreated = CreateMediaUploadIntentResponseSchema.parse(
      expiredCreatedResponse.json(),
    );
    currentTime = new Date(Date.parse(expiredCreated.expiresAt));
    const expired = await app.inject({
      method: 'POST',
      url: `/v1/media/upload-intents/${expiredCreated.intentId}:finalize`,
      headers: headers(true, '00000000-0000-4000-8000-000000000402'),
      payload: { objectGeneration: '17', sha256: DIGEST, finalSizeBytes: 128 },
    });
    expect(expired.statusCode).toBe(410);
    expect(expired.json()).toMatchObject({ code: 'UPLOAD_INTENT_EXPIRED', status: 410 });

    currentTime = new Date(NOW);
    const mismatchedCreatedResponse = await app.inject({
      method: 'POST',
      url: '/v1/media/upload-intents',
      headers: headers(true, '00000000-0000-4000-8000-000000000403'),
      payload: mediaIntentBody(),
    });
    const mismatchedCreated = CreateMediaUploadIntentResponseSchema.parse(
      mismatchedCreatedResponse.json(),
    );
    const mismatched = await app.inject({
      method: 'POST',
      url: `/v1/media/upload-intents/${mismatchedCreated.intentId}:finalize`,
      headers: headers(true, '00000000-0000-4000-8000-000000000404'),
      payload: {
        objectGeneration: '17',
        sha256: `sha256:${'b'.repeat(64)}`,
        finalSizeBytes: 128,
      },
    });
    expect(mismatched.statusCode).toBe(422);
    expect(mismatched.json()).toMatchObject({ code: 'MEDIA_INTEGRITY_MISMATCH', status: 422 });
  });

  it('streams only through the reauthorizing service and honors one byte range', async () => {
    const read = vi.fn<ProtectedMediaContentService['read']>(() =>
      Promise.resolve({
        bytes: Uint8Array.from([2, 3]),
        contentType: 'audio/wav',
        totalSize: 4,
        start: 1,
        end: 2,
        objectGeneration: '7',
        sha256: DIGEST,
      }),
    );
    const authorizedOperations: DomainOperationId[] = [];
    const app = openApp({ read }, (operationId) => authorizedOperations.push(operationId));
    const response = await app.inject({
      method: 'GET',
      url: `/v1/media/attachments/${ATTACHMENT}/content`,
      headers: { ...headers(), range: 'bytes=1-2' },
    });
    expect(response.statusCode).toBe(206);
    expect(response.headers['content-range']).toBe('bytes 1-2/4');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(read).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentId: ATTACHMENT, range: { start: 1, end: 2 } }),
    );
    expect(authorizedOperations.at(-1)).toBe('streamMediaAttachment');

    const invalid = await app.inject({
      method: 'GET',
      url: `/v1/media/attachments/${ATTACHMENT}/content`,
      headers: { ...headers(), range: 'bytes=0-1,2-3' },
    });
    expect(invalid.statusCode).toBe(416);
    expect(invalid.json()).toMatchObject({ code: 'MEDIA_INTEGRITY_MISMATCH' });
  });

  it.each(['text/html', 'image/svg+xml', 'application/octet-stream', 'audio/wav\r\nx-test: 1'])(
    'fails closed when protected media returns unsafe Content-Type %s',
    async (contentType) => {
      const app = openApp({
        read: () =>
          Promise.resolve({
            bytes: Uint8Array.from([1]),
            contentType,
            totalSize: 1,
            start: 0,
            end: 0,
            objectGeneration: '7',
            sha256: DIGEST,
          }),
      });
      const response = await app.inject({
        method: 'GET',
        url: `/v1/media/attachments/${ATTACHMENT}/content`,
        headers: headers(),
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.headers['content-type']).not.toContain(contentType);
    },
  );
});
