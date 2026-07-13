import { randomUUID } from 'node:crypto';

import {
  CommandResultSchema,
  ConsentListResponseSchema,
  FarmerBootstrapResponseSchema,
  HealthPayloadSchema,
  IssueAccessGrantCommandSchema,
  ProblemDetailsSchema,
  ProtectedDisclosureRequestSchema,
  ProtectedDisclosureResponseSchema,
  RecordConsentDecisionCommandSchema,
  ReturnStateRequestSchema,
  ReturnStateResponseSchema,
  RskBootstrapResponseSchema,
  SelectRoleContextCommandSchema,
  SessionResponseSchema,
  UuidSchema,
} from '@smart-fasal/contracts/schemas';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import {
  ApiBoundaryProblem,
  dependencyUnavailable,
  type AppCheckVerifier,
  type DomainOperationAdapter,
  type DomainOperationId,
  type DomainSurface,
  type IdentityVerifier,
  type ProblemCode,
  type ProtectedDisclosureAuthorizationResource,
  type ProtectedDisclosureService,
  type RequestAuthorizer,
  type SafeRequestLogger,
  type VerifiedRequestBoundary,
} from './boundary.js';
import type { DeploymentEnvironment } from './config.js';
import { SERVICE_NAME } from './config.js';

type OriginSurface = 'farmer' | 'rsk' | 'mp';
type RuntimeMode = 'development' | 'test' | 'production';

interface ContractIssue {
  code: string;
  path: readonly PropertyKey[];
}

interface ContractSchema<T> {
  safeParse(
    input: unknown,
  ): { success: true; data: T } | { success: false; error: { issues: readonly ContractIssue[] } };
}

interface RequestState {
  correlationId: string;
  startedAt: number;
  environment: DeploymentEnvironment;
  actorClass?: 'FARMER' | 'STAFF';
  clientBuild?: string;
  corsOrigin?: string;
  problemCode?: ProblemCode;
}

interface BoundaryRoute {
  operationId: DomainOperationId;
  surface: DomainSurface;
  auth: 'app-check' | 'identity';
  mutation: boolean;
  command: boolean;
  requiresExpectedRevision?: boolean;
  capability?: string;
  purpose?: string;
}

export interface DomainApiOptions {
  environment: DeploymentEnvironment;
  origins: Readonly<Record<OriginSurface, readonly string[]>>;
  appIds: Readonly<Record<OriginSurface, readonly string[]>>;
  runtimeMode?: RuntimeMode;
  readiness?: () => boolean | Promise<boolean>;
  identityVerifier?: IdentityVerifier;
  appCheckVerifier?: AppCheckVerifier;
  authorizer?: RequestAuthorizer;
  operations?: DomainOperationAdapter;
  protectedDisclosure?: ProtectedDisclosureService;
  requestLogger?: SafeRequestLogger;
}

const CLIENT_HEADER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$/u;
const BUILD_HEADER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,79}$/u;
const SUPPORTED_CLIENT_SCHEMA_VERSION = 1 as const;
const CREDENTIAL_QUERY_KEYS = new Set([
  'access_token',
  'appcheck',
  'authorization',
  'firebase_appcheck',
  'id_token',
  'token',
]);
const CORS_HEADERS = [
  'Accept-Language',
  'Authorization',
  'Content-Type',
  'Idempotency-Key',
  'If-Match',
  'X-Client-Build',
  'X-Client-Installation-Id',
  'X-Client-Schema-Version',
  'X-Correlation-Id',
  'X-Firebase-AppCheck',
  'X-Role-Context-Id',
].join(', ');

const unavailableOperations: DomainOperationAdapter = {
  execute: () => Promise.reject(dependencyUnavailable()),
};

const unavailableProtectedDisclosure: ProtectedDisclosureService = {
  disclose: () => Promise.reject(dependencyUnavailable()),
};

function safeRuntimeMode(value: string | undefined): RuntimeMode {
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

function validateExactOrigin(origin: string, runtimeMode: RuntimeMode): void {
  const parsed = new URL(origin);
  if (
    origin === '*' ||
    parsed.origin !== origin ||
    !['http:', 'https:'].includes(parsed.protocol)
  ) {
    throw new Error('Configured application origins must be exact HTTP(S) origins.');
  }
  if (runtimeMode === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Configured application origins must use HTTPS in production.');
  }
}

function createOriginRegistry(
  origins: DomainApiOptions['origins'],
  runtimeMode: RuntimeMode,
): ReadonlyMap<string, OriginSurface> {
  const registry = new Map<string, OriginSurface>();
  for (const surface of ['farmer', 'rsk', 'mp'] as const) {
    for (const origin of origins[surface]) {
      validateExactOrigin(origin, runtimeMode);
      if (registry.has(origin)) {
        throw new Error('Application origins must remain physically separate by surface.');
      }
      registry.set(origin, surface);
    }
  }
  return registry;
}

function validateAppIds(appIds: DomainApiOptions['appIds']): void {
  const owners = new Map<string, OriginSurface>();
  for (const surface of ['farmer', 'rsk', 'mp'] as const) {
    for (const appId of appIds[surface]) {
      if (appId.trim().length === 0 || appId === '*') {
        throw new Error('Firebase App IDs must be explicit non-empty values.');
      }
      const owner = owners.get(appId);
      if (owner !== undefined && owner !== surface) {
        throw new Error('Firebase App IDs must remain physically separate by surface.');
      }
      owners.set(appId, surface);
    }
  }
}

function validationProblem(issues: readonly ContractIssue[]): ApiBoundaryProblem {
  return new ApiBoundaryProblem({
    code: 'INVALID_STATE_TRANSITION',
    status: 400,
    title: 'The request does not match the required contract.',
    fieldErrors: issues.slice(0, 25).map((issue) => ({
      field: issue.path.length === 0 ? 'request' : issue.path.join('.'),
      code: issue.code,
    })),
  });
}

function missingHeaderProblem(field: string): ApiBoundaryProblem {
  return new ApiBoundaryProblem({
    code: 'INVALID_STATE_TRANSITION',
    status: 400,
    title: 'A required request header is missing or invalid.',
    fieldErrors: [{ field, code: 'invalid_header' }],
  });
}

function missingPreconditionProblem(field: string): ApiBoundaryProblem {
  return new ApiBoundaryProblem({
    code: 'INVALID_STATE_TRANSITION',
    status: 428,
    title: 'A required command precondition is missing.',
    fieldErrors: [{ field, code: 'precondition_required' }],
  });
}

function expectedRevisionMismatchProblem(): ApiBoundaryProblem {
  return new ApiBoundaryProblem({
    code: 'EXPECTED_REVISION_MISMATCH',
    status: 409,
    title: 'The command revision does not match its If-Match precondition.',
  });
}

function authenticationProblem(): ApiBoundaryProblem {
  return new ApiBoundaryProblem({
    code: 'AUTHENTICATION_REQUIRED',
    status: 401,
    title: 'Valid authentication is required.',
  });
}

function authorizationProblem(code: ProblemCode = 'AUTHORIZATION_DENIED'): ApiBoundaryProblem {
  const status =
    code === 'AUTHORIZATION_VERSION_CHANGED' || code === 'CONSENT_OR_ACCESS_VERSION_CHANGED'
      ? 409
      : 403;
  return new ApiBoundaryProblem({
    code,
    status,
    title: code === 'MFA_REQUIRED' ? 'Current staff MFA is required.' : 'Access is denied.',
  });
}

function parseContract<T>(schema: ContractSchema<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw validationProblem(parsed.error.issues);
  return parsed.data;
}

function parseAdapterResponse<T>(schema: ContractSchema<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw dependencyUnavailable();
  return parsed.data;
}

function singleHeader(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
}

function requiredHeader(request: FastifyRequest, name: string, pattern: RegExp): string {
  const value = singleHeader(request, name);
  if (value === undefined || !pattern.test(value)) throw missingHeaderProblem(name);
  return value;
}

function optionalUuidHeader(request: FastifyRequest, name: string): string | undefined {
  const value = singleHeader(request, name);
  if (value === undefined) return undefined;
  const parsed = UuidSchema.safeParse(value);
  if (!parsed.success) throw missingHeaderProblem(name);
  return parsed.data;
}

function requiredUuidHeader(request: FastifyRequest, name: string): string {
  const value = optionalUuidHeader(request, name);
  if (value === undefined) throw missingHeaderProblem(name);
  return value;
}

function commandIdHeader(request: FastifyRequest): string {
  if (singleHeader(request, 'idempotency-key') === undefined) {
    throw missingPreconditionProblem('idempotency-key');
  }
  return requiredUuidHeader(request, 'idempotency-key');
}

function readSchemaVersion(request: FastifyRequest): typeof SUPPORTED_CLIENT_SCHEMA_VERSION {
  const value = singleHeader(request, 'x-client-schema-version');
  if (value === undefined || !/^[1-9][0-9]{0,5}$/u.test(value)) {
    throw missingHeaderProblem('x-client-schema-version');
  }
  if (value !== String(SUPPORTED_CLIENT_SCHEMA_VERSION)) {
    throw new ApiBoundaryProblem({
      code: 'INVALID_STATE_TRANSITION',
      status: 400,
      title: 'The client schema version is not supported.',
      fieldErrors: [{ field: 'x-client-schema-version', code: 'unsupported_schema_version' }],
    });
  }
  return SUPPORTED_CLIENT_SCHEMA_VERSION;
}

function readExpectedRevision(request: FastifyRequest, required: boolean): number | undefined {
  const value = singleHeader(request, 'if-match');
  if (value === undefined && !required) return undefined;
  if (value === undefined) throw missingPreconditionProblem('if-match');
  const match = /^"rev:(0|[1-9][0-9]*)"$/u.exec(value);
  if (match?.[1] === undefined) throw missingHeaderProblem('if-match');
  const revision = Number(match[1]);
  if (!Number.isSafeInteger(revision)) throw missingHeaderProblem('if-match');
  return revision;
}

function readBearerToken(request: FastifyRequest): string {
  const authorization = singleHeader(request, 'authorization');
  const match = authorization?.match(/^Bearer ([^\s]+)$/u);
  if (match?.[1] === undefined) throw authenticationProblem();
  return match[1];
}

function isUnexpired(expiresAt: string): boolean {
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function routeSurfaceForPath(path: string): DomainSurface {
  if (path.startsWith('/v1/farmer/')) return 'farmer';
  if (path.startsWith('/v1/rsk/')) return 'rsk';
  return 'common';
}

function hasCredentialQuery(url: string): boolean {
  const parsed = new URL(url, 'http://api.invalid');
  return [...parsed.searchParams.keys()].some((key) =>
    CREDENTIAL_QUERY_KEYS.has(key.toLowerCase()),
  );
}

function isRequestParsingError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return false;
  return error.statusCode === 400 || error.statusCode === 413 || error.statusCode === 415;
}

function problemType(code: ProblemCode): string {
  return `https://smart-fasal.invalid/problems/${code.toLowerCase().replaceAll('_', '-')}`;
}

export function buildDomainApi(options: DomainApiOptions): FastifyInstance {
  const runtimeMode = options.runtimeMode ?? safeRuntimeMode(process.env['NODE_ENV']);
  if (
    runtimeMode === 'production' &&
    (options.identityVerifier?.mode === 'synthetic-test' ||
      options.appCheckVerifier?.mode === 'synthetic-test')
  ) {
    throw new Error('Synthetic credential verifiers cannot run in production.');
  }
  const originRegistry = createOriginRegistry(options.origins, runtimeMode);
  validateAppIds(options.appIds);

  const app = Fastify({
    bodyLimit: 64 * 1024,
    logger: false,
  });
  const states = new WeakMap<FastifyRequest, RequestState>();
  const operations = options.operations ?? unavailableOperations;
  const protectedDisclosure = options.protectedDisclosure ?? unavailableProtectedDisclosure;

  function stateFor(request: FastifyRequest): RequestState {
    const state = states.get(request);
    if (state === undefined) throw dependencyUnavailable();
    return state;
  }

  function surfaceAllowsOrigin(routeSurface: DomainSurface, originSurface: OriginSurface): boolean {
    return routeSurface === 'common' || routeSurface === originSurface;
  }

  function validateOrigin(request: FastifyRequest, route: BoundaryRoute): OriginSurface {
    const origin = singleHeader(request, 'origin');
    if (origin === undefined) throw authorizationProblem();
    const originSurface = originRegistry.get(origin);
    if (originSurface === undefined || !surfaceAllowsOrigin(route.surface, originSurface)) {
      throw authorizationProblem();
    }
    stateFor(request).corsOrigin = origin;
    return originSurface;
  }

  function credentialSurface(
    routeSurface: DomainSurface,
    originSurface: OriginSurface,
  ): OriginSurface {
    if (routeSurface === 'farmer') return 'farmer';
    if (routeSurface === 'rsk') return 'rsk';
    return originSurface;
  }

  function allowedAppIds(routeSurface: DomainSurface, originSurface: OriginSurface): Set<string> {
    if (routeSurface === 'farmer') return new Set(options.appIds.farmer);
    if (routeSurface === 'rsk') return new Set(options.appIds.rsk);
    return new Set(options.appIds[originSurface]);
  }

  async function verifyBoundary(
    request: FastifyRequest,
    route: BoundaryRoute,
    resource?: ProtectedDisclosureAuthorizationResource,
  ): Promise<VerifiedRequestBoundary> {
    const originSurface = validateOrigin(request, route);
    const origin = singleHeader(request, 'origin');
    const installationId = requiredHeader(
      request,
      'x-client-installation-id',
      CLIENT_HEADER_PATTERN,
    );
    const clientBuild = requiredHeader(request, 'x-client-build', BUILD_HEADER_PATTERN);
    const clientSchemaVersion = readSchemaVersion(request);
    const idempotencyKey = route.command ? commandIdHeader(request) : undefined;
    const expectedRevision = readExpectedRevision(request, route.requiresExpectedRevision ?? false);
    const roleContextId =
      route.surface === 'common'
        ? optionalUuidHeader(request, 'x-role-context-id')
        : requiredUuidHeader(request, 'x-role-context-id');
    const appCheckToken = singleHeader(request, 'x-firebase-appcheck');
    if (appCheckToken === undefined || appCheckToken.length === 0) throw authenticationProblem();
    if (options.appCheckVerifier === undefined) throw dependencyUnavailable();
    const surface = credentialSurface(route.surface, originSurface);
    const appCheckPromise = options.appCheckVerifier.verifyAppCheckToken(appCheckToken, {
      environment: options.environment,
      surface: surface.toUpperCase() as 'FARMER' | 'RSK' | 'MP',
    });

    const bearerToken = route.auth === 'identity' ? readBearerToken(request) : undefined;
    if (route.auth === 'identity' && options.identityVerifier === undefined) {
      await appCheckPromise.catch(() => undefined);
      throw dependencyUnavailable();
    }
    const identityPromise =
      bearerToken === undefined
        ? undefined
        : options.identityVerifier?.verifyIdToken(bearerToken, {
            checkRevoked: true,
            environment: options.environment,
            surface: surface.toUpperCase() as 'FARMER' | 'RSK' | 'MP',
          });
    const verificationResults = await Promise.allSettled(
      identityPromise === undefined ? [appCheckPromise] : [appCheckPromise, identityPromise],
    );
    const failures: ApiBoundaryProblem[] = [];
    for (const result of verificationResults) {
      if (result.status === 'rejected') {
        failures.push(
          result.reason instanceof ApiBoundaryProblem ? result.reason : authenticationProblem(),
        );
      }
    }
    const unavailable = failures.find((failure) => failure.code === 'DEPENDENCY_UNAVAILABLE');
    if (unavailable !== undefined) throw unavailable;
    if (failures.length > 0) throw authenticationProblem();

    const appCheckResult = verificationResults[0];
    if (appCheckResult.status !== 'fulfilled') throw authenticationProblem();
    const appCheck = appCheckResult.value;
    const expectedAppIds = allowedAppIds(route.surface, originSurface);
    if (expectedAppIds.size === 0) throw dependencyUnavailable();
    if (
      appCheck.environment !== options.environment ||
      !expectedAppIds.has(appCheck.appId) ||
      !isUnexpired(appCheck.expiresAt)
    ) {
      throw authenticationProblem();
    }

    const state = stateFor(request);
    state.clientBuild = clientBuild;

    if (route.auth === 'app-check') {
      return {
        correlationId: state.correlationId,
        environment: options.environment,
        installationId,
        clientBuild,
        clientSchemaVersion,
        appCheck,
        ...(origin === undefined ? {} : { origin }),
        ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
        ...(expectedRevision === undefined ? {} : { expectedRevision }),
        ...(roleContextId === undefined ? {} : { roleContextId }),
      };
    }
    const identityResult = verificationResults[1];
    if (identityResult?.status !== 'fulfilled') throw authenticationProblem();
    const identity = identityResult.value;
    if (
      identity.environment !== options.environment ||
      !isUnexpired(identity.expiresAt) ||
      !UuidSchema.safeParse(identity.subjectId).success ||
      !Number.isInteger(identity.securityVersion) ||
      identity.securityVersion < 1
    ) {
      throw authenticationProblem();
    }
    state.actorClass = identity.subjectType;
    if (options.authorizer === undefined) throw dependencyUnavailable();

    let decision;
    try {
      decision = await options.authorizer.authorize({
        operationId: route.operationId,
        surface: route.surface,
        installationId,
        clientBuild,
        clientSchemaVersion,
        identity,
        appCheck,
        ...(origin === undefined ? {} : { origin }),
        ...(roleContextId === undefined ? {} : { roleContextId }),
        ...(route.capability === undefined ? {} : { capability: route.capability }),
        ...(route.purpose === undefined ? {} : { purpose: route.purpose }),
        ...(resource === undefined ? {} : { resource }),
      });
    } catch {
      throw dependencyUnavailable();
    }
    if (!decision.allowed) throw authorizationProblem(decision.code);

    return {
      correlationId: state.correlationId,
      environment: options.environment,
      installationId,
      clientBuild,
      clientSchemaVersion,
      appCheck,
      identity,
      ...(origin === undefined ? {} : { origin }),
      ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
      ...(expectedRevision === undefined ? {} : { expectedRevision }),
      ...(roleContextId === undefined ? {} : { roleContextId }),
      ...(decision.context === undefined ? {} : { authorization: decision.context }),
    };
  }

  async function execute<T>(
    operationId: DomainOperationId,
    boundary: VerifiedRequestBoundary,
    responseSchema: ContractSchema<T>,
    details: { body?: unknown; params?: Readonly<Record<string, string>> } = {},
  ): Promise<T> {
    let output: unknown;
    try {
      output = await operations.execute({
        operationId,
        boundary,
        ...(details.body === undefined ? {} : { body: details.body }),
        ...(details.params === undefined ? {} : { params: details.params }),
      });
    } catch (error) {
      if (error instanceof ApiBoundaryProblem) throw error;
      throw dependencyUnavailable();
    }
    return parseAdapterResponse(responseSchema, output);
  }

  function sendProblem(
    request: FastifyRequest,
    reply: FastifyReply,
    problem: ApiBoundaryProblem,
  ): FastifyReply {
    const state = stateFor(request);
    state.problemCode = problem.code;
    const body = ProblemDetailsSchema.parse({
      type: problemType(problem.code),
      title: problem.title,
      status: problem.status,
      code: problem.code,
      correlationId: state.correlationId,
      retryable: problem.retryable,
      fieldErrors: problem.fieldErrors,
    });
    return reply.type('application/problem+json').code(problem.status).send(body);
  }

  app.addHook('onRequest', (request, _reply, done) => {
    const requestedCorrelation = singleHeader(request, 'x-correlation-id');
    const parsedCorrelation = UuidSchema.safeParse(requestedCorrelation);
    states.set(request, {
      correlationId: parsedCorrelation.success ? parsedCorrelation.data : randomUUID(),
      environment: options.environment,
      startedAt: performance.now(),
    });
    done();
  });

  app.addHook('preValidation', (request, _reply, done) => {
    if (hasCredentialQuery(request.url)) {
      done(
        new ApiBoundaryProblem({
          code: 'INVALID_STATE_TRANSITION',
          status: 400,
          title: 'Credentials are not accepted in URLs.',
        }),
      );
      return;
    }
    done();
  });

  app.addHook('onSend', (request, reply, payload, done) => {
    const state = stateFor(request);
    reply.header('Cache-Control', 'private, no-store');
    reply.header('X-Correlation-Id', state.correlationId);
    reply.header('X-Server-Time', new Date().toISOString());
    if (state.corsOrigin !== undefined) {
      reply.header('Access-Control-Allow-Origin', state.corsOrigin);
      reply.header('Vary', 'Origin');
    }
    done(null, payload);
  });

  app.addHook('onResponse', (request, reply, done) => {
    const state = stateFor(request);
    options.requestLogger?.write({
      service: SERVICE_NAME,
      route: request.routeOptions.url ?? 'unmatched',
      method: request.method,
      statusCode: reply.statusCode,
      durationMs: Math.max(0, Math.round((performance.now() - state.startedAt) * 100) / 100),
      environment: state.environment,
      correlationId: state.correlationId,
      ...(state.actorClass === undefined ? {} : { actorClass: state.actorClass }),
      ...(state.clientBuild === undefined ? {} : { clientBuild: state.clientBuild }),
      ...(state.problemCode === undefined ? {} : { problemCode: state.problemCode }),
    });
    done();
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiBoundaryProblem) {
      return sendProblem(request, reply, error);
    }
    if (isRequestParsingError(error)) {
      return sendProblem(request, reply, validationProblem([]));
    }
    return sendProblem(request, reply, dependencyUnavailable());
  });

  app.setNotFoundHandler((request, reply) =>
    sendProblem(
      request,
      reply,
      new ApiBoundaryProblem({
        code: 'AUTHORIZATION_DENIED',
        status: 404,
        title: 'The requested operation is not available.',
      }),
    ),
  );

  app.get('/health/live', () =>
    HealthPayloadSchema.parse({
      service: SERVICE_NAME,
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
  );

  app.get('/health/ready', async (_request, reply) => {
    const adaptersReady =
      options.identityVerifier !== undefined &&
      options.appCheckVerifier !== undefined &&
      options.authorizer !== undefined &&
      options.operations !== undefined &&
      options.protectedDisclosure !== undefined;
    const dependencyReady = await (options.readiness?.() ?? true);
    const ready = adaptersReady && dependencyReady;
    if (!ready) reply.code(503);
    return HealthPayloadSchema.parse({
      service: SERVICE_NAME,
      status: ready ? 'ok' : 'not_ready',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/v1/system/reachability', (request) => {
    const origin = singleHeader(request, 'origin');
    if (origin !== undefined && originRegistry.has(origin)) stateFor(request).corsOrigin = origin;
    return HealthPayloadSchema.parse({
      service: SERVICE_NAME,
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.options('/*', (request, reply) => {
    const origin = singleHeader(request, 'origin');
    const originSurface = origin === undefined ? undefined : originRegistry.get(origin);
    const routeSurface = routeSurfaceForPath(request.url);
    if (
      origin === undefined ||
      originSurface === undefined ||
      !surfaceAllowsOrigin(routeSurface, originSurface)
    ) {
      throw authorizationProblem();
    }
    stateFor(request).corsOrigin = origin;
    return reply
      .header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
      .header('Access-Control-Allow-Headers', CORS_HEADERS)
      .header('Access-Control-Max-Age', '600')
      .code(204)
      .send();
  });

  const returnStateRoute: BoundaryRoute = {
    operationId: 'createReturnState',
    surface: 'common',
    auth: 'app-check',
    mutation: true,
    command: false,
  };
  app.post('/v1/auth/return-states', async (request) => {
    const boundary = await verifyBoundary(request, returnStateRoute);
    const body = parseContract(ReturnStateRequestSchema, request.body);
    const expectedSurface: OriginSurface =
      body.routeKey === 'FARMER_HOME' ? 'farmer' : body.routeKey === 'RSK_HOME' ? 'rsk' : 'mp';
    if (boundary.origin === undefined || originRegistry.get(boundary.origin) !== expectedSurface) {
      throw authorizationProblem();
    }
    return execute('createReturnState', boundary, ReturnStateResponseSchema, { body });
  });

  const identityRoute = (
    operationId: DomainOperationId,
    additions: Omit<Partial<BoundaryRoute>, 'operationId' | 'auth'> = {},
  ): BoundaryRoute => ({
    operationId,
    surface: 'common',
    auth: 'identity',
    mutation: false,
    command: false,
    ...additions,
  });

  app.get('/v1/auth/session', async (request) => {
    const boundary = await verifyBoundary(request, identityRoute('getAuthSession'));
    return execute('getAuthSession', boundary, SessionResponseSchema);
  });

  app.get('/v1/auth/roles', async (request) => {
    const boundary = await verifyBoundary(request, identityRoute('listRoles'));
    return execute('listRoles', boundary, SessionResponseSchema);
  });

  app.post('/v1/auth/role-contexts', async (request) => {
    const route = identityRoute('selectRoleContext', {
      capability: 'identity.role_context.select',
      command: true,
      mutation: true,
    });
    const boundary = await verifyBoundary(request, route);
    const body = parseContract(SelectRoleContextCommandSchema, request.body);
    return execute('selectRoleContext', boundary, CommandResultSchema, { body });
  });

  app.delete<{ Params: { roleContextId: string } }>(
    '/v1/auth/role-contexts/:roleContextId',
    async (request) => {
      const route = identityRoute('revokeRoleContext', {
        capability: 'identity.role_context.select',
        command: true,
        mutation: true,
      });
      const boundary = await verifyBoundary(request, route);
      const roleContextId = parseContract(UuidSchema, request.params.roleContextId);
      return execute('revokeRoleContext', boundary, CommandResultSchema, {
        params: { roleContextId },
      });
    },
  );

  app.get('/v1/farmer/bootstrap', async (request) => {
    const route = identityRoute('getFarmerBootstrap', {
      surface: 'farmer',
      purpose: 'farmer.self_service',
    });
    const boundary = await verifyBoundary(request, route);
    return execute('getFarmerBootstrap', boundary, FarmerBootstrapResponseSchema);
  });

  app.get('/v1/farmer/consents', async (request) => {
    const route = identityRoute('listFarmerConsents', {
      surface: 'farmer',
      purpose: 'farmer.self_service',
    });
    const boundary = await verifyBoundary(request, route);
    return execute('listFarmerConsents', boundary, ConsentListResponseSchema);
  });

  app.post('/v1/farmer/consent-decisions', async (request) => {
    const route = identityRoute('recordConsentDecision', {
      surface: 'farmer',
      purpose: 'farmer.self_service',
      command: true,
      mutation: true,
      requiresExpectedRevision: true,
    });
    const boundary = await verifyBoundary(request, route);
    const body = parseContract(RecordConsentDecisionCommandSchema, request.body);
    if (body.expectedRevision !== boundary.expectedRevision) {
      throw expectedRevisionMismatchProblem();
    }
    return execute('recordConsentDecision', boundary, CommandResultSchema, { body });
  });

  app.get('/v1/rsk/bootstrap', async (request) => {
    const boundary = await verifyBoundary(
      request,
      identityRoute('getRskBootstrap', { surface: 'rsk' }),
    );
    return execute('getRskBootstrap', boundary, RskBootstrapResponseSchema);
  });

  app.post('/v1/rsk/access-grants', async (request) => {
    const route = identityRoute('issueRskAccessGrant', {
      surface: 'rsk',
      capability: 'rsk.access_grant.issue',
      purpose: 'assisted.service',
      command: true,
      mutation: true,
      requiresExpectedRevision: true,
    });
    const boundary = await verifyBoundary(request, route);
    const body = parseContract(IssueAccessGrantCommandSchema, request.body);
    if (body.expectedRevision !== boundary.expectedRevision) {
      throw expectedRevisionMismatchProblem();
    }
    return execute('issueRskAccessGrant', boundary, CommandResultSchema, { body });
  });

  app.post('/v1/rsk/protected-disclosures', async (request) => {
    const route = identityRoute('createRskProtectedDisclosure', {
      surface: 'rsk',
      capability: 'rsk.protected_disclose',
      purpose: 'assisted.service',
      mutation: true,
    });
    const body = parseContract(ProtectedDisclosureRequestSchema, request.body);
    const boundary = await verifyBoundary(request, route, body);
    let result;
    try {
      result = await protectedDisclosure.disclose({ boundary, resource: body });
    } catch (error) {
      if (error instanceof ApiBoundaryProblem) throw error;
      throw dependencyUnavailable();
    }
    if (!result.allowed) throw authorizationProblem(result.code);
    return parseAdapterResponse(ProtectedDisclosureResponseSchema, result.response);
  });

  return app;
}
