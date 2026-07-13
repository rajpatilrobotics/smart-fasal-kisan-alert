import { randomUUID } from 'node:crypto';

import {
  HealthPayloadSchema,
  MpQueryContextResponseSchema,
  ProblemDetailsSchema,
  UuidSchema,
} from '@smart-fasal/contracts/release/mp';
import type { PROBLEM_CODES } from '@smart-fasal/contracts/release/mp';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import type { DeploymentEnvironment } from './config.js';
import { SERVICE_NAME } from './config.js';

type ProblemCode = (typeof PROBLEM_CODES)[number];

export interface VerifiedMpIdentity {
  subjectId: string;
  environment: DeploymentEnvironment;
  expiresAt: string;
  mfaState: 'CURRENT' | 'REQUIRED' | 'EXPIRED';
}

export interface VerifiedMpAppCheck {
  appId: string;
  environment: DeploymentEnvironment;
  expiresAt: string;
}

export interface MpIdentityVerifier {
  mode: 'firebase-admin' | 'synthetic-test';
  verifyIdToken(
    token: string,
    options: { checkRevoked: true; environment: DeploymentEnvironment },
  ): Promise<VerifiedMpIdentity>;
}

export interface MpAppCheckVerifier {
  mode: 'firebase-admin' | 'synthetic-test';
  verifyAppCheckToken(
    token: string,
    options: { environment: DeploymentEnvironment },
  ): Promise<VerifiedMpAppCheck>;
}

export interface MpRequestAuthorizer {
  authorize(request: {
    identity: VerifiedMpIdentity;
    appCheck: VerifiedMpAppCheck;
    origin?: string;
    installationId: string;
    clientBuild: string;
    clientSchemaVersion: 1;
    roleContextId: string;
  }): Promise<
    | { allowed: true }
    | {
        allowed: false;
        code:
          | 'AUTHORIZATION_DENIED'
          | 'AUTHORIZATION_VERSION_CHANGED'
          | 'DEVICE_BINDING_MISMATCH'
          | 'MFA_REQUIRED';
      }
  >;
}

export interface MpReleaseQueryAdapter {
  getQueryContext(): Promise<unknown>;
}

export interface MpSafeRequestLogRecord {
  service: 'mp-query-api';
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  environment: DeploymentEnvironment;
  correlationId: string;
  actorClass?: 'MP_STAFF';
  clientBuild?: string;
  problemCode?: ProblemCode;
}

export interface MpSafeRequestLogger {
  write(record: MpSafeRequestLogRecord): void;
}

export interface MpQueryApiOptions {
  environment: DeploymentEnvironment;
  origins: readonly string[];
  appIds: readonly string[];
  runtimeMode?: 'development' | 'test' | 'production';
  readiness?: () => boolean | Promise<boolean>;
  identityVerifier?: MpIdentityVerifier;
  appCheckVerifier?: MpAppCheckVerifier;
  authorizer?: MpRequestAuthorizer;
  releaseAdapter?: MpReleaseQueryAdapter;
  requestLogger?: MpSafeRequestLogger;
}

interface RequestState {
  correlationId: string;
  startedAt: number;
  environment: DeploymentEnvironment;
  corsOrigin?: string;
  clientBuild?: string;
  actorClass?: 'MP_STAFF';
  problemCode?: ProblemCode;
}

class MpApiProblem extends Error {
  readonly code: ProblemCode;
  readonly status: number;
  readonly title: string;
  readonly retryable: boolean;
  readonly fieldErrors: readonly { field: string; code: string }[];

  constructor(options: {
    code: ProblemCode;
    status: number;
    title: string;
    retryable?: boolean;
    fieldErrors?: readonly { field: string; code: string }[];
  }) {
    super(options.title);
    this.name = 'MpApiProblem';
    this.code = options.code;
    this.status = options.status;
    this.title = options.title;
    this.retryable = options.retryable ?? false;
    this.fieldErrors = options.fieldErrors ?? [];
  }
}

const unavailableReleaseAdapter: MpReleaseQueryAdapter = {
  getQueryContext: () =>
    Promise.resolve({
      state: 'UNAVAILABLE',
      code: 'DEPENDENCY_UNAVAILABLE',
      availableMetricKeys: [],
      activeRelease: null,
    }),
};

const CLIENT_HEADER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$/u;
const BUILD_HEADER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,79}$/u;
const SUPPORTED_CLIENT_SCHEMA_VERSION = 1 as const;
const CORS_HEADERS = [
  'Accept-Language',
  'Authorization',
  'Content-Type',
  'X-Client-Build',
  'X-Client-Installation-Id',
  'X-Client-Schema-Version',
  'X-Correlation-Id',
  'X-Firebase-AppCheck',
  'X-Role-Context-Id',
].join(', ');

function validateExactOrigins(
  origins: readonly string[],
  runtimeMode: 'development' | 'test' | 'production',
): Set<string> {
  const result = new Set<string>();
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (
      origin === '*' ||
      parsed.origin !== origin ||
      !['http:', 'https:'].includes(parsed.protocol)
    ) {
      throw new Error('MP origins must be exact HTTP(S) origins.');
    }
    if (runtimeMode === 'production' && parsed.protocol !== 'https:') {
      throw new Error('MP origins must use HTTPS in production.');
    }
    result.add(origin);
  }
  return result;
}

function validateAppIds(appIds: readonly string[]): Set<string> {
  if (appIds.some((appId) => appId.trim().length === 0 || appId === '*')) {
    throw new Error('MP Firebase App IDs must be explicit non-empty values.');
  }
  return new Set(appIds);
}

function singleHeader(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
}

function invalidHeader(field: string): MpApiProblem {
  return new MpApiProblem({
    code: 'INVALID_STATE_TRANSITION',
    status: 400,
    title: 'A required request header is missing or invalid.',
    fieldErrors: [{ field, code: 'invalid_header' }],
  });
}

function requiredHeader(request: FastifyRequest, name: string, pattern: RegExp): string {
  const value = singleHeader(request, name);
  if (value === undefined || !pattern.test(value)) throw invalidHeader(name);
  return value;
}

function requiredSchemaVersion(request: FastifyRequest): typeof SUPPORTED_CLIENT_SCHEMA_VERSION {
  const value = singleHeader(request, 'x-client-schema-version');
  if (value === undefined || !/^[1-9][0-9]{0,5}$/u.test(value)) {
    throw invalidHeader('x-client-schema-version');
  }
  if (value !== String(SUPPORTED_CLIENT_SCHEMA_VERSION)) {
    throw new MpApiProblem({
      code: 'INVALID_STATE_TRANSITION',
      status: 400,
      title: 'The client schema version is not supported.',
      fieldErrors: [{ field: 'x-client-schema-version', code: 'unsupported_schema_version' }],
    });
  }
  return SUPPORTED_CLIENT_SCHEMA_VERSION;
}

function authenticationRequired(): MpApiProblem {
  return new MpApiProblem({
    code: 'AUTHENTICATION_REQUIRED',
    status: 401,
    title: 'Valid authentication is required.',
  });
}

function dependencyUnavailable(): MpApiProblem {
  return new MpApiProblem({
    code: 'DEPENDENCY_UNAVAILABLE',
    status: 503,
    title: 'A required service dependency is unavailable.',
    retryable: true,
  });
}

function authorizationDenied(code: ProblemCode = 'AUTHORIZATION_DENIED'): MpApiProblem {
  return new MpApiProblem({
    code,
    status: code === 'AUTHORIZATION_VERSION_CHANGED' ? 409 : 403,
    title: code === 'MFA_REQUIRED' ? 'Current staff MFA is required.' : 'Access is denied.',
  });
}

function readBearerToken(request: FastifyRequest): string {
  const value = singleHeader(request, 'authorization');
  const match = value?.match(/^Bearer ([^\s]+)$/u);
  if (match?.[1] === undefined) throw authenticationRequired();
  return match[1];
}

function requiredRoleContext(request: FastifyRequest): string {
  const value = singleHeader(request, 'x-role-context-id');
  if (value === undefined) throw invalidHeader('x-role-context-id');
  const parsed = UuidSchema.safeParse(value);
  if (!parsed.success) throw invalidHeader('x-role-context-id');
  return parsed.data;
}

function isUnexpired(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function problemType(code: ProblemCode): string {
  return `https://smart-fasal.invalid/problems/${code.toLowerCase().replaceAll('_', '-')}`;
}

export function buildMpQueryApi(options: MpQueryApiOptions): FastifyInstance {
  const runtimeMode =
    options.runtimeMode ??
    (process.env['NODE_ENV'] === 'production' ? 'production' : 'development');
  if (
    runtimeMode === 'production' &&
    (options.identityVerifier?.mode === 'synthetic-test' ||
      options.appCheckVerifier?.mode === 'synthetic-test')
  ) {
    throw new Error('Synthetic credential verifiers cannot run in production.');
  }
  const origins = validateExactOrigins(options.origins, runtimeMode);
  const appIds = validateAppIds(options.appIds);

  const app = Fastify({
    bodyLimit: 16 * 1024,
    logger: false,
  });
  const states = new WeakMap<FastifyRequest, RequestState>();
  const releaseAdapter = options.releaseAdapter ?? unavailableReleaseAdapter;

  function stateFor(request: FastifyRequest): RequestState {
    const state = states.get(request);
    if (state === undefined) throw dependencyUnavailable();
    return state;
  }

  function sendProblem(
    request: FastifyRequest,
    reply: FastifyReply,
    problem: MpApiProblem,
  ): FastifyReply {
    const state = stateFor(request);
    state.problemCode = problem.code;
    return reply
      .type('application/problem+json')
      .code(problem.status)
      .send(
        ProblemDetailsSchema.parse({
          type: problemType(problem.code),
          title: problem.title,
          status: problem.status,
          code: problem.code,
          correlationId: state.correlationId,
          retryable: problem.retryable,
          fieldErrors: problem.fieldErrors,
        }),
      );
  }

  function validateOrigin(request: FastifyRequest): string {
    const origin = singleHeader(request, 'origin');
    if (origin === undefined) throw authorizationDenied();
    if (!origins.has(origin)) throw authorizationDenied();
    stateFor(request).corsOrigin = origin;
    return origin;
  }

  async function verifyRequest(request: FastifyRequest): Promise<void> {
    const origin = validateOrigin(request);
    const installationId = requiredHeader(
      request,
      'x-client-installation-id',
      CLIENT_HEADER_PATTERN,
    );
    const clientBuild = requiredHeader(request, 'x-client-build', BUILD_HEADER_PATTERN);
    const clientSchemaVersion = requiredSchemaVersion(request);
    const roleContextId = requiredRoleContext(request);
    const appCheckToken = singleHeader(request, 'x-firebase-appcheck');
    if (appCheckToken === undefined || appCheckToken.length === 0) throw authenticationRequired();
    if (options.appCheckVerifier === undefined || options.identityVerifier === undefined) {
      throw dependencyUnavailable();
    }

    const bearerToken = readBearerToken(request);
    const [appCheckResult, identityResult] = await Promise.allSettled([
      options.appCheckVerifier.verifyAppCheckToken(appCheckToken, {
        environment: options.environment,
      }),
      options.identityVerifier.verifyIdToken(bearerToken, {
        checkRevoked: true,
        environment: options.environment,
      }),
    ]);
    if (appCheckResult.status !== 'fulfilled' || identityResult.status !== 'fulfilled') {
      throw authenticationRequired();
    }
    const appCheck = appCheckResult.value;
    if (appIds.size === 0) throw dependencyUnavailable();
    if (
      appCheck.environment !== options.environment ||
      !appIds.has(appCheck.appId) ||
      !isUnexpired(appCheck.expiresAt)
    ) {
      throw authenticationRequired();
    }

    const identity = identityResult.value;
    if (
      identity.environment !== options.environment ||
      !isUnexpired(identity.expiresAt) ||
      !UuidSchema.safeParse(identity.subjectId).success
    ) {
      throw authenticationRequired();
    }
    if (options.authorizer === undefined) throw dependencyUnavailable();

    let decision;
    try {
      decision = await options.authorizer.authorize({
        identity,
        appCheck,
        installationId,
        clientBuild,
        clientSchemaVersion,
        origin,
        roleContextId,
      });
    } catch {
      throw dependencyUnavailable();
    }
    if (!decision.allowed) throw authorizationDenied(decision.code);
    const state = stateFor(request);
    state.actorClass = 'MP_STAFF';
    state.clientBuild = clientBuild;
  }

  app.addHook('onRequest', (request, _reply, done) => {
    const suppliedCorrelation = singleHeader(request, 'x-correlation-id');
    const parsed = UuidSchema.safeParse(suppliedCorrelation);
    states.set(request, {
      correlationId: parsed.success ? parsed.data : randomUUID(),
      environment: options.environment,
      startedAt: performance.now(),
    });
    done();
  });

  app.addHook('preValidation', (request, _reply, done) => {
    const query = new URL(request.url, 'http://api.invalid').searchParams;
    if (
      [...query.keys()].some((key) =>
        ['access_token', 'appcheck', 'authorization', 'id_token', 'token'].includes(
          key.toLowerCase(),
        ),
      )
    ) {
      done(
        new MpApiProblem({
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
    if (error instanceof MpApiProblem) return sendProblem(request, reply, error);
    return sendProblem(request, reply, dependencyUnavailable());
  });

  app.setNotFoundHandler((request, reply) =>
    sendProblem(
      request,
      reply,
      new MpApiProblem({
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
    const credentialBoundaryReady =
      options.identityVerifier !== undefined &&
      options.appCheckVerifier !== undefined &&
      options.authorizer !== undefined;
    const dependencyReady = await (options.readiness?.() ?? true);
    const ready = credentialBoundaryReady && dependencyReady;
    if (!ready) reply.code(503);
    return HealthPayloadSchema.parse({
      service: SERVICE_NAME,
      status: ready ? 'ok' : 'not_ready',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/v1/system/reachability', (request) => {
    const origin = singleHeader(request, 'origin');
    if (origin !== undefined && origins.has(origin)) stateFor(request).corsOrigin = origin;
    return HealthPayloadSchema.parse({
      service: SERVICE_NAME,
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.options('/*', (request, reply) => {
    const origin = singleHeader(request, 'origin');
    if (origin === undefined || !origins.has(origin)) throw authorizationDenied();
    stateFor(request).corsOrigin = origin;
    return reply
      .header('Access-Control-Allow-Methods', 'GET, OPTIONS')
      .header('Access-Control-Allow-Headers', CORS_HEADERS)
      .header('Access-Control-Max-Age', '600')
      .code(204)
      .send();
  });

  app.get('/v1/mp/query-context', async (request) => {
    await verifyRequest(request);
    let response: unknown;
    try {
      response = await releaseAdapter.getQueryContext();
    } catch {
      throw dependencyUnavailable();
    }
    const parsed = MpQueryContextResponseSchema.safeParse(response);
    if (!parsed.success) throw dependencyUnavailable();
    return parsed.data;
  });

  return app;
}
