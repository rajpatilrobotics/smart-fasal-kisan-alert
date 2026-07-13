import type { CapabilityKey, ConsentScope } from '../registry.js';
import { evaluateAuthorization } from './evaluate.js';
import type { AuthorizationDecision, AuthorizationInput, ConsentAccessContext } from './types.js';

export type ProtectedDisclosureTargetKind =
  | 'CASE_EVIDENCE'
  | 'CASE_CONTACT'
  | 'OUTREACH_CONTACT'
  | 'VISIT_LOCATION'
  | 'VISIT_PACK'
  | 'SENSOR_MAINTENANCE_LOCATION'
  | 'MARKET_PRIVATE_FIELDS'
  | 'ASSISTED_FARMER_CONTEXT';

export interface ProtectedDisclosureTarget {
  readonly kind: string;
  readonly id: string;
  readonly visitClass?: string;
}

interface DisclosureRule {
  readonly ownerCapability: CapabilityKey;
  readonly consentScope: ConsentScope;
}

const DISCLOSURE_RULES: Readonly<
  Record<Exclude<ProtectedDisclosureTargetKind, 'VISIT_LOCATION' | 'VISIT_PACK'>, DisclosureRule>
> = {
  CASE_EVIDENCE: { ownerCapability: 'case.read', consentScope: 'case.sharing' },
  CASE_CONTACT: { ownerCapability: 'case.read', consentScope: 'case.sharing' },
  OUTREACH_CONTACT: {
    ownerCapability: 'outreach.operate',
    consentScope: 'assisted_service.access',
  },
  SENSOR_MAINTENANCE_LOCATION: {
    ownerCapability: 'sensor.maintenance.execute',
    consentScope: 'sensor.maintenance_location',
  },
  MARKET_PRIVATE_FIELDS: {
    ownerCapability: 'market.support',
    consentScope: 'market.private_fields',
  },
  ASSISTED_FARMER_CONTEXT: {
    ownerCapability: 'assisted_session.operate',
    consentScope: 'assisted_service.access',
  },
};

export interface ProtectedDisclosureInput {
  readonly authorization: AuthorizationInput;
  readonly target: ProtectedDisclosureTarget;
}

export type ProtectedDisclosurePreflightDecision =
  | Extract<AuthorizationDecision, { readonly allowed: false }>
  | (Extract<AuthorizationDecision, { readonly allowed: true }> & {
      readonly auditCommitRequired: true;
    });

export interface DisclosureAuditCommit {
  readonly state: 'PENDING' | 'COMMITTED' | 'FAILED';
  readonly authorizationVersion: number;
  readonly accessVersion: number;
}

function resolveDisclosureRule(target: ProtectedDisclosureTarget): DisclosureRule | undefined {
  if (target.kind === 'VISIT_LOCATION' || target.kind === 'VISIT_PACK') {
    if (target.visitClass === 'FIELD') {
      return { ownerCapability: 'visit.execute.field', consentScope: 'visit.access' };
    }
    if (target.visitClass === 'SENSOR') {
      return { ownerCapability: 'visit.execute.sensor', consentScope: 'visit.access' };
    }
    return undefined;
  }

  return DISCLOSURE_RULES[
    target.kind as Exclude<ProtectedDisclosureTargetKind, 'VISIT_LOCATION' | 'VISIT_PACK'>
  ];
}

function missingConsent(scope: ConsentScope): ConsentAccessContext {
  return {
    scope,
    requiredScope: scope,
    state: 'MISSING',
    targetMatches: true,
    presentedAccessVersion: 0,
    currentAccessVersion: 0,
  };
}

function buildDisclosureAuthorizationInput(input: ProtectedDisclosureInput): AuthorizationInput {
  const rule = resolveDisclosureRule(input.target);
  const resourceKindRegistered = rule !== undefined && input.target.id.length > 0;
  const consent =
    rule === undefined
      ? input.authorization.requirement.consent
      : (input.authorization.requirement.consent ?? missingConsent(rule.consentScope));

  return {
    ...input.authorization,
    requirement: {
      ...input.authorization.requirement,
      roleType: 'RSK',
      scope: 'RSK_SCOPE',
      capabilities:
        rule === undefined
          ? ['rsk.protected_disclose']
          : ['rsk.protected_disclose', rule.ownerCapability],
      managedDeviceRequired: true,
      resourceKindRegistered,
      accessGrant: {
        targetType: input.target.kind,
        targetId: input.target.id,
      },
      ...(consent === undefined
        ? {}
        : {
            consent: {
              ...consent,
              ...(rule === undefined ? {} : { requiredScope: rule.consentScope }),
            },
          }),
    },
  };
}

/**
 * Performs the request-time decision. A successful result is only permission to
 * append the allow Audit fact; it is not permission to serialize protected data.
 */
export function evaluateProtectedDisclosureRequest(
  input: ProtectedDisclosureInput,
): ProtectedDisclosurePreflightDecision {
  const decision = evaluateAuthorization(buildDisclosureAuthorizationInput(input));
  return decision.allowed ? { ...decision, auditCommitRequired: true } : decision;
}

/** Re-evaluates current authority and requires a matching committed Audit fact. */
export function evaluateProtectedDisclosureSerialization(
  input: ProtectedDisclosureInput,
  audit: DisclosureAuditCommit,
): AuthorizationDecision {
  const authorization = evaluateAuthorization(buildDisclosureAuthorizationInput(input));
  if (!authorization.allowed) {
    return authorization;
  }
  if (audit.state !== 'COMMITTED') {
    return {
      allowed: false,
      problemCode: 'AUTHORIZATION_DENIED',
      stage: 'AUDIT_BEFORE_DISCLOSE',
      reason: 'AUDIT_NOT_COMMITTED',
    };
  }
  if (
    audit.authorizationVersion !== authorization.authorizationVersion ||
    audit.accessVersion !== authorization.accessVersion
  ) {
    return {
      allowed: false,
      problemCode:
        audit.authorizationVersion !== authorization.authorizationVersion
          ? 'AUTHORIZATION_VERSION_CHANGED'
          : 'CONSENT_OR_ACCESS_VERSION_CHANGED',
      stage: 'AUDIT_BEFORE_DISCLOSE',
      reason: 'AUDIT_VERSION_STALE',
    };
  }
  return authorization;
}
