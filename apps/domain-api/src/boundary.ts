import type { AuthorizationContext, PROBLEM_CODES } from '@smart-fasal/contracts/schemas';

import type { DeploymentEnvironment } from './config.js';

export type DomainSurface = 'common' | 'farmer' | 'rsk';
export type ProblemCode = (typeof PROBLEM_CODES)[number];

export const DOMAIN_OPERATION_IDS = [
  'createReturnState',
  'getAuthSession',
  'listRoles',
  'selectRoleContext',
  'revokeRoleContext',
  'getFarmerBootstrap',
  'listFarmerConsents',
  'recordConsentDecision',
  'saveFarmerSetupDraft',
  'completeFarmerSetup',
  'getMyFarm',
  'listFarmerFarms',
  'createFarmerFarm',
  'getFarmerFarm',
  'updateFarmerFarm',
  'createFarmerPlot',
  'getFarmerPlot',
  'getFarmerPlotEvidenceSummary',
  'createFarmerSoilRecord',
  'updateFarmerPlot',
  'createFarmerPlotGeometryVersion',
  'updateFarmerPreferences',
  'changeFarmerDeviceMode',
  'getRskBootstrap',
  'issueRskAccessGrant',
  'createRskProtectedDisclosure',
  'openFarmerSyncStream',
  'bootstrapFarmerSync',
  'syncFarmerBatch',
  'getFarmerSyncFeed',
  'getFarmerSyncCommand',
  'listFarmerSyncConflicts',
  'getFarmerSyncConflict',
  'resolveFarmerSyncConflict',
  'createMediaUploadIntent',
  'finalizeMediaUploadIntent',
  'getMediaAssetStatus',
  'cancelMediaUploadIntent',
  'streamMediaAttachment',
] as const;

export type DomainOperationId = (typeof DOMAIN_OPERATION_IDS)[number];

export interface VerifiedIdentity {
  subjectId: string;
  subjectType: 'FARMER' | 'STAFF';
  environment: DeploymentEnvironment;
  expiresAt: string;
  securityVersion: number;
  mfaState: 'NOT_REQUIRED' | 'CURRENT' | 'REQUIRED' | 'EXPIRED';
}

export interface VerifiedAppCheck {
  appId: string;
  environment: DeploymentEnvironment;
  expiresAt: string;
}

export interface IdentityVerifier {
  mode: 'firebase-admin' | 'synthetic-test';
  verifyIdToken(
    token: string,
    options: {
      checkRevoked: true;
      environment: DeploymentEnvironment;
      surface: 'FARMER' | 'RSK' | 'MP';
    },
  ): Promise<VerifiedIdentity>;
}

export interface AppCheckVerifier {
  mode: 'firebase-admin' | 'synthetic-test';
  verifyAppCheckToken(
    token: string,
    options: {
      environment: DeploymentEnvironment;
      surface: 'FARMER' | 'RSK' | 'MP';
    },
  ): Promise<VerifiedAppCheck>;
}

export interface AuthorizationRequest {
  operationId: DomainOperationId;
  surface: DomainSurface;
  capability?: string;
  purpose?: string;
  origin?: string;
  installationId: string;
  clientBuild: string;
  clientSchemaVersion: 1;
  roleContextId?: string;
  identity: VerifiedIdentity;
  appCheck: VerifiedAppCheck;
  resource?: ProtectedDisclosureAuthorizationResource;
}

export interface ProtectedDisclosureAuthorizationResource {
  targetKind: 'ASSISTED_FARMER_CONTEXT';
  targetId: string;
  purposeKey: 'assisted.service';
  expectedAccessVersion: number;
  fieldSet: 'CONTACT';
}

export type AuthorizationDecision =
  | { allowed: true; context?: AuthorizationContext }
  | {
      allowed: false;
      code:
        | 'AUTHORIZATION_DENIED'
        | 'MFA_REQUIRED'
        | 'AUTHORIZATION_VERSION_CHANGED'
        | 'CONSENT_OR_ACCESS_VERSION_CHANGED'
        | 'DEVICE_BINDING_MISMATCH';
    };

export interface RequestAuthorizer {
  authorize(request: AuthorizationRequest): Promise<AuthorizationDecision>;
}

export interface VerifiedRequestBoundary {
  correlationId: string;
  environment: DeploymentEnvironment;
  origin?: string;
  installationId: string;
  clientBuild: string;
  clientSchemaVersion?: 1;
  idempotencyKey?: string;
  expectedRevision?: number;
  roleContextId?: string;
  identity?: VerifiedIdentity;
  appCheck: VerifiedAppCheck;
  authorization?: AuthorizationContext;
}

export type ProtectedDisclosureDenialCode =
  | 'AUTHORIZATION_DENIED'
  | 'AUTHORIZATION_VERSION_CHANGED'
  | 'CONSENT_OR_ACCESS_VERSION_CHANGED'
  | 'MFA_REQUIRED';

export type ProtectedDisclosureServiceResult =
  | {
      allowed: true;
      response: {
        targetId: string;
        accessVersion: number;
        fields: { displayName: string; contact: string };
        auditedAt: string;
      };
    }
  | { allowed: false; code: ProtectedDisclosureDenialCode };

export interface ProtectedDisclosureService {
  disclose(request: {
    boundary: VerifiedRequestBoundary;
    resource: ProtectedDisclosureAuthorizationResource;
  }): Promise<ProtectedDisclosureServiceResult>;
}

export interface ProtectedMediaContent {
  bytes: Uint8Array;
  contentType: string;
  totalSize: number;
  start: number;
  end: number;
  objectGeneration: string;
  sha256: string;
}

export interface ProtectedMediaContentService {
  /** Must reauthorize ownership/consent and read only a verified, generation-pinned derivative. */
  read(request: {
    boundary: VerifiedRequestBoundary;
    attachmentId: string;
    range?: { start: number; end?: number };
  }): Promise<ProtectedMediaContent>;
}

export interface DomainOperationRequest {
  operationId: DomainOperationId;
  boundary: VerifiedRequestBoundary;
  body?: unknown;
  params?: Readonly<Record<string, string>>;
}

export interface DomainOperationAdapter {
  execute(request: DomainOperationRequest): Promise<unknown>;
}

export interface SafeRequestLogRecord {
  service: 'domain-api';
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  environment: DeploymentEnvironment;
  correlationId: string;
  actorClass?: 'FARMER' | 'STAFF';
  clientBuild?: string;
  problemCode?: ProblemCode;
}

export interface SafeRequestLogger {
  write(record: SafeRequestLogRecord): void;
}

export class ApiBoundaryProblem extends Error {
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
    this.name = 'ApiBoundaryProblem';
    this.code = options.code;
    this.status = options.status;
    this.title = options.title;
    this.retryable = options.retryable ?? false;
    this.fieldErrors = options.fieldErrors ?? [];
  }
}

export function dependencyUnavailable(): ApiBoundaryProblem {
  return new ApiBoundaryProblem({
    code: 'DEPENDENCY_UNAVAILABLE',
    status: 503,
    title: 'A required service dependency is unavailable.',
    retryable: true,
  });
}
