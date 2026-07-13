import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createFarmerClient } from '../generated/clients/farmer.ts';
import {
  buildCompatibilityManifest,
  buildOpenApi,
  createOutputs,
  generateContracts,
  runCli,
  statusForProblem,
} from './generate.ts';
import {
  CommandEnvelopeSchema,
  RecordConsentDecisionCommandSchema,
} from '../src/commands/index.ts';
import eventCatalog from '../src/events/catalog.json' with { type: 'json' };
import { EventEnvelopeSchema, MilestoneOneEventSchema } from '../src/events/index.ts';
import { MpQueryContextResponseSchema } from '../src/http/auth.ts';
import { HealthPayloadSchema } from '../src/http/common.ts';
import {
  HealthPayloadSchema as MpHealthPayloadSchema,
  MpQueryContextResponseSchema as MpReleaseQueryContextResponseSchema,
  MpSafeResultSchema as MpReleaseSafeResultSchema,
  MpSuppressedResultSchema as MpReleaseSuppressedResultSchema,
  MpUnavailableResultSchema as MpReleaseUnavailableResultSchema,
  PROBLEM_CODES as MP_PROBLEM_CODES,
  ProblemDetailsSchema as MpProblemDetailsSchema,
} from '../src/mp-release.ts';
import {
  MpSafeResultSchema,
  MpSuppressedResultSchema,
  MpUnavailableResultSchema,
} from '../src/privacy/index.ts';
import { ROUTES } from '../src/http/routes.ts';
import { SyncBatchResponseSchema, SyncBatchSchema } from '../src/sync/index.ts';
import { CAPABILITY_KEYS, CONSENT_SCOPES } from '../src/vocabulary.ts';

const packageRoot = resolve(import.meta.dirname, '..');
const uuid = '00000000-0000-4000-8000-000000000001';
const uuid2 = '00000000-0000-4000-8000-000000000002';
const uuid3 = '00000000-0000-4000-8000-000000000003';
const uuidV7 = '018f0000-0000-7000-8000-000000000001';
const uuidV7Two = '018f0000-0000-7000-8000-000000000002';
const timestamp = '2026-07-13T10:00:00+05:30';
const requestHash = `sha256:${'a'.repeat(64)}`;
const payloadChecksum = `sha256:${'b'.repeat(64)}`;

const commonSurfacePaths = [
  '/health/live',
  '/health/ready',
  '/v1/auth/return-states',
  '/v1/auth/role-contexts',
  '/v1/auth/role-contexts/{roleContextId}',
  '/v1/auth/roles',
  '/v1/auth/session',
  '/v1/system/reachability',
];

const surfacePaths = {
  farmer: [
    ...commonSurfacePaths,
    '/v1/farmer/bootstrap',
    '/v1/farmer/consent-decisions',
    '/v1/farmer/consents',
  ],
  rsk: [
    ...commonSurfacePaths,
    '/v1/rsk/access-grants',
    '/v1/rsk/bootstrap',
    '/v1/rsk/protected-disclosures',
  ],
  mp: [...commonSurfacePaths, '/v1/mp/query-context'],
};

const responseStatusesByOperation = {
  getLiveness: ['200'],
  getReadiness: ['200', '503'],
  getReachability: ['200'],
  createReturnState: ['200', '400', '401', '403', '429', '503'],
  getAuthSession: ['200', '400', '401', '403', '409', '503'],
  listRoles: ['200', '400', '401', '403', '409', '503'],
  selectRoleContext: ['200', '400', '401', '403', '409', '428', '503'],
  revokeRoleContext: ['200', '400', '401', '403', '409', '428', '503'],
  getFarmerBootstrap: ['200', '400', '401', '403', '409', '503'],
  listFarmerConsents: ['200', '400', '401', '403', '409', '503'],
  recordConsentDecision: ['200', '400', '401', '403', '409', '428', '503'],
  getRskBootstrap: ['200', '400', '401', '403', '409', '503'],
  issueRskAccessGrant: ['200', '400', '401', '403', '409', '428', '503'],
  createRskProtectedDisclosure: ['200', '400', '401', '403', '409', '503'],
  getMpQueryContext: ['200', '400', '401', '403', '409', '503'],
};

function roleContextCreatedEvent(overrides = {}) {
  return {
    eventId: uuidV7,
    eventName: 'identity.role_context_created',
    eventVersion: 1,
    aggregateType: 'roleContext',
    aggregateId: uuid,
    aggregateRevision: 1,
    eventOrdinal: 1,
    occurredAt: timestamp,
    serverReceivedAt: timestamp,
    committedAt: timestamp,
    actorType: 'SYSTEM',
    dataMode: 'LIVE',
    provenanceTypes: ['DERIVED'],
    modeDerivationVersion: 'server-mode-policy-v1',
    correlationId: uuid2,
    producerService: 'domain-api',
    producerBuild: 'domain-api-2026.07.13.1',
    payloadClassification: 'C2',
    retentionClass: 'identity-role-context',
    payloadSchemaVersion: 1,
    payload: {
      roleContextId: uuid,
      subjectId: uuid2,
      roleType: 'FARMER',
      authorizationVersion: 1,
      capabilitySetVersion: 1,
      expiresAt: timestamp,
    },
    payloadChecksum,
    ...overrides,
  };
}

function syncConsentCommand(overrides = {}) {
  return {
    commandId: uuid,
    clientEventIds: [uuid2],
    operation: 'RecordConsentDecision',
    commandSchemaVersion: 1,
    target: { type: 'consentDecision', id: uuid3 },
    expectedRevision: 0,
    occurredAt: timestamp,
    timezone: 'Asia/Kolkata',
    localSequence: 48,
    causalCommandIds: [],
    requestHash,
    payload: {
      decision: 'ALLOW',
      scopeKey: 'location.processing',
      purposeKey: 'farmer.self_service',
      targetKind: 'ACCOUNT',
      targetId: uuid2,
      policyVersionId: uuid3,
    },
    ...overrides,
  };
}

function syncBatch(overrides = {}) {
  return {
    syncBatchVersion: 1,
    batchId: uuid,
    streamId: uuid2,
    cursor: 'opaque-cursor',
    clientBuild: 'web-2026.07.13.1',
    commands: [syncConsentCommand()],
    feedLimit: 100,
    ...overrides,
  };
}

function collectComponentSchemaReferences(value, found = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectComponentSchemaReferences(item, found);
    return found;
  }
  if (value === null || typeof value !== 'object') return found;
  for (const [key, nested] of Object.entries(value)) {
    if (
      key === '$ref' &&
      typeof nested === 'string' &&
      nested.startsWith('#/components/schemas/')
    ) {
      found.add(nested.slice('#/components/schemas/'.length));
    } else {
      collectComponentSchemaReferences(nested, found);
    }
  }
  return found;
}

function recursivelyReferencedSchemas(api) {
  const found = collectComponentSchemaReferences(api.paths);
  const pending = [...found];
  while (pending.length > 0) {
    const schema = api.components.schemas[pending.pop()];
    expect(schema).toBeDefined();
    for (const dependency of collectComponentSchemaReferences(schema)) {
      if (found.has(dependency)) continue;
      found.add(dependency);
      pending.push(dependency);
    }
  }
  return [...found].sort();
}

describe('deterministic contract generation', () => {
  it('keeps every checked-in generated artifact synchronized', async () => {
    await expect(generateContracts({ checkOnly: true })).resolves.toBe(false);
  });

  it('produces deterministic outputs on repeated runs', async () => {
    const first = await createOutputs();
    const second = await createOutputs();
    expect([...first.entries()]).toEqual([...second.entries()]);
  });

  it('returns success from check mode for current artifacts', async () => {
    await expect(runCli(['node', 'generate.ts', '--check'])).resolves.toBe(0);
  });

  it('generates strict lower-camel-case JSON schema', async () => {
    const schema = JSON.parse(
      await readFile(resolve(packageRoot, 'generated/json-schema/problem-details.schema.json')),
    );
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toContain('correlationId');
    expect(schema.properties).toHaveProperty('fieldErrors');
    expect(schema.properties).not.toHaveProperty('field_errors');
  });

  it('preserves the Milestone 0 health compatibility horizon', () => {
    const api = buildOpenApi('platform');
    expect(api.paths).toHaveProperty('/health/live');
    expect(api.paths).toHaveProperty('/health/ready');
    expect(api.components.schemas.HealthPayload).toMatchObject({
      additionalProperties: false,
      required: ['service', 'status', 'timestamp'],
    });
  });

  it('generates executable Pydantic v2 models', async () => {
    const models = await readFile(
      resolve(packageRoot, 'generated/pydantic/smart_fasal_contracts/models.py'),
      'utf8',
    );
    expect(models).toContain('from pydantic import');
    expect(models).toContain('class ProblemDetails(BaseModel)');
    expect(models).toContain('class EventEnvelope(BaseModel)');
    expect(models).toContain('class MilestoneOneEvent');
  });
});

describe('OpenAPI surface policy', () => {
  it('keeps forbidden operational routes out of the MP surface', () => {
    const mp = buildOpenApi('mp');
    expect(mp.paths).toHaveProperty('/v1/mp/query-context');
    expect(mp.paths).not.toHaveProperty('/v1/farmer/consents');
    expect(mp.paths).not.toHaveProperty('/v1/rsk/protected-disclosures');
  });

  it.each(['farmer', 'rsk', 'mp'])(
    'keeps only recursively reachable schemas in the %s surface',
    (surface) => {
      const api = buildOpenApi(surface);
      expect(Object.keys(api.components.schemas).sort()).toEqual(recursivelyReferencedSchemas(api));
    },
  );

  it('physically excludes Farmer, RSK and C3 schemas from MP artifacts', async () => {
    const api = buildOpenApi('mp');
    expect(Object.keys(api.components.schemas).sort()).toEqual([
      'AuthorizationContext',
      'CommandResult',
      'HealthPayload',
      'MpQueryContextResponse',
      'ProblemDetails',
      'ReturnStateRequest',
      'ReturnStateResponse',
      'SelectRoleContextCommand',
      'SessionResponse',
    ]);

    const forbidden = [
      'ConsentListResponse',
      'FarmerBootstrapResponse',
      'IssueAccessGrantCommand',
      'ProtectedDisclosureRequest',
      'ProtectedDisclosureResponse',
      'RecordConsentDecisionCommand',
      'RskBootstrapResponse',
    ];
    for (const name of forbidden) expect(api.components.schemas).not.toHaveProperty(name);

    const [openApi, types, runtime] = await Promise.all([
      readFile(resolve(packageRoot, 'generated/openapi/mp.openapi.json'), 'utf8'),
      readFile(resolve(packageRoot, 'generated/clients/mp.types.ts'), 'utf8'),
      readFile(resolve(packageRoot, 'generated/runtime/mp-release.js'), 'utf8'),
    ]);
    for (const name of forbidden) {
      expect(openApi).not.toContain(name);
      expect(types).not.toContain(name);
      expect(runtime).not.toContain(name);
    }
    expect(runtime).not.toContain('displayName');
    expect(runtime).not.toContain('contact');
    expect(runtime).not.toMatch(/x-data-classification["']?:\s*["']C3/);
  });

  it.each([
    ['farmer', '/v1/farmer/consent-decisions'],
    ['rsk', '/v1/rsk/protected-disclosures'],
    ['mp', '/v1/mp/query-context'],
  ])('generates only the intended %s operations', (surface, expectedRoute) => {
    const api = buildOpenApi(surface);
    expect(api.paths).toHaveProperty(expectedRoute);
    const routeNames = Object.keys(api.paths);
    expect(
      routeNames.every(
        (path) =>
          path.startsWith('/health/') ||
          path.includes(`/${surface}/`) ||
          path.includes('/auth/') ||
          path.includes('/system/'),
      ),
    ).toBe(true);
  });

  it.each(Object.entries(surfacePaths))(
    'physically excludes every forbidden operation from the %s surface',
    (surface, expectedPaths) => {
      const api = buildOpenApi(surface);
      expect(Object.keys(api.paths).sort()).toEqual([...expectedPaths].sort());
    },
  );

  it('documents exact route-by-route boundary status and media-type parity', () => {
    const api = buildOpenApi('platform');
    expect(api.components.parameters.schemaVersion.schema).toEqual({
      type: 'string',
      const: '1',
    });
    expect(api.components.parameters.roleContextId).toMatchObject({
      in: 'header',
      name: 'X-Role-Context-Id',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    });
    expect(api.components.parameters.optionalRoleContextId).toMatchObject({
      in: 'header',
      name: 'X-Role-Context-Id',
      required: false,
      schema: { type: 'string', format: 'uuid' },
    });

    for (const route of ROUTES) {
      const operation = api.paths[route.path][route.method];
      expect(Object.keys(operation.responses).sort(), route.operationId).toEqual(
        responseStatusesByOperation[route.operationId],
      );

      const parameterReferences = operation.parameters
        .filter((parameter) => '$ref' in parameter)
        .map((parameter) => parameter.$ref);
      if (route.auth === 'none') {
        expect(parameterReferences, route.operationId).not.toContain(
          '#/components/parameters/schemaVersion',
        );
      } else {
        expect(parameterReferences, route.operationId).toEqual(
          expect.arrayContaining([
            '#/components/parameters/installationId',
            '#/components/parameters/clientBuild',
            '#/components/parameters/schemaVersion',
          ]),
        );
        expect(operation['x-smart-fasal-problem-codes'], route.operationId).toEqual(
          expect.arrayContaining([
            'AUTHENTICATION_REQUIRED',
            'AUTHORIZATION_DENIED',
            'DEPENDENCY_UNAVAILABLE',
          ]),
        );
      }
      if (route.surface === 'common') {
        expect(parameterReferences, route.operationId).not.toContain(
          '#/components/parameters/roleContextId',
        );
        if (route.operationId === 'getAuthSession' || route.operationId === 'listRoles') {
          expect(parameterReferences, route.operationId).toContain(
            '#/components/parameters/optionalRoleContextId',
          );
        } else {
          expect(parameterReferences, route.operationId).not.toContain(
            '#/components/parameters/optionalRoleContextId',
          );
        }
      } else {
        expect(parameterReferences, route.operationId).toContain(
          '#/components/parameters/roleContextId',
        );
        expect(parameterReferences, route.operationId).not.toContain(
          '#/components/parameters/optionalRoleContextId',
        );
      }

      const validationSources = [
        ...(route.requestSchema ? ['body'] : []),
        ...(route.path.includes('{') ? ['path'] : []),
        ...(route.auth !== 'none' ? ['headers'] : []),
      ];
      if (validationSources.length > 0) {
        expect(operation.responses['400'], route.operationId).toMatchObject({
          content: {
            'application/problem+json': {
              schema: { $ref: '#/components/schemas/ProblemDetails' },
            },
          },
          'x-smart-fasal-error-family': 'REQUEST_VALIDATION',
          'x-smart-fasal-validation-sources': validationSources,
        });
      }

      for (const [status, response] of Object.entries(operation.responses)) {
        if (status === '200' || (route.operationId === 'getReadiness' && status === '503')) {
          continue;
        }
        expect(Object.keys(response.content), `${route.operationId} ${status}`).toEqual([
          'application/problem+json',
        ]);
      }
    }

    const rateLimitedOperations = ROUTES.filter((route) => {
      const operation = api.paths[route.path][route.method];
      return Object.hasOwn(operation.responses, '429');
    }).map((route) => route.operationId);
    expect(rateLimitedOperations).toEqual(['createReturnState']);
  });

  it('serializes the optional role-context header through the generated client', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            subjectId: uuid,
            environment: 'development',
            authenticationTime: timestamp,
            authorizationVersion: 1,
            availableRoles: [],
            activeRoleContext: null,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    const client = createFarmerClient({
      baseUrl: 'https://farmer.api.smart-fasal.invalid',
      fetch: fetchMock,
    });

    await client.GET('/v1/auth/session', {
      params: {
        header: {
          'X-Client-Build': 'farmer-web-1',
          'X-Client-Installation-Id': 'test-installation',
          'X-Client-Schema-Version': '1',
          'X-Role-Context-Id': uuid,
        },
      },
    });

    const request = fetchMock.mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(Request);
    expect(request.headers.get('X-Role-Context-Id')).toBe(uuid);
  });

  it('publishes authorization, command, error, classification and retention policy metadata', () => {
    const api = buildOpenApi('platform');
    const operation = api.paths['/v1/farmer/consent-decisions'].post;
    expect(operation['x-smart-fasal-authorization']).toMatchObject({ denyByDefault: true });
    expect(operation['x-smart-fasal-command']).toEqual({
      idempotency: true,
      expectedRevision: true,
    });
    expect(operation['x-smart-fasal-problem-codes']).toContain('EXPECTED_REVISION_MISMATCH');
    expect(operation['x-data-classification']).toBe('C2');
    expect(operation['x-retention-class']).toBe('consent');
  });

  it('documents command validation, required preconditions and typed conflicts', () => {
    const api = buildOpenApi('platform');
    const commands = [
      ['/v1/auth/role-contexts', 'post', false],
      ['/v1/auth/role-contexts/{roleContextId}', 'delete', false],
      ['/v1/farmer/consent-decisions', 'post', true],
      ['/v1/rsk/access-grants', 'post', true],
    ];

    for (const [path, method, expectsRevision] of commands) {
      const operation = api.paths[path][method];
      expect(operation.responses['400']).toMatchObject({
        content: {
          'application/problem+json': {
            schema: { $ref: '#/components/schemas/ProblemDetails' },
          },
        },
        'x-smart-fasal-error-family': 'REQUEST_VALIDATION',
      });
      expect(operation.responses['428']).toMatchObject({
        content: {
          'application/problem+json': {
            schema: { $ref: '#/components/schemas/ProblemDetails' },
          },
        },
        'x-smart-fasal-error-family': 'PRECONDITION_REQUIRED',
      });
      expect(operation.responses['428']['x-smart-fasal-required-headers']).toEqual(
        expectsRevision ? ['Idempotency-Key', 'If-Match'] : ['Idempotency-Key'],
      );
      expect(operation.responses['409']['x-smart-fasal-problem-codes']).toContain(
        'IDEMPOTENCY_KEY_REUSED',
      );
      expect(operation.responses['409']['x-smart-fasal-error-family']).toBe('COMMAND_CONFLICT');
      expect(operation['x-smart-fasal-problem-codes']).toContain('IDEMPOTENCY_KEY_REUSED');

      if (expectsRevision) {
        expect(operation.responses['409']['x-smart-fasal-problem-codes']).toContain(
          'EXPECTED_REVISION_MISMATCH',
        );
        expect(operation['x-smart-fasal-problem-codes']).toContain('EXPECTED_REVISION_MISMATCH');
      }
    }

    expect(statusForProblem('INVALID_STATE_TRANSITION')).toBe(409);
    expect(statusForProblem('SYNC_CURSOR_INVALID')).toBe(400);
    expect(() => statusForProblem('VALIDATION_FAILED')).toThrow(/Unknown problem code/);
  });

  it('requires both identity and App Check on authenticated routes', () => {
    const api = buildOpenApi('platform');
    const security = api.paths['/v1/auth/session'].get.security;
    expect(security).toEqual([{ appCheck: [], bearerAuth: [] }]);
  });

  it('keeps credentials and protected identifiers out of path and query parameters', () => {
    const api = buildOpenApi('platform');
    for (const [path, pathItem] of Object.entries(api.paths)) {
      expect(path.toLowerCase()).not.toMatch(/phone|token|contact|coordinate|subjectid/);
      for (const operation of Object.values(pathItem)) {
        for (const parameter of operation.parameters ?? []) {
          if ('$ref' in parameter) continue;
          expect(parameter.in).not.toBe('query');
        }
      }
    }
  });

  it('freezes exact registries with no unrestricted administrator capability', () => {
    const api = buildOpenApi('platform');
    expect(api['x-smart-fasal-capability-registry']).toEqual(CAPABILITY_KEYS);
    expect(api['x-smart-fasal-consent-scope-registry']).toEqual(CONSENT_SCOPES);
    expect(CAPABILITY_KEYS.some((key) => key.includes('admin'))).toBe(false);
  });
});

describe('release-safe MP runtime contracts', () => {
  it.each([
    ['HealthPayload', MpHealthPayloadSchema, HealthPayloadSchema],
    ['MpQueryContextResponse', MpReleaseQueryContextResponseSchema, MpQueryContextResponseSchema],
    ['MpSafeResult', MpReleaseSafeResultSchema, MpSafeResultSchema],
    ['MpSuppressedResult', MpReleaseSuppressedResultSchema, MpSuppressedResultSchema],
    ['MpUnavailableResult', MpReleaseUnavailableResultSchema, MpUnavailableResultSchema],
  ])(
    'keeps standalone %s semantics aligned with the canonical schema',
    (_name, release, canonical) => {
      expect(z.toJSONSchema(release, { target: 'draft-2020-12' })).toEqual(
        z.toJSONSchema(canonical, { target: 'draft-2020-12' }),
      );
    },
  );

  it('allows only MP boundary problem codes', () => {
    expect(MP_PROBLEM_CODES).toEqual([
      'AUTHENTICATION_REQUIRED',
      'AUTHORIZATION_DENIED',
      'MFA_REQUIRED',
      'AUTHORIZATION_VERSION_CHANGED',
      'DEVICE_BINDING_MISMATCH',
      'INVALID_STATE_TRANSITION',
      'DEPENDENCY_UNAVAILABLE',
    ]);
    expect(
      MpProblemDetailsSchema.safeParse({
        type: 'https://smart-fasal.invalid/problems/media-not-verified',
        title: 'Not permitted on the MP boundary',
        status: 403,
        code: 'MEDIA_NOT_VERIFIED',
        correlationId: '00000000-0000-4000-8000-000000000001',
        retryable: false,
        fieldErrors: [],
      }).success,
    ).toBe(false);
  });
});

describe('v1 compatibility baseline', () => {
  it('freezes every HTTP operation and command/event/sync/device/voice/privacy schema', async () => {
    const baseline = JSON.parse(
      await readFile(resolve(packageRoot, 'compatibility/v1.manifest.json'), 'utf8'),
    );
    expect(buildCompatibilityManifest()).toEqual(baseline);
    expect(Object.keys(baseline.httpOperations)).toHaveLength(15);
    expect(Object.keys(baseline.schemaGroups)).toEqual([
      'commands',
      'device',
      'events',
      'privacy',
      'sync',
      'voice',
    ]);
  });
});

describe('event and consent authority', () => {
  it('freezes the complete catalogue and only marks Milestone 1 emitters executable', () => {
    expect(eventCatalog.events).toHaveLength(357);
    expect(new Set(eventCatalog.events.map((event) => event.name))).toHaveProperty('size', 357);
    expect(
      eventCatalog.events
        .filter((event) => event.status === 'executable')
        .map((event) => event.name),
    ).toEqual([
      'identity.role_context_created',
      'identity.role_context_revoked',
      'consent.decision_recorded',
    ]);
  });

  it('rejects combined accept-all and unknown consent fields', () => {
    const result = RecordConsentDecisionCommandSchema.safeParse({
      commandSchemaVersion: 1,
      operation: 'RecordConsentDecision',
      target: { type: 'consentDecision', id: '00000000-0000-4000-8000-000000000001' },
      expectedRevision: 0,
      payload: {
        decision: 'ALLOW',
        scopeKey: 'accept.all',
        purposeKey: 'farmer.self_service',
        targetKind: 'ACCOUNT',
        targetId: '00000000-0000-4000-8000-000000000002',
        policyVersionId: '00000000-0000-4000-8000-000000000003',
        scopes: CONSENT_SCOPES,
      },
      clientContext: {
        clientRecordedAt: '2026-07-13T10:00:00+05:30',
        timezone: 'Asia/Kolkata',
        dataModeClaim: 'LIVE',
      },
    });
    expect(result.success).toBe(false);
  });

  it('exports one strict command envelope and binds each operation to its exact target', () => {
    expect(CommandEnvelopeSchema.safeParse(syncConsentCommand()).success).toBe(false);

    const command = {
      commandSchemaVersion: 1,
      operation: 'RecordConsentDecision',
      target: { type: 'accessGrant', id: uuid },
      expectedRevision: 0,
      payload: syncConsentCommand().payload,
      clientContext: {
        clientRecordedAt: timestamp,
        timezone: 'Asia/Kolkata',
        dataModeClaim: 'LIVE',
      },
    };
    expect(CommandEnvelopeSchema.safeParse(command).success).toBe(false);
  });

  it('enforces the complete canonical event envelope and the three executable payloads', () => {
    const event = roleContextCreatedEvent();
    expect(EventEnvelopeSchema.parse(event)).toEqual(event);
    expect(MilestoneOneEventSchema.parse(event)).toEqual(event);

    expect(
      MilestoneOneEventSchema.safeParse({
        ...event,
        eventType: event.eventName,
      }).success,
    ).toBe(false);
    expect(MilestoneOneEventSchema.safeParse({ ...event, provenanceTypes: [] }).success).toBe(
      false,
    );
    expect(
      MilestoneOneEventSchema.safeParse({ ...event, payloadClassification: 'C3' }).success,
    ).toBe(false);
    expect(
      EventEnvelopeSchema.safeParse({ ...event, eventName: 'identity.invented' }).success,
    ).toBe(false);
  });

  it('uses the canonical consent scope and purpose registries in consent events', () => {
    const consentEvent = roleContextCreatedEvent({
      eventName: 'consent.decision_recorded',
      aggregateType: 'consentDecision',
      payload: {
        consentDecisionId: uuid,
        subjectId: uuid2,
        scopeKey: 'accept.all',
        purposeKey: 'unknown.purpose',
        targetKind: 'ACCOUNT',
        targetId: uuid3,
        decision: 'ALLOW',
        accessVersion: 1,
      },
    });
    expect(MilestoneOneEventSchema.safeParse(consentEvent).success).toBe(false);
  });
});

describe('Farmer sync contract authority', () => {
  it('accepts the Document 07 v1 batch shape and rejects the obsolete transport shape', () => {
    const batch = syncBatch();
    expect(SyncBatchSchema.parse(batch)).toEqual(batch);

    const { syncBatchVersion: _version, ...withoutVersion } = batch;
    expect(SyncBatchSchema.safeParse({ syncSchemaVersion: 1, ...withoutVersion }).success).toBe(
      false,
    );

    const { requestHash: _hash, ...withoutHash } = batch.commands[0];
    expect(SyncBatchSchema.safeParse({ ...batch, commands: [withoutHash] }).success).toBe(false);
    expect(
      SyncBatchSchema.safeParse({
        ...batch,
        commands: [
          syncConsentCommand({
            operation: 'IssueAccessGrant',
            target: { type: 'accessGrant', id: uuid3 },
          }),
        ],
      }).success,
    ).toBe(false);
  });

  it('requires complete dispositions, authorized feed data and cursor metadata', () => {
    const event = roleContextCreatedEvent();
    const response = {
      batchId: uuid,
      dispositions: [
        {
          commandId: uuid,
          clientEventIds: [uuid2],
          acknowledgementId: uuid3,
          serverReceivedAt: timestamp,
          disposition: 'ACCEPTED',
          authoritativeRevision: 1,
          serverEventIds: [uuidV7],
        },
      ],
      feedEvents: [
        {
          feedEventId: uuidV7Two,
          sequence: 1,
          integrationEvent: event,
          projectionDeltas: [
            {
              projectionType: 'consentState',
              projectionId: uuid3,
              projectionSchemaVersion: 1,
              authoritativeRevision: 1,
              changeType: 'UPSERT',
              dataMode: 'LIVE',
              payloadClassification: 'C2',
              payload: { state: 'ALLOWED' },
              payloadChecksum,
            },
          ],
        },
      ],
      nextCursor: 'opaque-next-cursor',
      highWaterMark: 'opaque-high-water-mark',
      hasMore: false,
      serverTime: timestamp,
      authorizationVersion: 1,
    };

    expect(SyncBatchResponseSchema.parse(response)).toEqual(response);
    expect(
      SyncBatchResponseSchema.safeParse({
        ...response,
        feedEvents: [
          {
            ...response.feedEvents[0],
            integrationEvent: {
              ...event,
              eventName: 'farmer.setup_saved',
              payload: {},
            },
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      SyncBatchResponseSchema.safeParse({
        ...response,
        dispositions: [{ ...response.dispositions[0], disposition: 'IN_PROGRESS' }],
      }).success,
    ).toBe(false);
    const { highWaterMark: _highWaterMark, ...withoutHighWaterMark } = response;
    expect(SyncBatchResponseSchema.safeParse(withoutHighWaterMark).success).toBe(false);
  });
});
