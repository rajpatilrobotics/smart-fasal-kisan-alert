import {
  discloseProtectedFields,
  type DisclosureAuthorizationSnapshot,
  type DisclosureStore,
} from '@smart-fasal/application';

import type {
  ProtectedDisclosureAuthorizationResource,
  ProtectedDisclosureDenialCode,
  ProtectedDisclosureService,
  VerifiedRequestBoundary,
} from './boundary.js';

interface TransactionalDisclosureOptions {
  store: DisclosureStore;
  now?: () => Date;
  authorize?: (input: {
    boundary: VerifiedRequestBoundary;
    resource: ProtectedDisclosureAuthorizationResource;
    snapshot: DisclosureAuthorizationSnapshot;
  }) => { allowed: boolean; code: string };
}

function deny(code: ProtectedDisclosureDenialCode) {
  return { allowed: false as const, code };
}

function authorizeCurrentSnapshot(input: {
  boundary: VerifiedRequestBoundary;
  resource: ProtectedDisclosureAuthorizationResource;
  snapshot: DisclosureAuthorizationSnapshot;
}): { allowed: boolean; code: string } {
  const { authorization, identity } = input.boundary;
  const { resource, snapshot } = input;
  if (identity?.mfaState !== 'CURRENT') return deny('MFA_REQUIRED');
  if (
    authorization?.roleType !== 'RSK' ||
    authorization.subjectId !== identity.subjectId ||
    authorization.subjectId !== snapshot.granteeSubjectId ||
    authorization.roleContextId !== snapshot.roleContextId ||
    authorization.officeId !== snapshot.officeId ||
    authorization.jurisdictionId !== snapshot.jurisdictionId ||
    authorization.purposeCode !== 'assisted.service' ||
    snapshot.purposeCode !== resource.purposeKey ||
    snapshot.targetId !== resource.targetId ||
    !authorization.capabilities.includes('rsk.protected_disclose') ||
    !authorization.capabilities.includes('assisted_session.operate')
  ) {
    return deny('AUTHORIZATION_DENIED');
  }
  if (snapshot.grantState !== 'ACTIVE' || snapshot.consentState !== 'GRANTED') {
    return deny('CONSENT_OR_ACCESS_VERSION_CHANGED');
  }
  return { allowed: true, code: 'AUTHORIZED' };
}

function safeDenialCode(code: string): ProtectedDisclosureDenialCode {
  return code === 'AUTHORIZATION_VERSION_CHANGED' ||
    code === 'CONSENT_OR_ACCESS_VERSION_CHANGED' ||
    code === 'MFA_REQUIRED'
    ? code
    : 'AUTHORIZATION_DENIED';
}

/**
 * Creates the only HTTP-capable protected-disclosure adapter. The allow/deny Audit fact,
 * authorization-version check and protected read share one store transaction, so fields do not
 * exist at the HTTP serialization boundary until the Audit commit has succeeded.
 */
export function createTransactionalProtectedDisclosureService(
  options: TransactionalDisclosureOptions,
): ProtectedDisclosureService {
  const now = options.now ?? (() => new Date());
  const authorize = options.authorize ?? authorizeCurrentSnapshot;

  return {
    async disclose({ boundary, resource }) {
      const authorizationVersion = boundary.authorization?.authorizationVersion;
      if (authorizationVersion === undefined) return deny('AUTHORIZATION_DENIED');
      const auditedAt = now().toISOString();
      const result = await discloseProtectedFields({
        store: options.store,
        targetId: resource.targetId,
        expectedAuthorizationVersion: authorizationVersion,
        expectedAccessVersion: resource.expectedAccessVersion,
        authorize: (snapshot) => authorize({ boundary, resource, snapshot }),
        auditBase: {
          action: 'rsk.protected_disclosure',
          capability: 'rsk.protected_disclose',
          actorSubjectId: boundary.identity?.subjectId,
          roleContextId: boundary.authorization?.roleContextId,
          officeId: boundary.authorization?.officeId,
          jurisdictionId: boundary.authorization?.jurisdictionId,
          purposeCode: resource.purposeKey,
          targetKind: resource.targetKind,
          correlationId: boundary.correlationId,
          recordedAt: auditedAt,
        },
      });

      if (result.outcome === 'DENIED') return deny(safeDenialCode(result.code));
      return {
        allowed: true,
        response: {
          targetId: resource.targetId,
          accessVersion: result.accessVersion,
          fields: result.fields,
          auditedAt,
        },
      };
    },
  };
}
