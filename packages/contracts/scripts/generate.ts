import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { build as bundle } from 'esbuild';
import openapiTS, { astToString } from 'openapi-typescript';
import { z, type ZodType } from 'zod';

import {
  AuthorizationContextSchema,
  AttachOfflineAudioRequestSchema,
  AttachOfflineAudioResponseSchema,
  CancelMediaUploadIntentResponseSchema,
  CancelVoiceProposalRequestSchema,
  CommandEnvelopeSchema,
  CommandResultSchema,
  CommandSchema,
  ConfirmVoiceProposalRequestSchema,
  ConsentListResponseSchema,
  CorrectVoiceProposalRequestSchema,
  CreateMediaUploadIntentRequestSchema,
  CreateMediaUploadIntentResponseSchema,
  CreateVoiceSessionRequestSchema,
  CreateVoiceSessionResponseSchema,
  DeviceModeSchema,
  DeviceBatchReceiptSchema,
  EventEnvelopeSchema,
  FarmerBootstrapResponseSchema,
  FinalizeMediaUploadIntentRequestSchema,
  HealthPayloadSchema,
  IssueAccessGrantCommandSchema,
  JsonValueSchema,
  MediaAssetStatusResponseSchema,
  MediaOperationAcceptedResponseSchema,
  MilestoneOneEventSchema,
  MilestoneTwoEventSchema,
  MpQueryContextResponseSchema,
  MpSafeResultSchema,
  MpSuppressedResultSchema,
  MpUnavailableResultSchema,
  ProblemDetailsSchema,
  ProtectedDisclosureRequestSchema,
  ProtectedDisclosureResponseSchema,
  RecordConsentDecisionCommandSchema,
  ReturnStateRequestSchema,
  ReturnStateResponseSchema,
  RoleContextResponseSchema,
  RskBootstrapResponseSchema,
  ScanMediaAssetRequestSchema,
  SelectRoleContextCommandSchema,
  SessionResponseSchema,
  SyncBatchResponseSchema,
  SyncBatchResponseV2Schema,
  SyncBatchSchema,
  SyncBootstrapRequestSchema,
  SyncBootstrapResponseSchema,
  SyncCommandDispositionSchema,
  SyncCommandEnvelopeSchema,
  SyncCommandStatusResponseSchema,
  SyncConflictListResponseSchema,
  SyncConflictResolutionRequestSchema,
  SyncConflictSchema,
  SyncFeedEventSchema,
  SyncFeedEventV2Schema,
  SyncFeedPageResponseSchema,
  SyncFeedPageResponseV2Schema,
  SyncProjectionDeltaSchema,
  SyncStreamOpenRequestSchema,
  SyncStreamOpenResponseSchema,
  UnavailableSchema,
  VoiceCommandStatusResponseSchema,
  VoiceControlFrameSchema,
  VoiceDelegationSchema,
  VoiceProposalResponseSchema,
  VoiceTurnRequestSchema,
  VoiceTurnResponseSchema,
} from '../src/index.js';
import eventCatalog from '../src/events/catalog.json' with { type: 'json' };
import { ROUTES, type RouteContract, type Surface } from '../src/http/routes.js';
import {
  CAPABILITY_KEYS,
  CONSENT_SCOPES,
  PURPOSE_CODES,
  type PROBLEM_CODES,
} from '../src/vocabulary.js';

const execFileAsync = promisify(execFile);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(packageRoot, '../..');
const generatedRoot = resolve(packageRoot, 'generated');
const contractVersion = '1.1.0-m2';

const schemaRegistry = {
  AuthorizationContext: AuthorizationContextSchema,
  AttachOfflineAudioRequest: AttachOfflineAudioRequestSchema,
  AttachOfflineAudioResponse: AttachOfflineAudioResponseSchema,
  CancelMediaUploadIntentResponse: CancelMediaUploadIntentResponseSchema,
  CancelVoiceProposalRequest: CancelVoiceProposalRequestSchema,
  Command: CommandSchema,
  CommandEnvelope: CommandEnvelopeSchema,
  CommandResult: CommandResultSchema,
  ConfirmVoiceProposalRequest: ConfirmVoiceProposalRequestSchema,
  ConsentListResponse: ConsentListResponseSchema,
  CorrectVoiceProposalRequest: CorrectVoiceProposalRequestSchema,
  CreateMediaUploadIntentRequest: CreateMediaUploadIntentRequestSchema,
  CreateMediaUploadIntentResponse: CreateMediaUploadIntentResponseSchema,
  CreateVoiceSessionRequest: CreateVoiceSessionRequestSchema,
  CreateVoiceSessionResponse: CreateVoiceSessionResponseSchema,
  DeviceBatchReceipt: DeviceBatchReceiptSchema,
  DeviceMode: DeviceModeSchema,
  EventEnvelope: EventEnvelopeSchema,
  FarmerBootstrapResponse: FarmerBootstrapResponseSchema,
  FinalizeMediaUploadIntentRequest: FinalizeMediaUploadIntentRequestSchema,
  HealthPayload: HealthPayloadSchema,
  IssueAccessGrantCommand: IssueAccessGrantCommandSchema,
  JsonValue: JsonValueSchema,
  MediaAssetStatusResponse: MediaAssetStatusResponseSchema,
  MediaOperationAcceptedResponse: MediaOperationAcceptedResponseSchema,
  MilestoneOneEvent: MilestoneOneEventSchema,
  MilestoneTwoEvent: MilestoneTwoEventSchema,
  MpQueryContextResponse: MpQueryContextResponseSchema,
  MpSafeResult: MpSafeResultSchema,
  MpSuppressedResult: MpSuppressedResultSchema,
  MpUnavailableResult: MpUnavailableResultSchema,
  ProblemDetails: ProblemDetailsSchema,
  ProtectedDisclosureRequest: ProtectedDisclosureRequestSchema,
  ProtectedDisclosureResponse: ProtectedDisclosureResponseSchema,
  RecordConsentDecisionCommand: RecordConsentDecisionCommandSchema,
  ReturnStateRequest: ReturnStateRequestSchema,
  ReturnStateResponse: ReturnStateResponseSchema,
  RoleContextResponse: RoleContextResponseSchema,
  RskBootstrapResponse: RskBootstrapResponseSchema,
  ScanMediaAssetRequest: ScanMediaAssetRequestSchema,
  SelectRoleContextCommand: SelectRoleContextCommandSchema,
  SessionResponse: SessionResponseSchema,
  SyncBatch: SyncBatchSchema,
  SyncBatchResponse: SyncBatchResponseSchema,
  SyncBatchResponseV2: SyncBatchResponseV2Schema,
  SyncBootstrapRequest: SyncBootstrapRequestSchema,
  SyncBootstrapResponse: SyncBootstrapResponseSchema,
  SyncCommandDisposition: SyncCommandDispositionSchema,
  SyncCommandEnvelope: SyncCommandEnvelopeSchema,
  SyncCommandStatusResponse: SyncCommandStatusResponseSchema,
  SyncConflict: SyncConflictSchema,
  SyncConflictListResponse: SyncConflictListResponseSchema,
  SyncConflictResolutionRequest: SyncConflictResolutionRequestSchema,
  SyncFeedEvent: SyncFeedEventSchema,
  SyncFeedEventV2: SyncFeedEventV2Schema,
  SyncFeedPageResponse: SyncFeedPageResponseSchema,
  SyncFeedPageResponseV2: SyncFeedPageResponseV2Schema,
  SyncProjectionDelta: SyncProjectionDeltaSchema,
  SyncStreamOpenRequest: SyncStreamOpenRequestSchema,
  SyncStreamOpenResponse: SyncStreamOpenResponseSchema,
  Unavailable: UnavailableSchema,
  VoiceCommandStatusResponse: VoiceCommandStatusResponseSchema,
  VoiceControlFrame: VoiceControlFrameSchema,
  VoiceDelegation: VoiceDelegationSchema,
  VoiceProposalResponse: VoiceProposalResponseSchema,
  VoiceTurnRequest: VoiceTurnRequestSchema,
  VoiceTurnResponse: VoiceTurnResponseSchema,
} satisfies Record<string, ZodType>;

const compatibilitySchemaGroups = {
  commands: [
    'Command',
    'CommandEnvelope',
    'CommandResult',
    'IssueAccessGrantCommand',
    'RecordConsentDecisionCommand',
    'SelectRoleContextCommand',
  ],
  device: ['DeviceBatchReceipt'],
  events: ['EventEnvelope', 'MilestoneOneEvent', 'MilestoneTwoEvent'],
  media: [
    'AttachOfflineAudioRequest',
    'AttachOfflineAudioResponse',
    'CancelMediaUploadIntentResponse',
    'CreateMediaUploadIntentRequest',
    'CreateMediaUploadIntentResponse',
    'FinalizeMediaUploadIntentRequest',
    'MediaAssetStatusResponse',
    'MediaOperationAcceptedResponse',
    'ScanMediaAssetRequest',
  ],
  privacy: ['MpSafeResult', 'MpSuppressedResult', 'MpUnavailableResult'],
  sync: [
    'SyncBatch',
    'SyncBatchResponse',
    'SyncBatchResponseV2',
    'SyncCommandDisposition',
    'SyncCommandEnvelope',
    'SyncFeedEvent',
    'SyncFeedEventV2',
    'SyncFeedPageResponse',
    'SyncFeedPageResponseV2',
    'SyncProjectionDelta',
    'SyncBootstrapRequest',
    'SyncBootstrapResponse',
    'SyncCommandStatusResponse',
    'SyncConflict',
    'SyncConflictListResponse',
    'SyncConflictResolutionRequest',
    'SyncStreamOpenRequest',
    'SyncStreamOpenResponse',
  ],
  voice: [
    'CancelVoiceProposalRequest',
    'ConfirmVoiceProposalRequest',
    'CorrectVoiceProposalRequest',
    'CreateVoiceSessionRequest',
    'CreateVoiceSessionResponse',
    'VoiceCommandStatusResponse',
    'VoiceControlFrame',
    'VoiceDelegation',
    'VoiceProposalResponse',
    'VoiceTurnRequest',
    'VoiceTurnResponse',
  ],
} as const satisfies Record<string, readonly (keyof typeof schemaRegistry)[]>;

type ContractSurface = 'platform' | 'farmer' | 'rsk' | 'mp';
type JsonObject = Record<string, unknown>;

export async function createOutputs(): Promise<Map<string, string>> {
  const outputs = new Map<string, string>();
  const openApis = new Map<ContractSurface, JsonObject>();

  outputs.set(
    resolve(packageRoot, 'compatibility/v2.manifest.json'),
    prettyJson(buildCompatibilityManifest()),
  );

  for (const surface of ['platform', 'farmer', 'rsk', 'mp'] as const) {
    const document = buildOpenApi(surface);
    openApis.set(surface, document);
    outputs.set(resolve(generatedRoot, `openapi/${surface}.openapi.json`), prettyJson(document));
  }

  for (const [name, schema] of Object.entries(schemaRegistry)) {
    outputs.set(
      resolve(generatedRoot, `json-schema/${fileName(name)}.schema.json`),
      prettyJson(toJsonSchema(schema)),
    );
  }

  outputs.set(
    resolve(generatedRoot, 'json-schema/health.schema.json'),
    prettyJson(toJsonSchema(HealthPayloadSchema)),
  );

  outputs.set(
    resolve(generatedRoot, 'json-schema/platform.schema.json'),
    prettyJson({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://contracts.smart-fasal.invalid/platform.schema.json',
      title: 'Smart Fasal Milestone 2 contract registry',
      $defs: Object.fromEntries(
        Object.entries(schemaRegistry).map(([name, schema]) => [name, toJsonSchema(schema)]),
      ),
    }),
  );

  for (const [surface, document] of openApis) {
    const ast = await openapiTS(document as never, {
      alphabetize: true,
      immutable: true,
    });
    outputs.set(
      resolve(generatedRoot, `clients/${surface}.types.ts`),
      `// Generated from ${surface}.openapi.json. Do not edit by hand.\n${astToString(ast)}`,
    );

    if (surface !== 'platform') {
      outputs.set(resolve(generatedRoot, `clients/${surface}.ts`), clientModule(surface));
    }
  }

  outputs.set(
    resolve(generatedRoot, 'events/event-catalog.json'),
    prettyJson({ contractVersion, events: eventCatalog.events }),
  );
  outputs.set(resolve(generatedRoot, 'typescript/index.ts'), typescriptModule());
  outputs.set(resolve(generatedRoot, 'javascript/index.js'), javascriptModule());
  outputs.set(
    resolve(generatedRoot, 'runtime/schemas.js'),
    await runtimeSchemaModule('packages/contracts/src/index.ts'),
  );
  outputs.set(
    resolve(generatedRoot, 'runtime/mp-release.js'),
    await runtimeSchemaModule('packages/contracts/src/mp-release.ts'),
  );

  const pythonModels = await generatePydantic(openApis.get('platform')!);
  outputs.set(resolve(generatedRoot, 'pydantic/smart_fasal_contracts/models.py'), pythonModels);
  outputs.set(
    resolve(generatedRoot, 'pydantic/smart_fasal_contracts/__init__.py'),
    pythonPackageModule(),
  );
  outputs.set(
    resolve(generatedRoot, 'pydantic/smart_fasal_contracts/health.py'),
    '# Generated compatibility module. Do not edit by hand.\nfrom .models import HealthPayload, Status as HealthStatus\n\nCONTRACT_VERSION = "1.1.0-m2"\n\n__all__ = ["CONTRACT_VERSION", "HealthPayload", "HealthStatus"]\n',
  );
  outputs.set(resolve(generatedRoot, 'pydantic/smart_fasal_contracts/py.typed'), '');

  return outputs;
}

export function buildOpenApi(surface: ContractSurface): JsonObject {
  const paths: Record<string, Record<string, unknown>> = {};
  const selected = ROUTES.filter((route) => routeVisibleOnSurface(route.surface, surface));

  for (const route of selected) {
    paths[route.path] ??= {};
    paths[route.path]![route.method] = openApiOperation(route);
  }

  const allSchemas = Object.fromEntries(
    Object.entries(schemaRegistry).map(([name, schema]) => [name, openApiSchema(schema, name)]),
  );
  const components = surface === 'platform' ? allSchemas : reachableSchemas(paths, allSchemas);

  return {
    openapi: '3.1.0',
    info: {
      title: `Smart Fasal ${surface} API`,
      version: contractVersion,
      description: 'Generated Milestone 2 contract. JSON fields use lower camel case.',
    },
    servers: [{ url: `https://${surface}.api.smart-fasal.invalid` }],
    tags: [
      { name: 'system' },
      { name: 'auth' },
      { name: 'farmer' },
      { name: 'rsk' },
      { name: 'mp' },
      { name: 'media' },
      { name: 'sync' },
      { name: 'voice' },
      { name: 'internal' },
    ],
    paths,
    components: {
      schemas: components,
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID token' },
        appCheck: { type: 'apiKey', in: 'header', name: 'X-Firebase-AppCheck' },
        internalIdentity: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Google service identity token',
        },
        voiceTicket: {
          type: 'apiKey',
          in: 'header',
          name: 'Sec-WebSocket-Protocol',
          description: 'Exact sfka.voice.v1 plus dedicated ticket.<base64url> subprotocol tokens',
        },
      },
      parameters: {
        installationId: requiredHeader(
          'X-Client-Installation-Id',
          'Stable installation identifier',
          {
            type: 'string',
            minLength: 1,
            maxLength: 128,
            pattern: '^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$',
          },
        ),
        clientBuild: requiredHeader('X-Client-Build', 'Client build identifier', {
          type: 'string',
          minLength: 1,
          maxLength: 80,
          pattern: '^[A-Za-z0-9][A-Za-z0-9._+-]{0,79}$',
        }),
        schemaVersion: requiredHeader(
          'X-Client-Schema-Version',
          'Supported Milestone 2 contract schema version',
          { type: 'string', const: '1' },
        ),
        roleContextId: requiredHeader(
          'X-Role-Context-Id',
          'Current authorized role-context identifier',
          { type: 'string', format: 'uuid' },
        ),
        optionalRoleContextId: {
          in: 'header',
          name: 'X-Role-Context-Id',
          description: 'Selected role-context identifier when resolving the current session',
          required: false,
          schema: { type: 'string', format: 'uuid' },
        },
        commandId: requiredHeader('Idempotency-Key', 'Stable command UUID', {
          type: 'string',
          format: 'uuid',
        }),
        expectedRevision: requiredHeader(
          'If-Match',
          'Quoted entity revision, for example "rev:3"',
          { type: 'string', pattern: '^"rev:(0|[1-9][0-9]*)"$' },
        ),
        singleByteRange: {
          in: 'header',
          name: 'Range',
          description: 'Optional single inclusive byte range',
          required: false,
          schema: {
            type: 'string',
            pattern: '^bytes=(0|[1-9][0-9]*)-(0|[1-9][0-9]*)?$',
          },
        },
      },
    },
    'x-smart-fasal-capability-registry': CAPABILITY_KEYS,
    'x-smart-fasal-consent-scope-registry': CONSENT_SCOPES,
    'x-smart-fasal-purpose-registry': PURPOSE_CODES,
  };
}

/**
 * Immutable v1 fingerprints. Within the v1 compatibility horizon any wire change is treated as
 * breaking; a later compatible contract must introduce a separately reviewed versioned baseline.
 */
export function buildCompatibilityManifest(): JsonObject {
  const allSchemas = Object.fromEntries(
    Object.entries(schemaRegistry).map(([name, schema]) => [name, openApiSchema(schema, name)]),
  );
  const httpOperations = Object.fromEntries(
    ROUTES.map((route) => {
      const operation = openApiOperation(route);
      const schemas = reachableSchemas({ [route.path]: { [route.method]: operation } }, allSchemas);
      return [
        `${route.method.toUpperCase()} ${route.path}`,
        {
          operationId: route.operationId,
          surface: route.surface,
          fingerprint: fingerprint({ route, operation, schemas }),
        },
      ];
    }),
  );
  const schemaGroups = Object.fromEntries(
    Object.entries(compatibilitySchemaGroups).map(([group, schemaNames]) => [
      group,
      Object.fromEntries(
        schemaNames.map((name) => [
          name,
          { fingerprint: fingerprint(toJsonSchema(schemaRegistry[name])) },
        ]),
      ),
    ]),
  );

  return {
    baselineVersion: 2,
    contractVersion,
    policy: 'exact-wire-freeze',
    httpOperations,
    schemaGroups,
    eventCatalogue: {
      eventCount: eventCatalog.events.length,
      fingerprint: fingerprint(eventCatalog),
    },
  };
}

export async function generateContracts({ checkOnly = false } = {}): Promise<boolean> {
  const outputs = await createOutputs();
  let changed = false;

  for (const [path, expected] of outputs) {
    let current: string | undefined;
    try {
      current = await readFile(path, 'utf8');
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }

    if (current === expected) continue;
    changed = true;
    if (!checkOnly) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, expected, 'utf8');
    }
  }

  return changed;
}

export async function runCli(argv = process.argv): Promise<number> {
  const checkOnly = argv.includes('--check');
  const changed = await generateContracts({ checkOnly });
  if (checkOnly && changed) {
    console.error('Generated contracts are out of date. Run pnpm contracts:generate.');
    return 1;
  }
  return 0;
}

function openApiOperation(route: RouteContract): JsonObject {
  const operationProblemCodes = effectiveProblemCodes(route);
  const errors =
    route.operationId === 'getReadiness'
      ? { '503': schemaResponse('A required dependency is unavailable', 'HealthPayload') }
      : problemResponses(operationProblemCodes);
  if (route.operationId === 'streamMediaAttachment') {
    errors['416'] = {
      ...problemSchemaResponse('The requested byte range is not satisfiable'),
      'x-smart-fasal-problem-codes': ['MEDIA_INTEGRITY_MISMATCH'],
      'x-smart-fasal-error-family': 'RANGE_NOT_SATISFIABLE',
    };
  }
  Object.assign(errors, standardBoundaryProblemResponses(route, errors));

  const operation: JsonObject = {
    operationId: route.operationId,
    tags: [routeTag(route)],
    parameters: requiredParameters(route),
    responses: { ...successResponses(route), ...errors },
    security: securityFor(route.auth),
    'x-data-classification': route.classification,
    'x-retention-class': route.retentionClass,
    'x-smart-fasal-authorization': {
      authentication: route.auth,
      capability: route.capability ?? null,
      purpose: route.purpose ?? null,
      denyByDefault: true,
    },
    'x-smart-fasal-problem-codes': operationProblemCodes,
  };

  if (route.requestSchema) {
    operation['requestBody'] = {
      required: true,
      content: {
        'application/json': { schema: { $ref: `#/components/schemas/${route.requestSchema}` } },
      },
    };
  }
  if (route.command) operation['x-smart-fasal-command'] = route.command;
  return operation;
}

function requiredParameters(route: RouteContract): JsonObject[] {
  const parameters: JsonObject[] = [];
  if (route.auth !== 'none' && route.auth !== 'internal' && route.auth !== 'voice-ticket') {
    parameters.push(
      { $ref: '#/components/parameters/installationId' },
      { $ref: '#/components/parameters/clientBuild' },
      { $ref: '#/components/parameters/schemaVersion' },
    );
  }
  if (route.command?.idempotency) parameters.push({ $ref: '#/components/parameters/commandId' });
  const roleContext =
    route.roleContext ??
    (route.surface === 'farmer' || route.surface === 'rsk' || route.surface === 'mp'
      ? 'required'
      : 'none');
  if (roleContext === 'required') {
    parameters.push({ $ref: '#/components/parameters/roleContextId' });
  } else if (
    roleContext === 'optional' ||
    route.operationId === 'getAuthSession' ||
    route.operationId === 'listRoles'
  ) {
    parameters.push({ $ref: '#/components/parameters/optionalRoleContextId' });
  }
  if (route.command?.expectedRevision) {
    parameters.push({ $ref: '#/components/parameters/expectedRevision' });
  }
  if (route.rangeRequest === 'single-byte') {
    parameters.push({ $ref: '#/components/parameters/singleByteRange' });
  }
  for (const query of route.queryParameters ?? []) {
    parameters.push({
      in: 'query',
      name: query.name,
      description: query.description,
      required: query.required,
      schema: query.schema,
    });
  }
  for (const match of route.path.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)) {
    parameters.push({
      in: 'path',
      name: match[1],
      required: true,
      schema: { type: 'string', format: 'uuid' },
    });
  }
  return parameters;
}

function securityFor(auth: RouteContract['auth']): JsonObject[] {
  if (auth === 'none') return [];
  if (auth === 'app-check') return [{ appCheck: [] }];
  if (auth === 'internal') return [{ internalIdentity: [] }];
  if (auth === 'voice-ticket') return [{ voiceTicket: [] }];
  return [{ appCheck: [], bearerAuth: [] }];
}

function routeVisibleOnSurface(routeSurface: Surface, surface: ContractSurface): boolean {
  if (surface === 'platform') return true;
  if (routeSurface === 'common' || routeSurface === 'voice') return true;
  if (routeSurface === 'operational') return surface === 'farmer' || surface === 'rsk';
  if (routeSurface === 'internal') return false;
  return routeSurface === surface;
}

function routeTag(route: RouteContract): string {
  if (route.surface === 'common') return route.path.split('/')[2] ?? 'system';
  if (route.surface === 'operational') {
    return route.path.includes('/voice/') || route.path.includes('/commands/') ? 'voice' : 'media';
  }
  return route.surface;
}

function successResponses(route: RouteContract): JsonObject {
  const configured = route.success ?? [
    {
      status: 200 as const,
      description: 'Successful response',
      mediaType: 'json' as const,
      responseSchema: route.responseSchema,
    },
  ];
  return Object.fromEntries(
    configured.map((response) => {
      if (response.mediaType === 'websocket') {
        return [
          String(response.status),
          {
            description: response.description,
            'x-websocket-protocol': 'sfka.voice.v1',
          },
        ];
      }
      if (response.mediaType === 'binary') {
        return [
          String(response.status),
          {
            description: response.description,
            content: {
              'application/octet-stream': {
                schema: { type: 'string', format: 'binary' },
              },
            },
            'x-generation-pinned': true,
            'x-single-range-only': true,
          },
        ];
      }
      if (!response.responseSchema) {
        throw new Error(`Missing response schema for ${route.operationId}`);
      }
      return [
        String(response.status),
        schemaResponse(response.description, response.responseSchema),
      ];
    }),
  );
}

function requiredHeader(
  name: string,
  description: string,
  schema: JsonObject = { type: 'string', minLength: 1, maxLength: 160 },
): JsonObject {
  return {
    name,
    description,
    in: 'header',
    required: true,
    schema,
  };
}

function schemaResponse(description: string, schemaName: string): JsonObject {
  return {
    description,
    content: {
      'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } },
    },
  };
}

function problemSchemaResponse(description: string): JsonObject {
  return {
    description,
    content: {
      'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
    },
  };
}

function problemResponses(codes: readonly string[]): JsonObject {
  const grouped = new Map<number, string[]>();
  for (const code of codes) {
    const status = statusForProblem(code);
    const current = grouped.get(status) ?? [];
    current.push(code);
    grouped.set(status, current);
  }
  return Object.fromEntries(
    [...grouped.entries()].map(([status, problemCodes]) => [
      String(status),
      {
        ...problemSchemaResponse('Typed request failure'),
        'x-smart-fasal-problem-codes': problemCodes,
      },
    ]),
  );
}

function effectiveProblemCodes(route: RouteContract): string[] {
  const codes = [...route.problemCodes];
  if (route.command?.idempotency) codes.push('IDEMPOTENCY_KEY_REUSED');
  if (route.command?.expectedRevision) codes.push('EXPECTED_REVISION_MISMATCH');
  return [...new Set(codes)];
}

function standardBoundaryProblemResponses(
  route: RouteContract,
  current: Readonly<Record<string, unknown>>,
): JsonObject {
  const validationSources = [
    ...(route.requestSchema ? ['body'] : []),
    ...(route.path.includes('{') ? ['path'] : []),
    ...(route.queryParameters && route.queryParameters.length > 0 ? ['query'] : []),
    ...(route.auth !== 'none' ? ['headers'] : []),
  ];
  const responses: JsonObject = {};
  if (validationSources.length > 0) {
    const validation = current['400'];
    responses['400'] = {
      ...(typeof validation === 'object' && validation !== null
        ? validation
        : problemSchemaResponse('Request failed schema or value validation')),
      description: 'Request header, path or body failed schema or value validation',
      'x-smart-fasal-error-family': 'REQUEST_VALIDATION',
      'x-smart-fasal-validation-sources': validationSources,
    };
  }

  if (!route.command) return responses;

  const requiredHeaders = [
    ...(route.command.idempotency ? ['Idempotency-Key'] : []),
    ...(route.command.expectedRevision ? ['If-Match'] : []),
  ];
  const conflict = current['409'];

  return {
    ...responses,
    '409': {
      ...(typeof conflict === 'object' && conflict !== null
        ? conflict
        : problemSchemaResponse('Command conflict')),
      description: 'Command revision, idempotency hash or authorization-version conflict',
      'x-smart-fasal-error-family': 'COMMAND_CONFLICT',
    },
    '428': {
      ...problemSchemaResponse('A required command precondition is missing'),
      'x-smart-fasal-error-family': 'PRECONDITION_REQUIRED',
      'x-smart-fasal-required-headers': requiredHeaders,
    },
  };
}

const PROBLEM_STATUS = {
  AUTHENTICATION_REQUIRED: 401,
  AUTHORIZATION_DENIED: 403,
  MFA_REQUIRED: 403,
  AUTHORIZATION_VERSION_CHANGED: 409,
  CONSENT_OR_ACCESS_VERSION_CHANGED: 409,
  DEVICE_BINDING_MISMATCH: 403,
  IDEMPOTENCY_KEY_REUSED: 409,
  EXPECTED_REVISION_MISMATCH: 409,
  INVALID_STATE_TRANSITION: 409,
  TOMBSTONED_ENTITY: 409,
  SOURCE_VERSION_EXPIRED: 422,
  EVIDENCE_INSUFFICIENT: 422,
  SYNC_CURSOR_INVALID: 400,
  SYNC_CURSOR_EXPIRED: 410,
  SYNC_BOOTSTRAP_REQUIRED: 409,
  SYNC_SCHEMA_UNSUPPORTED: 415,
  SYNC_BATCH_ID_REUSED: 409,
  CAUSAL_DEPENDENCY_UNSATISFIED: 409,
  ASSIGNMENT_CHANGED: 409,
  CLOCK_UNTRUSTED: 422,
  MEDIA_INTEGRITY_MISMATCH: 422,
  MEDIA_NOT_VERIFIED: 409,
  UPLOAD_INTENT_EXPIRED: 410,
  VOICE_PROPOSAL_EXPIRED: 410,
  VOICE_PROPOSAL_HASH_MISMATCH: 409,
  VISUAL_REVIEW_REQUIRED: 422,
  RELEASE_INVALIDATED: 410,
  RELEASE_UNAVAILABLE: 'result-union',
  DEPENDENCY_UNAVAILABLE: 503,
  FILTER_NOT_ALLOWLISTED: 400,
  COMPARISON_NOT_RELEASABLE: 'result-union',
  BATCH_ID_PAYLOAD_MISMATCH: 409,
  RATE_LIMITED: 429,
} as const satisfies Record<(typeof PROBLEM_CODES)[number], number | 'result-union'>;

export function statusForProblem(code: string): number {
  if (!Object.hasOwn(PROBLEM_STATUS, code)) {
    throw new Error(`Unknown problem code in route contract: ${code}`);
  }
  const status = PROBLEM_STATUS[code as keyof typeof PROBLEM_STATUS];
  if (status === 'result-union') {
    throw new Error(`${code} is a successful result union and cannot be an HTTP problem response`);
  }
  return status;
}

function toJsonSchema(schema: ZodType): JsonObject {
  return z.toJSONSchema(schema, { target: 'draft-2020-12', unrepresentable: 'any' }) as JsonObject;
}

function openApiSchema(schema: ZodType, rootName: string): JsonObject {
  const output = rewriteOpenApiReferences(
    structuredClone(toJsonSchema(schema)),
    rootName,
  ) as JsonObject;
  delete output['$schema'];
  delete output['$defs'];
  return output;
}

function rewriteOpenApiReferences(value: unknown, rootName: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteOpenApiReferences(item, rootName));
  }
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as JsonObject).map(([key, nested]) => {
      if (key === '$ref' && nested === '#') {
        return [key, `#/components/schemas/${rootName}`];
      }
      if (key === '$ref' && typeof nested === 'string' && nested.startsWith('#/$defs/')) {
        return [key, nested.replace('#/$defs/', '#/components/schemas/')];
      }
      return [key, rewriteOpenApiReferences(nested, rootName)];
    }),
  );
}

function reachableSchemas(
  paths: Readonly<Record<string, unknown>>,
  allSchemas: Readonly<Record<string, JsonObject>>,
): Record<string, JsonObject> {
  const reachable = collectSchemaReferences(paths);
  const pending = [...reachable];

  while (pending.length > 0) {
    const name = pending.pop()!;
    const schema = allSchemas[name];
    if (schema === undefined) {
      throw new Error(`OpenAPI references unknown schema component: ${name}`);
    }
    for (const dependency of collectSchemaReferences(schema)) {
      if (reachable.has(dependency)) continue;
      reachable.add(dependency);
      pending.push(dependency);
    }
  }

  return Object.fromEntries(
    [...reachable]
      .sort((left, right) => left.localeCompare(right))
      .map((name) => [name, allSchemas[name]!]),
  );
}

function collectSchemaReferences(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectSchemaReferences(item, found);
    return found;
  }
  if (value === null || typeof value !== 'object') return found;

  for (const [key, nested] of Object.entries(value as JsonObject)) {
    if (
      key === '$ref' &&
      typeof nested === 'string' &&
      nested.startsWith('#/components/schemas/')
    ) {
      const name = nested.slice('#/components/schemas/'.length);
      if (name.length === 0 || name.includes('/')) {
        throw new Error(`Invalid OpenAPI schema reference: ${nested}`);
      }
      found.add(name);
      continue;
    }
    collectSchemaReferences(nested, found);
  }
  return found;
}

function clientModule(surface: Exclude<ContractSurface, 'platform'>): string {
  const title = surface[0]!.toUpperCase() + surface.slice(1);
  return `// Generated from ${surface}.openapi.json. Do not edit by hand.\nimport createClient from 'openapi-fetch';\n\nimport type { paths } from './${surface}.types.js';\n\nexport type ${title}ClientOptions = Parameters<typeof createClient>[0];\n\nexport function create${title}Client(options: ${title}ClientOptions) {\n  return createClient<paths>(options);\n}\n`;
}

function typescriptModule(): string {
  return `// Generated from strict Zod contracts. Do not edit by hand.\nimport { z } from 'zod';\n\nimport { HealthPayloadSchema } from '../../src/http/common.js';\n\nexport * from '../../src/index.js';\nexport const contractVersion = '${contractVersion}' as const;\nexport const serviceHealth = { statuses: ['ok', 'not_ready'] } as const;\nexport type HealthPayload = z.infer<typeof HealthPayloadSchema>;\nexport type HealthStatus = HealthPayload['status'];\nexport function isHealthPayload(value: unknown): value is HealthPayload {\n  return HealthPayloadSchema.safeParse(value).success;\n}\n`;
}

function javascriptModule(): string {
  return `// Generated from strict Zod contracts. Do not edit by hand.\nimport { HealthPayloadSchema } from '../runtime/schemas.js';\n\nexport const contractVersion = '${contractVersion}';\nexport const serviceHealth = { statuses: ['ok', 'not_ready'] };\nexport function isHealthPayload(value) {\n  return HealthPayloadSchema.safeParse(value).success;\n}\n`;
}

async function runtimeSchemaModule(entryPoint: string): Promise<string> {
  const result = await bundle({
    absWorkingDir: workspaceRoot,
    bundle: true,
    entryPoints: [entryPoint],
    external: ['zod'],
    format: 'esm',
    legalComments: 'none',
    outfile: 'schemas.js',
    platform: 'node',
    target: 'node24',
    write: false,
  });
  const output = result.outputFiles[0];
  if (!output) throw new Error('Runtime contract bundling produced no output');
  return output.text;
}

function pythonPackageModule(): string {
  return `# Generated by packages/contracts/scripts/generate.ts. Do not edit by hand.\nfrom .health import CONTRACT_VERSION, HealthPayload, HealthStatus\nfrom .models import *  # noqa: F403\n\n__all__ = ["CONTRACT_VERSION", "HealthPayload", "HealthStatus"]\n`;
}

async function generatePydantic(openApi: JsonObject): Promise<string> {
  const cacheDirectory = resolve(workspaceRoot, 'node_modules/.contract-codegen');
  const inputPath = resolve(cacheDirectory, 'platform.openapi.json');
  const outputPath = resolve(cacheDirectory, 'models.py');
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(inputPath, prettyJson(pydanticCompatibleOpenApi(openApi)), 'utf8');
  await execFileAsync(
    'uv',
    [
      'run',
      '--project',
      resolve(workspaceRoot, 'apps/intelligence-service'),
      'datamodel-codegen',
      '--input',
      inputPath,
      '--input-file-type',
      'openapi',
      '--output',
      outputPath,
      '--output-model-type',
      'pydantic_v2.BaseModel',
      '--target-python-version',
      '3.12',
      '--disable-timestamp',
      '--use-standard-collections',
      '--use-union-operator',
      '--use-annotated',
    ],
    { cwd: workspaceRoot },
  );
  return readFile(outputPath, 'utf8');
}

function pydanticCompatibleOpenApi(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(pydanticCompatibleOpenApi);
  if (value === null || typeof value !== 'object') return value;

  const schema = Object.fromEntries(
    Object.entries(value as JsonObject).map(([key, nested]) => [
      key,
      pydanticCompatibleOpenApi(nested),
    ]),
  );
  const semanticStringFormats = new Set([
    'date-time',
    'email',
    'ipv4',
    'ipv6',
    'uri',
    'url',
    'uuid',
  ]);
  if (typeof schema['format'] === 'string' && semanticStringFormats.has(schema['format'])) {
    // datamodel-code-generator maps these formats to semantic Pydantic types. Applying
    // string-only constraints after that conversion raises at runtime in Pydantic v2.
    delete schema['pattern'];
    delete schema['minLength'];
    delete schema['maxLength'];
  }
  return schema;
}

function prettyJson(value: unknown): string {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as JsonObject)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortValue(nested)]),
  );
}

function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(sortValue(value)))
    .digest('hex');
}

function fileName(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runCli();
}
