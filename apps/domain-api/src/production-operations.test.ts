import { describe, expect, it, vi } from 'vitest';

import type { AuthorizationContext } from '@smart-fasal/contracts/schemas';
import type {
  DomainOperationId,
  ProtectedDisclosureAuthorizationResource,
  VerifiedRequestBoundary,
} from './boundary.js';
import {
  createProductionDomainComposition,
  type AtomicDomainCommandCommit,
  type CurrentAuthoritySnapshot,
  type GuardedDomainSqlPort,
  type GuardedDomainSqlTransaction,
  type ProductionIdSource,
  type ProtectedDisclosureSqlPort,
  type ReturnStateSqlPort,
  type RoleGrantSnapshot,
  type StoredCommandSnapshot,
} from './production-operations.js';

const FARMER_ID = '10000000-0000-4000-8000-000000000001';
const STAFF_ID = '10000000-0000-4000-8000-000000000002';
const ROLE_GRANT_ID = '10000000-0000-4000-8000-000000000003';
const ROLE_CONTEXT_ID = '10000000-0000-4000-8000-000000000004';
const OFFICE_ID = '10000000-0000-4000-8000-000000000005';
const JURISDICTION_ID = '10000000-0000-4000-8000-000000000006';
const TARGET_ID = '10000000-0000-4000-8000-000000000007';
const POLICY_ID = '10000000-0000-4000-8000-000000000008';
const COMMAND_ID = '10000000-0000-4000-8000-000000000009';
const ACCESS_GRANT_ID = '10000000-0000-4000-8000-000000000010';
const CORRELATION_ID = '10000000-0000-4000-8000-000000000011';
const RETURN_STATE_ID = '10000000-0000-4000-8000-000000000012';
const RETURN_STATE_RECORD_ID = '10000000-0000-4000-8000-000000000017';
const EVENT_ID = '10000000-0000-7000-8000-000000000013';
const INTEGRATION_ID = '10000000-0000-4000-8000-000000000014';
const OUTBOX_ID = '10000000-0000-4000-8000-000000000015';
const DECISION_ID = '10000000-0000-4000-8000-000000000016';
const NOW = '2026-07-13T08:00:00.000Z';
const FUTURE = '2026-07-13T09:00:00.000Z';

function idSource(...ids: string[]): ProductionIdSource {
  let index = 0;
  return {
    next() {
      const value = ids[index];
      index += 1;
      if (value === undefined) throw new Error('test ID source exhausted');
      return value;
    },
  };
}

const farmerContext: AuthorizationContext = {
  environment: 'local',
  subjectId: FARMER_ID,
  roleContextId: ROLE_CONTEXT_ID,
  roleType: 'FARMER',
  purposeCode: 'farmer.self_service',
  authorizationVersion: 7,
  capabilitySetVersion: 2,
  capabilities: ['identity.role_context.select'],
};

const rskContext: AuthorizationContext = {
  environment: 'local',
  subjectId: STAFF_ID,
  roleContextId: ROLE_CONTEXT_ID,
  roleType: 'RSK',
  officeId: OFFICE_ID,
  jurisdictionId: JURISDICTION_ID,
  purposeCode: 'assisted.service',
  authorizationVersion: 7,
  capabilitySetVersion: 2,
  capabilities: [
    'identity.role_context.select',
    'rsk.access_grant.issue',
    'rsk.protected_disclose',
    'assisted_session.operate',
  ],
};

function farmerBoundary(overrides: Partial<VerifiedRequestBoundary> = {}): VerifiedRequestBoundary {
  return {
    correlationId: CORRELATION_ID,
    environment: 'local',
    origin: 'http://farmer.test',
    installationId: 'installation.farmer.test',
    clientBuild: 'test',
    clientSchemaVersion: 1,
    idempotencyKey: COMMAND_ID,
    expectedRevision: 0,
    roleContextId: ROLE_CONTEXT_ID,
    appCheck: { appId: 'farmer-app', environment: 'local', expiresAt: FUTURE },
    identity: {
      subjectId: FARMER_ID,
      subjectType: 'FARMER',
      environment: 'local',
      expiresAt: FUTURE,
      securityVersion: 3,
      mfaState: 'NOT_REQUIRED',
    },
    authorization: farmerContext,
    ...overrides,
  };
}

function rskBoundary(overrides: Partial<VerifiedRequestBoundary> = {}): VerifiedRequestBoundary {
  return {
    ...farmerBoundary(),
    origin: 'http://rsk.test',
    installationId: 'installation.rsk.test',
    appCheck: { appId: 'rsk-app', environment: 'local', expiresAt: FUTURE },
    identity: {
      subjectId: STAFF_ID,
      subjectType: 'STAFF',
      environment: 'local',
      expiresAt: FUTURE,
      securityVersion: 3,
      mfaState: 'CURRENT',
    },
    authorization: rskContext,
    ...overrides,
  };
}

const farmerGrant: RoleGrantSnapshot = {
  roleGrantId: ROLE_GRANT_ID,
  subjectId: FARMER_ID,
  roleType: 'FARMER',
  destination: '/farmer/today',
  authorizationVersion: 7,
  capabilitySetVersion: 2,
  capabilities: ['identity.role_context.select'],
  defaultPurposeCode: 'farmer.self_service',
  active: true,
};

const farmerAuthority: CurrentAuthoritySnapshot = {
  subjectId: FARMER_ID,
  subjectType: 'FARMER',
  environment: 'local',
  securityVersion: 3,
  authorizationVersion: 7,
  status: 'ACTIVE',
  deviceBindingState: 'ACTIVE',
  capabilitySetVersion: 2,
  roles: [farmerGrant],
  activeRoleContext: farmerContext,
  farmerProfile: { locale: 'mr', onboardingState: 'NOT_STARTED' },
};

const rskGrant: RoleGrantSnapshot = {
  roleGrantId: ROLE_GRANT_ID,
  subjectId: STAFF_ID,
  roleType: 'RSK',
  officeId: OFFICE_ID,
  jurisdictionId: JURISDICTION_ID,
  destination: '/rsk/work',
  authorizationVersion: 7,
  capabilitySetVersion: 2,
  capabilities: rskContext.capabilities,
  defaultPurposeCode: 'assisted.service',
  active: true,
};

const rskAuthority: CurrentAuthoritySnapshot = {
  subjectId: STAFF_ID,
  subjectType: 'STAFF',
  environment: 'local',
  securityVersion: 3,
  authorizationVersion: 7,
  status: 'ACTIVE',
  deviceBindingState: 'ACTIVE',
  capabilitySetVersion: 2,
  roles: [rskGrant],
  activeRoleContext: rskContext,
};

interface HarnessOptions {
  authority?: CurrentAuthoritySnapshot;
  roleGrant?: RoleGrantSnapshot;
  currentRevision?: number;
  existingCommand?: StoredCommandSnapshot;
  lockRoleContextForRevocation?: GuardedDomainSqlTransaction['lockRoleContextForRevocation'];
}

function sqlHarness(
  role: GuardedDomainSqlPort['role'],
  options: HarnessOptions = {},
): {
  port: GuardedDomainSqlPort;
  transaction: GuardedDomainSqlTransaction;
  commits: AtomicDomainCommandCommit[];
  order: string[];
} {
  const commits: AtomicDomainCommandCommit[] = [];
  const order: string[] = [];
  const authority =
    options.authority ?? (role === 'sf_farmer_api' ? farmerAuthority : rskAuthority);
  const transaction: GuardedDomainSqlTransaction = {
    lockCurrentAuthority: () => {
      order.push('authority');
      return Promise.resolve(authority);
    },
    lockRoleGrant: () => Promise.resolve(options.roleGrant ?? farmerGrant),
    lockRoleContextForRevocation:
      options.lockRoleContextForRevocation ??
      ((roleContextId) =>
        Promise.resolve({
          roleContextId,
          subjectId: authority.subjectId,
          roleType: role === 'sf_farmer_api' ? 'FARMER' : 'RSK',
          authorizationVersion: authority.authorizationVersion,
          revision: 1,
          revoked: false,
        })),
    lockCommand: () => {
      order.push('command-lock');
      return Promise.resolve();
    },
    findCommand: () => Promise.resolve(options.existingCommand),
    currentRevision: () => Promise.resolve(options.currentRevision ?? 0),
    listConsents: () =>
      Promise.resolve({
        items: [
          {
            subjectId: FARMER_ID,
            scopeKey: 'location.processing' as const,
            purposeKey: 'farmer.self_service' as const,
            targetKind: 'ACCOUNT' as const,
            targetId: FARMER_ID,
            state: 'ALLOWED' as const,
            accessVersion: 2,
          },
        ],
        revision: 4,
      }),
    lockConsent: () =>
      Promise.resolve({
        subjectId: FARMER_ID,
        scopeKey: 'location.processing',
        purposeKey: 'farmer.self_service',
        targetKind: 'ACCOUNT',
        targetId: FARMER_ID,
        state: 'ALLOWED',
        accessVersion: 2,
      }),
    consentTargetOwnedBy: () => Promise.resolve(true),
    consentPolicyIsCurrent: () => Promise.resolve(true),
    lockAssistedAccess: () =>
      Promise.resolve({
        farmerSubjectId: FARMER_ID,
        targetId: TARGET_ID,
        officeId: OFFICE_ID,
        jurisdictionId: JURISDICTION_ID,
        consentState: 'ALLOWED',
        consentAccessVersion: 3,
        consentExpiresAt: FUTURE,
        assignmentState: 'ASSIGNED',
      }),
    commitCommand: (commit) => {
      order.push('commit-command');
      commits.push(commit);
      return Promise.resolve();
    },
  };
  const port: GuardedDomainSqlPort = {
    role,
    async transaction(_request, work) {
      order.push('begin');
      try {
        const result = await work(transaction);
        order.push('commit');
        return result;
      } catch (error) {
        order.push('rollback');
        throw error;
      }
    },
  };
  return { port, transaction, commits, order };
}

function operationRequest(
  operationId: DomainOperationId,
  boundary: VerifiedRequestBoundary,
  body?: unknown,
  params?: Readonly<Record<string, string>>,
) {
  return {
    operationId,
    boundary,
    ...(body === undefined ? {} : { body }),
    ...(params === undefined ? {} : { params }),
  };
}

function clientContext() {
  return { clientRecordedAt: NOW, timezone: 'Asia/Kolkata', dataModeClaim: 'SIMULATED' };
}

function selectRoleCommand() {
  return {
    commandSchemaVersion: 1,
    operation: 'SelectRoleContext',
    target: { type: 'roleContext', id: ROLE_CONTEXT_ID },
    expectedRevision: 0,
    payload: { roleGrantId: ROLE_GRANT_ID },
    clientContext: clientContext(),
  };
}

function consentCommand(decision: 'ALLOW' | 'DENY' | 'WITHDRAW' = 'WITHDRAW') {
  return {
    commandSchemaVersion: 1,
    operation: 'RecordConsentDecision',
    target: { type: 'consentDecision', id: TARGET_ID },
    expectedRevision: 0,
    payload: {
      decision,
      scopeKey: 'location.processing',
      purposeKey: 'farmer.self_service',
      targetKind: 'ACCOUNT',
      targetId: FARMER_ID,
      policyVersionId: POLICY_ID,
    },
    clientContext: clientContext(),
  };
}

function accessGrantCommand() {
  return {
    commandSchemaVersion: 1,
    operation: 'IssueAccessGrant',
    target: { type: 'accessGrant', id: ACCESS_GRANT_ID },
    expectedRevision: 0,
    payload: {
      targetKind: 'ASSISTED_FARMER_CONTEXT',
      targetId: TARGET_ID,
      farmerSubjectId: FARMER_ID,
      purposeKey: 'assisted.service',
      consentAccessVersion: 3,
      expiresAt: FUTURE,
    },
    clientContext: clientContext(),
  };
}

describe('production Domain API operation composition', () => {
  it('fails closed with typed Unavailable when a required store is absent', async () => {
    const composition = createProductionDomainComposition({ now: () => new Date(NOW) });

    expect(composition.ready()).toBe(false);
    await expect(
      composition.operations.execute(operationRequest('getAuthSession', farmerBoundary())),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE', status: 503 });
    await expect(
      composition.operations.execute(
        operationRequest('createRskProtectedDisclosure', rskBoundary()),
      ),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
  });

  it('never routes an MP application identity through an operational RSK SQL role', async () => {
    const rsk = sqlHarness('sf_rsk_api');
    const composition = createProductionDomainComposition({
      rsk: rsk.port,
      mpAppIds: ['mp-app'],
    });
    const boundary = rskBoundary({
      appCheck: { appId: 'mp-app', environment: 'local', expiresAt: FUTURE },
    });

    await expect(
      composition.operations.execute(operationRequest('getAuthSession', boundary)),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
    expect(rsk.order).toEqual([]);
  });

  it('stores only a protected return-state digest in the dedicated transaction', async () => {
    const inserted: unknown[] = [];
    const returnState: ReturnStateSqlPort = {
      purpose: 'ephemeral-auth-state',
      transaction: (work) =>
        work({
          insert: (input) => {
            inserted.push(input);
            return Promise.resolve();
          },
        }),
    };
    const composition = createProductionDomainComposition({
      returnState,
      returnStateProtector: {
        digest: () => Promise.resolve('a'.repeat(64)),
        rateLimitDigest: () => Promise.resolve('b'.repeat(64)),
      },
      ids: idSource(RETURN_STATE_ID, RETURN_STATE_RECORD_ID),
      now: () => new Date(NOW),
    });
    const boundary = farmerBoundary();
    delete boundary.identity;
    delete boundary.authorization;

    await expect(
      composition.operations.execute(
        operationRequest('createReturnState', boundary, { routeKey: 'FARMER_HOME' }),
      ),
    ).resolves.toEqual({ returnStateId: RETURN_STATE_ID, expiresAt: '2026-07-13T08:05:00.000Z' });
    expect(inserted).toEqual([
      expect.objectContaining({
        returnStateRecordId: RETURN_STATE_RECORD_ID,
        routeKey: 'FARMER_HOME',
        opaqueStateHash: 'a'.repeat(64),
        rateLimitKey: 'b'.repeat(64),
        origin: 'http://farmer.test',
      }),
    ]);
    expect(inserted[0]).not.toHaveProperty('returnStateId');
  });

  it('returns server-current session, Farmer bootstrap and independent consents', async () => {
    const farmer = sqlHarness('sf_farmer_api');
    const composition = createProductionDomainComposition({ farmer: farmer.port });

    await expect(
      composition.operations.execute(operationRequest('getAuthSession', farmerBoundary())),
    ).resolves.toMatchObject({
      subjectId: FARMER_ID,
      authorizationVersion: 7,
      deviceBindingState: 'ACTIVE',
    });
    await expect(
      composition.operations.execute(operationRequest('getFarmerBootstrap', farmerBoundary())),
    ).resolves.toEqual({
      subjectId: FARMER_ID,
      locale: 'mr',
      onboardingState: 'NOT_STARTED',
      authorizationVersion: 7,
      capabilities: ['identity.role_context.select'],
      farmContextState: 'UNAVAILABLE_UNTIL_SETUP',
    });
    await expect(
      composition.operations.execute(operationRequest('listFarmerConsents', farmerBoundary())),
    ).resolves.toMatchObject({
      revision: 4,
      items: [{ scopeKey: 'location.processing', state: 'ALLOWED', accessVersion: 2 }],
    });
  });

  it('rejects a stale security version before returning session data', async () => {
    const farmer = sqlHarness('sf_farmer_api', {
      authority: { ...farmerAuthority, securityVersion: 4 },
    });
    const composition = createProductionDomainComposition({ farmer: farmer.port });

    await expect(
      composition.operations.execute(operationRequest('getAuthSession', farmerBoundary())),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_VERSION_CHANGED' });
    expect(farmer.order.at(-1)).toBe('rollback');
  });

  it('atomically creates a role context, receipt, Technical event and outbox', async () => {
    const farmer = sqlHarness('sf_farmer_api');
    const composition = createProductionDomainComposition({
      farmer: farmer.port,
      ids: idSource(EVENT_ID, INTEGRATION_ID, OUTBOX_ID),
      now: () => new Date(NOW),
    });

    await expect(
      composition.operations.execute(
        operationRequest('selectRoleContext', farmerBoundary(), selectRoleCommand()),
      ),
    ).resolves.toEqual({
      commandId: COMMAND_ID,
      disposition: 'ACCEPTED',
      result: { type: 'roleContext', id: ROLE_CONTEXT_ID, revision: 1 },
      eventIds: [EVENT_ID],
      serverReceivedAt: NOW,
    });
    expect(farmer.commits).toHaveLength(1);
    expect(farmer.commits[0]).toMatchObject({
      mutation: { kind: 'CREATE_ROLE_CONTEXT', roleContextId: ROLE_CONTEXT_ID },
      sourceEvents: [{ eventName: 'identity.role_context_created' }],
      integrationEvents: [{ sourceEventId: EVENT_ID }],
      outbox: [{ integrationEventId: INTEGRATION_ID, state: 'PENDING' }],
      command: { commandId: COMMAND_ID, state: 'COMPLETE' },
    });
    expect(farmer.order).toEqual([
      'begin',
      'command-lock',
      'authority',
      'commit-command',
      'commit',
    ]);
  });

  it('reauthorizes before a same-hash replay and rejects a changed authorization version', async () => {
    const accepted = {
      commandId: COMMAND_ID,
      disposition: 'ACCEPTED' as const,
      result: { type: 'roleContext' as const, id: ROLE_CONTEXT_ID, revision: 1 },
      eventIds: [EVENT_ID],
      serverReceivedAt: NOW,
    };
    const semantic = selectRoleCommand();
    const first = sqlHarness('sf_farmer_api');
    const firstComposition = createProductionDomainComposition({
      farmer: first.port,
      ids: idSource(EVENT_ID, INTEGRATION_ID, OUTBOX_ID),
      now: () => new Date(NOW),
    });
    await firstComposition.operations.execute(
      operationRequest('selectRoleContext', farmerBoundary(), semantic),
    );
    const commandHash = first.commits[0]?.command.commandHash ?? '';
    const replay = sqlHarness('sf_farmer_api', {
      existingCommand: {
        commandHash,
        authorizationVersion: 7,
        state: 'COMPLETE',
        safeReceipt: accepted,
      },
    });
    const replayComposition = createProductionDomainComposition({ farmer: replay.port });

    await expect(
      replayComposition.operations.execute(
        operationRequest('selectRoleContext', farmerBoundary(), semantic),
      ),
    ).resolves.toMatchObject({ disposition: 'ALREADY_ACCEPTED', eventIds: [EVENT_ID] });
    expect(replay.order.slice(0, 3)).toEqual(['begin', 'command-lock', 'authority']);

    const inProgress = sqlHarness('sf_farmer_api', {
      existingCommand: {
        commandHash,
        authorizationVersion: 7,
        state: 'IN_PROGRESS',
        startedAt: NOW,
      },
    });
    await expect(
      createProductionDomainComposition({ farmer: inProgress.port }).operations.execute(
        operationRequest('selectRoleContext', farmerBoundary(), semantic),
      ),
    ).resolves.toEqual({
      commandId: COMMAND_ID,
      disposition: 'IN_PROGRESS',
      eventIds: [],
      serverReceivedAt: NOW,
    });
    expect(inProgress.commits).toHaveLength(0);

    const stale = sqlHarness('sf_farmer_api', {
      authority: { ...farmerAuthority, authorizationVersion: 8 },
      existingCommand: {
        commandHash,
        authorizationVersion: 7,
        state: 'COMPLETE',
        safeReceipt: accepted,
      },
    });
    await expect(
      createProductionDomainComposition({ farmer: stale.port }).operations.execute(
        operationRequest('selectRoleContext', farmerBoundary(), semantic),
      ),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_VERSION_CHANGED' });

    const reused = sqlHarness('sf_farmer_api', {
      existingCommand: {
        commandHash: '0'.repeat(64),
        authorizationVersion: 7,
        state: 'COMPLETE',
        safeReceipt: accepted,
      },
    });
    await expect(
      createProductionDomainComposition({ farmer: reused.port }).operations.execute(
        operationRequest('selectRoleContext', farmerBoundary(), semantic),
      ),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('requires current staff MFA when selecting an RSK role context', async () => {
    const rsk = sqlHarness('sf_rsk_api', { roleGrant: rskGrant });
    const composition = createProductionDomainComposition({ rsk: rsk.port });
    const verifiedIdentity = rskBoundary().identity;
    if (verifiedIdentity === undefined) throw new Error('test identity missing');
    const boundary = rskBoundary({
      identity: { ...verifiedIdentity, mfaState: 'EXPIRED' },
    });
    delete boundary.authorization;
    const command = {
      ...selectRoleCommand(),
      payload: {
        roleGrantId: ROLE_GRANT_ID,
        officeId: OFFICE_ID,
        jurisdictionId: JURISDICTION_ID,
      },
    };

    await expect(
      composition.operations.execute(operationRequest('selectRoleContext', boundary, command)),
    ).rejects.toMatchObject({ code: 'MFA_REQUIRED' });
    expect(rsk.commits).toHaveLength(0);
  });

  it('revokes an owned current context with an atomic Technical event', async () => {
    const farmer = sqlHarness('sf_farmer_api');
    const composition = createProductionDomainComposition({
      farmer: farmer.port,
      ids: idSource(EVENT_ID, INTEGRATION_ID, OUTBOX_ID),
      now: () => new Date(NOW),
    });

    await expect(
      composition.operations.execute(
        operationRequest('revokeRoleContext', farmerBoundary(), undefined, {
          roleContextId: ROLE_CONTEXT_ID,
        }),
      ),
    ).resolves.toMatchObject({ disposition: 'ACCEPTED', eventIds: [EVENT_ID] });
    expect(farmer.commits[0]).toMatchObject({
      mutation: { kind: 'REVOKE_ROLE_CONTEXT', reasonCode: 'LOGOUT' },
      sourceEvents: [{ eventName: 'identity.role_context_revoked' }],
    });
  });

  it('replays a committed revoke receipt before trying to bind the now-revoked context', async () => {
    const first = sqlHarness('sf_farmer_api');
    const firstComposition = createProductionDomainComposition({
      farmer: first.port,
      ids: idSource(EVENT_ID, INTEGRATION_ID, OUTBOX_ID),
      now: () => new Date(NOW),
    });
    const accepted = {
      commandId: COMMAND_ID,
      disposition: 'ACCEPTED',
      result: { type: 'roleContext', id: ROLE_CONTEXT_ID, revision: 2 },
      eventIds: [EVENT_ID],
      serverReceivedAt: NOW,
    } satisfies NonNullable<StoredCommandSnapshot['safeReceipt']>;
    await expect(
      firstComposition.operations.execute(
        operationRequest('revokeRoleContext', farmerBoundary(), undefined, {
          roleContextId: ROLE_CONTEXT_ID,
        }),
      ),
    ).resolves.toEqual(accepted);
    const commandHash = first.commits[0]?.command.commandHash;
    if (commandHash === undefined) throw new Error('Expected committed revoke command hash.');
    const bindRevokedContext = vi
      .fn<GuardedDomainSqlTransaction['lockRoleContextForRevocation']>()
      .mockRejectedValue(new Error('revoked contexts cannot be selected'));
    const replay = sqlHarness('sf_farmer_api', {
      existingCommand: {
        commandHash,
        authorizationVersion: 7,
        state: 'COMPLETE',
        safeReceipt: accepted,
      },
      lockRoleContextForRevocation: bindRevokedContext,
    });

    await expect(
      createProductionDomainComposition({ farmer: replay.port }).operations.execute(
        operationRequest('revokeRoleContext', farmerBoundary(), undefined, {
          roleContextId: ROLE_CONTEXT_ID,
        }),
      ),
    ).resolves.toMatchObject({
      commandId: COMMAND_ID,
      disposition: 'ALREADY_ACCEPTED',
      eventIds: [EVENT_ID],
    });
    expect(bindRevokedContext).not.toHaveBeenCalled();
    expect(replay.commits).toHaveLength(0);
  });

  it('records withdrawal, increments access version and schedules only scope-specific revocation work', async () => {
    const farmer = sqlHarness('sf_farmer_api');
    const composition = createProductionDomainComposition({
      farmer: farmer.port,
      ids: idSource(DECISION_ID, EVENT_ID, INTEGRATION_ID, OUTBOX_ID),
      now: () => new Date(NOW),
    });

    await expect(
      composition.operations.execute(
        operationRequest('recordConsentDecision', farmerBoundary(), consentCommand()),
      ),
    ).resolves.toMatchObject({
      result: { type: 'consentDecision', id: DECISION_ID },
      eventIds: [EVENT_ID],
    });
    expect(farmer.commits[0]).toMatchObject({
      mutation: {
        kind: 'RECORD_CONSENT_DECISION',
        decision: 'WITHDRAW',
        state: 'WITHDRAWN',
        accessVersion: 3,
        invalidateRoleContexts: false,
        invalidateAccessGrants: false,
        revocationOperations: ['REVOKE_LOCATION_PROCESSING', 'CANCEL_QUEUED_EARTH_AI_WORK'],
      },
      auditFacts: [{ action: 'consent.decision.record' }],
      sourceEvents: [{ eventName: 'consent.decision_recorded' }],
      outbox: [{ state: 'PENDING' }],
    });
  });

  it('invalidates assisted contexts and grants only for assisted-service withdrawal', async () => {
    const farmer = sqlHarness('sf_farmer_api');
    farmer.transaction.lockConsent = () =>
      Promise.resolve({
        subjectId: FARMER_ID,
        scopeKey: 'assisted_service.access',
        purposeKey: 'assisted.service',
        targetKind: 'ASSISTED_FARMER_CONTEXT',
        targetId: TARGET_ID,
        state: 'ALLOWED',
        accessVersion: 2,
      });
    const composition = createProductionDomainComposition({
      farmer: farmer.port,
      ids: idSource(DECISION_ID, EVENT_ID, INTEGRATION_ID, OUTBOX_ID),
      now: () => new Date(NOW),
    });
    const command = consentCommand();
    command.payload.scopeKey = 'assisted_service.access';
    command.payload.purposeKey = 'assisted.service';
    command.payload.targetKind = 'ASSISTED_FARMER_CONTEXT';
    command.payload.targetId = TARGET_ID;

    await composition.operations.execute(
      operationRequest('recordConsentDecision', farmerBoundary(), command),
    );

    expect(farmer.commits[0]).toMatchObject({
      mutation: {
        invalidateRoleContexts: true,
        invalidateAccessGrants: true,
        revocationOperations: [
          'REVOKE_ASSISTED_SESSIONS',
          'REVOKE_ACCESS_GRANTS',
          'REVOKE_OFFLINE_PACKS',
        ],
      },
    });
  });

  it('rolls back a stale consent command before any state/event/outbox commit', async () => {
    const farmer = sqlHarness('sf_farmer_api', { currentRevision: 2 });
    const composition = createProductionDomainComposition({ farmer: farmer.port });

    await expect(
      composition.operations.execute(
        operationRequest('recordConsentDecision', farmerBoundary(), consentCommand('ALLOW')),
      ),
    ).rejects.toMatchObject({ code: 'EXPECTED_REVISION_MISMATCH' });
    expect(farmer.commits).toHaveLength(0);
    expect(farmer.order.at(-1)).toBe('rollback');
  });

  it('audits an access grant while the approved catalogue keeps platform delivery empty', async () => {
    const rsk = sqlHarness('sf_rsk_api');
    const composition = createProductionDomainComposition({
      rsk: rsk.port,
      now: () => new Date(NOW),
    });

    await expect(
      composition.operations.execute(operationRequest('getRskBootstrap', rskBoundary())),
    ).resolves.toMatchObject({
      subjectId: STAFF_ID,
      officeId: OFFICE_ID,
      jurisdictionId: JURISDICTION_ID,
      workState: 'UNAVAILABLE_UNTIL_WORK_MILESTONE',
    });
    await expect(
      composition.operations.execute(
        operationRequest('issueRskAccessGrant', rskBoundary(), accessGrantCommand()),
      ),
    ).resolves.toMatchObject({
      disposition: 'ACCEPTED',
      result: { type: 'accessGrant', id: ACCESS_GRANT_ID },
      eventIds: [],
    });
    expect(rsk.commits[0]).toMatchObject({
      mutation: {
        kind: 'ISSUE_ACCESS_GRANT',
        farmerSubjectId: FARMER_ID,
        granteeSubjectId: STAFF_ID,
        officeId: OFFICE_ID,
        jurisdictionId: JURISDICTION_ID,
        accessVersion: 3,
        accessGrantEvent: {
          eventType: 'ISSUED',
          grantVersion: 1,
          accessVersion: 3,
          correlationId: CORRELATION_ID,
        },
      },
      auditFacts: [{ action: 'rsk.access_grant.issue', outcome: 'ALLOW' }],
      sourceEvents: [],
      integrationEvents: [],
      outbox: [],
    });
  });

  it('allows a finite access grant under current non-expiring consent', async () => {
    const rsk = sqlHarness('sf_rsk_api');
    rsk.transaction.lockAssistedAccess = () =>
      Promise.resolve({
        farmerSubjectId: FARMER_ID,
        targetId: TARGET_ID,
        officeId: OFFICE_ID,
        jurisdictionId: JURISDICTION_ID,
        consentState: 'ALLOWED',
        consentAccessVersion: 3,
        assignmentState: 'ASSIGNED',
      });
    const composition = createProductionDomainComposition({
      rsk: rsk.port,
      now: () => new Date(NOW),
    });

    await expect(
      composition.operations.execute(
        operationRequest('issueRskAccessGrant', rskBoundary(), accessGrantCommand()),
      ),
    ).resolves.toMatchObject({ disposition: 'ACCEPTED' });
    expect(rsk.commits).toHaveLength(1);
  });

  it('denies an access grant when current consent or assignment does not match', async () => {
    const rsk = sqlHarness('sf_rsk_api');
    rsk.transaction.lockAssistedAccess = () =>
      Promise.resolve({
        farmerSubjectId: FARMER_ID,
        targetId: TARGET_ID,
        officeId: OFFICE_ID,
        jurisdictionId: JURISDICTION_ID,
        consentState: 'WITHDRAWN',
        consentAccessVersion: 4,
        assignmentState: 'ASSIGNED',
      });
    const composition = createProductionDomainComposition({ rsk: rsk.port });

    await expect(
      composition.operations.execute(
        operationRequest('issueRskAccessGrant', rskBoundary(), accessGrantCommand()),
      ),
    ).rejects.toMatchObject({ code: 'CONSENT_OR_ACCESS_VERSION_CHANGED' });
    expect(rsk.commits).toHaveLength(0);
  });
});

const disclosureResource: ProtectedDisclosureAuthorizationResource = {
  targetKind: 'ASSISTED_FARMER_CONTEXT',
  targetId: TARGET_ID,
  purposeKey: 'assisted.service',
  expectedAccessVersion: 3,
  fieldSet: 'CONTACT',
};

function disclosureHarness(
  overrides: {
    consentState?: 'ALLOWED' | 'WITHDRAWN';
    consentStateAfterDecrypt?: 'ALLOWED' | 'WITHDRAWN';
    auditFailure?: boolean;
    authority?: CurrentAuthoritySnapshot;
  } = {},
) {
  const order: string[] = [];
  let transactionCount = 0;
  const port: ProtectedDisclosureSqlPort = {
    role: 'sf_rsk_api',
    async transaction(_request, work) {
      transactionCount += 1;
      order.push('begin');
      try {
        const result = await work({
          lockCurrentAuthority: () => {
            order.push('authority');
            return Promise.resolve(overrides.authority ?? rskAuthority);
          },
          lockDisclosure: () => {
            order.push('disclosure-lock');
            return Promise.resolve({
              subjectId: FARMER_ID,
              granteeSubjectId: STAFF_ID,
              targetId: TARGET_ID,
              authorizationVersion: 7,
              accessVersion: 3,
              grantId: ACCESS_GRANT_ID,
              grantState: 'ACTIVE' as const,
              consentState:
                transactionCount > 1
                  ? (overrides.consentStateAfterDecrypt ?? overrides.consentState ?? 'ALLOWED')
                  : (overrides.consentState ?? 'ALLOWED'),
              roleContextId: ROLE_CONTEXT_ID,
              officeId: OFFICE_ID,
              jurisdictionId: JURISDICTION_ID,
              purposeCode: 'assisted.service' as const,
            });
          },
          appendAuditFact: () => {
            order.push('audit');
            return overrides.auditFailure === true
              ? Promise.reject(new Error('audit unavailable'))
              : Promise.resolve();
          },
          readEncryptedProtectedFields: () => {
            order.push('read');
            return Promise.resolve({
              encryptedDisplayName: new Uint8Array([1]),
              encryptedContact: new Uint8Array([2]),
              keyReference: 'kms-key-reference',
            });
          },
        });
        order.push('commit');
        return result;
      } catch (error) {
        order.push('rollback');
        throw error;
      }
    },
  };
  return { port, order };
}

describe('production protected-disclosure composition', () => {
  it('commits Audit/read, decrypts outside the transaction, then rechecks before exposing fields', async () => {
    const disclosure = disclosureHarness();
    const composition = createProductionDomainComposition({
      protectedDisclosure: disclosure.port,
      protectedFieldDecryptor: {
        decrypt: () => {
          disclosure.order.push('decrypt');
          return Promise.resolve({
            displayName: 'Protected Farmer',
            contact: 'protected-contact',
          });
        },
      },
      now: () => new Date(NOW),
    });

    await expect(
      composition.protectedDisclosure.disclose({
        boundary: rskBoundary(),
        resource: disclosureResource,
      }),
    ).resolves.toEqual({
      allowed: true,
      response: {
        targetId: TARGET_ID,
        accessVersion: 3,
        fields: { displayName: 'Protected Farmer', contact: 'protected-contact' },
        auditedAt: NOW,
      },
    });
    expect(disclosure.order).toEqual([
      'begin',
      'authority',
      'disclosure-lock',
      'audit',
      'read',
      'commit',
      'decrypt',
      'begin',
      'authority',
      'disclosure-lock',
      'commit',
    ]);
  });

  it('returns no fields when consent is withdrawn while decryption is in flight', async () => {
    const disclosure = disclosureHarness({ consentStateAfterDecrypt: 'WITHDRAWN' });
    const composition = createProductionDomainComposition({
      protectedDisclosure: disclosure.port,
      protectedFieldDecryptor: {
        decrypt: () => {
          disclosure.order.push('decrypt');
          return Promise.resolve({
            displayName: 'Must not escape',
            contact: 'must-not-escape',
          });
        },
      },
      now: () => new Date(NOW),
    });

    await expect(
      composition.protectedDisclosure.disclose({
        boundary: rskBoundary(),
        resource: disclosureResource,
      }),
    ).resolves.toEqual({ allowed: false, code: 'CONSENT_OR_ACCESS_VERSION_CHANGED' });
    expect(disclosure.order).toEqual([
      'begin',
      'authority',
      'disclosure-lock',
      'audit',
      'read',
      'commit',
      'decrypt',
      'begin',
      'authority',
      'disclosure-lock',
      'audit',
      'commit',
    ]);
  });

  it('commits a deny Audit fact and never reads/decrypts after withdrawal', async () => {
    const disclosure = disclosureHarness({ consentState: 'WITHDRAWN' });
    const decrypt = vi.fn(() => Promise.resolve({ displayName: 'never', contact: 'never' }));
    const composition = createProductionDomainComposition({
      protectedDisclosure: disclosure.port,
      protectedFieldDecryptor: { decrypt },
    });

    await expect(
      composition.protectedDisclosure.disclose({
        boundary: rskBoundary(),
        resource: disclosureResource,
      }),
    ).resolves.toEqual({ allowed: false, code: 'CONSENT_OR_ACCESS_VERSION_CHANGED' });
    expect(disclosure.order).toEqual(['begin', 'authority', 'disclosure-lock', 'audit', 'commit']);
    expect(decrypt).not.toHaveBeenCalled();
  });

  it('audits a capability denial and keeps protected ciphertext unread', async () => {
    const restrictedContext: AuthorizationContext = {
      ...rskContext,
      capabilities: ['rsk.protected_disclose'],
    };
    const disclosure = disclosureHarness({
      authority: { ...rskAuthority, activeRoleContext: restrictedContext },
    });
    const decrypt = vi.fn(() => Promise.resolve({ displayName: 'never', contact: 'never' }));
    const composition = createProductionDomainComposition({
      protectedDisclosure: disclosure.port,
      protectedFieldDecryptor: { decrypt },
    });

    await expect(
      composition.protectedDisclosure.disclose({
        boundary: rskBoundary({ authorization: restrictedContext }),
        resource: disclosureResource,
      }),
    ).resolves.toEqual({ allowed: false, code: 'AUTHORIZATION_DENIED' });
    expect(disclosure.order).toEqual(['begin', 'authority', 'audit', 'commit']);
    expect(decrypt).not.toHaveBeenCalled();
  });

  it('returns typed Unavailable and no fields when Audit or decryption infrastructure is absent', async () => {
    const disclosure = disclosureHarness({ auditFailure: true });
    const composition = createProductionDomainComposition({
      protectedDisclosure: disclosure.port,
      protectedFieldDecryptor: {
        decrypt: () => Promise.resolve({ displayName: 'never', contact: 'never' }),
      },
    });

    await expect(
      composition.protectedDisclosure.disclose({
        boundary: rskBoundary(),
        resource: disclosureResource,
      }),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
    expect(disclosure.order).not.toContain('read');
    expect(disclosure.order.at(-1)).toBe('rollback');

    await expect(
      createProductionDomainComposition({
        protectedDisclosure: disclosure.port,
      }).protectedDisclosure.disclose({
        boundary: rskBoundary(),
        resource: disclosureResource,
      }),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
  });
});
