import { createHash } from 'node:crypto';

import {
  createFirebaseIdentityVerifier,
  type ApplicationSurface,
  type IdentityVerifier as CoreIdentityVerifier,
  type RuntimeEnvironment,
  type SecurityProblem,
  type SubjectSecurityRecord,
  type VerifiedIdentity as CoreVerifiedIdentity,
} from '@smart-fasal/authz';
import postgres, { type Sql } from 'postgres';

import { ApiBoundaryProblem, type AppCheckVerifier, type IdentityVerifier } from './boundary.js';
import type { DeploymentEnvironment } from './config.js';

type IdentityApiRole = 'sf_farmer_api' | 'sf_rsk_api';

interface SubjectRow {
  subject_id: string;
  subject_type: 'FARMER' | 'STAFF';
  environment: RuntimeEnvironment;
  security_version: string | number;
  status: 'ACTIVE' | 'DISABLED' | 'DELETED';
}

interface RolePostureRow {
  current_role: string;
  rolcanlogin: boolean;
  rolbypassrls: boolean;
  rolsuper: boolean;
}

export interface ProductionIdentityBoundary {
  identityVerifier: IdentityVerifier;
  appCheckVerifier: AppCheckVerifier;
  configured: boolean;
  close(): Promise<void>;
}

interface CredentialAdapterOptions {
  environment: DeploymentEnvironment;
  staffMfaMaximumAgeSeconds: number;
  verifiers: Readonly<Partial<Record<ApplicationSurface, CoreIdentityVerifier>>>;
  now?: () => Date;
}

export function providerSubjectDigest(providerUid: string): string {
  return createHash('sha256')
    .update('firebase\0', 'utf8')
    .update(providerUid, 'utf8')
    .digest('hex');
}

class PostgresSubjectResolver {
  private readonly sql: Sql;

  constructor(
    databaseUrl: string,
    private readonly role: IdentityApiRole,
  ) {
    this.sql = postgres(databaseUrl, { max: 4, prepare: false });
  }

  async resolve(
    providerUid: string,
    environment: DeploymentEnvironment,
  ): Promise<SubjectSecurityRecord | null> {
    const providerHash = providerSubjectDigest(providerUid);
    const rows = await this.sql.begin(async (transaction) => {
      await transaction`select set_config('role', ${this.role}, true)`;
      const posture = await transaction<RolePostureRow[]>`
        select current_user as current_role, rolcanlogin, rolbypassrls, rolsuper
        from pg_catalog.pg_roles
        where rolname = current_user
      `;
      const role = posture[0];
      if (
        role?.current_role !== this.role ||
        role.rolcanlogin ||
        role.rolbypassrls ||
        role.rolsuper
      ) {
        throw new Error('Identity database role posture is invalid.');
      }

      return transaction<SubjectRow[]>`
        select subject_id, subject_type, environment, security_version, status
        from identity.resolve_auth_subject(
          'firebase',
          ${providerHash},
          ${environment}
        )
      `;
    });

    if (rows.length === 0) return null;
    if (rows.length !== 1) throw new Error('Identity lookup returned an invalid result.');
    const row = rows[0];
    if (row === undefined) return null;
    const securityVersion = Number(row.security_version);
    if (!Number.isSafeInteger(securityVersion) || securityVersion < 1) {
      throw new Error('Identity lookup returned an invalid security version.');
    }
    return {
      subjectId: row.subject_id,
      subjectType: row.subject_type,
      environment: row.environment,
      securityVersion,
      status: row.status,
    };
  }

  close(): Promise<void> {
    return this.sql.end({ timeout: 5 });
  }
}

function problemFromSecurity(problem: SecurityProblem): ApiBoundaryProblem {
  return new ApiBoundaryProblem({
    code: problem.code,
    status: problem.status,
    title: problem.title,
    retryable: problem.retryable,
  });
}

function mfaState(
  identity: CoreVerifiedIdentity,
  now: Date,
  maximumAgeSeconds: number,
): 'NOT_REQUIRED' | 'CURRENT' | 'REQUIRED' | 'EXPIRED' {
  if (identity.subjectType === 'FARMER') return 'NOT_REQUIRED';
  if (identity.mfa === undefined) return 'REQUIRED';
  const assuredAt = Date.parse(identity.mfa.assuredAt);
  if (
    !Number.isFinite(assuredAt) ||
    assuredAt > now.getTime() ||
    now.getTime() - assuredAt > maximumAgeSeconds * 1_000
  ) {
    return 'EXPIRED';
  }
  return 'CURRENT';
}

export function createDomainCredentialAdapters(options: CredentialAdapterOptions): {
  identityVerifier: IdentityVerifier;
  appCheckVerifier: AppCheckVerifier;
} {
  const now = options.now ?? (() => new Date());

  function verifierFor(surface: ApplicationSurface): CoreIdentityVerifier {
    const verifier = options.verifiers[surface];
    if (verifier === undefined) {
      throw new ApiBoundaryProblem({
        code: 'DEPENDENCY_UNAVAILABLE',
        status: 503,
        title: 'Identity verification is not configured for this product surface.',
        retryable: false,
      });
    }
    return verifier;
  }

  return {
    identityVerifier: {
      mode: 'firebase-admin',
      async verifyIdToken(token, request) {
        if (request.environment !== options.environment) {
          throw new ApiBoundaryProblem({
            code: 'AUTHENTICATION_REQUIRED',
            status: 401,
            title: 'The credential environment does not match this service.',
          });
        }
        const result = await verifierFor(request.surface).verifyIdToken(token);
        if (!result.ok) throw problemFromSecurity(result.problem);
        return {
          subjectId: result.value.subjectId,
          subjectType: result.value.subjectType,
          environment: result.value.environment,
          expiresAt: result.value.expiresAt,
          securityVersion: result.value.securityVersion,
          mfaState: mfaState(result.value, now(), options.staffMfaMaximumAgeSeconds),
        };
      },
    },
    appCheckVerifier: {
      mode: 'firebase-admin',
      async verifyAppCheckToken(token, request) {
        if (request.environment !== options.environment) {
          throw new ApiBoundaryProblem({
            code: 'AUTHENTICATION_REQUIRED',
            status: 401,
            title: 'The application environment does not match this service.',
          });
        }
        const result = await verifierFor(request.surface).verifyAppCheckToken(
          token,
          request.surface,
        );
        if (!result.ok) throw problemFromSecurity(result.problem);
        return {
          appId: result.value.appId,
          environment: result.value.environment,
          expiresAt: result.value.expiresAt,
        };
      },
    },
  };
}

export function createProductionIdentityBoundary(options: {
  environment: DeploymentEnvironment;
  firebaseProjectId: string | undefined;
  appIds: Readonly<Record<'farmer' | 'rsk' | 'mp', readonly string[]>>;
  databaseUrls: Readonly<{ farmer: string | undefined; rsk: string | undefined }>;
  staffMfaMaximumAgeSeconds: number;
}): ProductionIdentityBoundary {
  const resolvers: Partial<Record<'FARMER' | 'RSK', PostgresSubjectResolver>> = {};
  if (options.databaseUrls.farmer !== undefined) {
    resolvers.FARMER = new PostgresSubjectResolver(options.databaseUrls.farmer, 'sf_farmer_api');
  }
  if (options.databaseUrls.rsk !== undefined) {
    resolvers.RSK = new PostgresSubjectResolver(options.databaseUrls.rsk, 'sf_rsk_api');
  }

  const appIdsBySurface: Readonly<Record<ApplicationSurface, readonly string[]>> = {
    FARMER: options.appIds.farmer,
    RSK: options.appIds.rsk,
    MP: options.appIds.mp,
  };
  const verifiers: Partial<Record<ApplicationSurface, CoreIdentityVerifier>> = {};
  if (options.firebaseProjectId !== undefined) {
    for (const surface of ['FARMER', 'RSK', 'MP'] as const) {
      const appIds = appIdsBySurface[surface];
      if (appIds.length === 0) continue;
      const result = createFirebaseIdentityVerifier({
        mode: 'firebase',
        environment: options.environment,
        projectId: options.firebaseProjectId,
        allowedAppIds: { [surface]: appIds },
        resolveSubject: async (providerUid) => {
          if (surface === 'MP') {
            throw new Error('MP identity lookup is not connected to an operational database.');
          }
          const resolver = resolvers[surface];
          if (resolver === undefined) throw new Error('Identity database is not configured.');
          return resolver.resolve(providerUid, options.environment);
        },
      });
      if (result.ok) verifiers[surface] = result.value;
    }
  }

  const adapters = createDomainCredentialAdapters({
    environment: options.environment,
    staffMfaMaximumAgeSeconds: options.staffMfaMaximumAgeSeconds,
    verifiers,
  });
  return {
    ...adapters,
    configured:
      options.firebaseProjectId !== undefined &&
      options.appIds.farmer.length > 0 &&
      options.appIds.rsk.length > 0 &&
      resolvers.FARMER !== undefined &&
      resolvers.RSK !== undefined,
    close: async () => {
      await Promise.all(Object.values(resolvers).map(async (resolver) => resolver.close()));
    },
  };
}
