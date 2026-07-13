import { describe, expect, it } from 'vitest';

import {
  createHmacReturnStateProtector,
  createProductionPostgresBoundary,
  parseCurrentAuthoritySnapshot,
  translateReturnStateSqlError,
} from './production-postgres.js';
import { createProductionDomainComposition } from './production-operations.js';

const authority = {
  subjectId: '10000000-0000-4000-8000-000000000001',
  subjectType: 'FARMER',
  environment: 'demo',
  securityVersion: 2,
  authorizationVersion: 3,
  status: 'ACTIVE',
  deviceBindingState: 'ACTIVE',
  capabilitySetVersion: 1,
  roles: [
    {
      roleGrantId: '10000000-0000-4000-8000-000000000002',
      subjectId: '10000000-0000-4000-8000-000000000001',
      roleType: 'FARMER',
      destination: '/farmer/today',
      authorizationVersion: 3,
      capabilitySetVersion: 1,
      capabilities: ['identity.role_context.select'],
      defaultPurposeCode: 'farmer.self_service',
      active: true,
    },
  ],
} as const;

describe('production PostgreSQL boundary helpers', () => {
  it('strictly parses authoritative snapshots and rejects malformed versions', () => {
    expect(parseCurrentAuthoritySnapshot(authority)).toMatchObject({
      subjectId: authority.subjectId,
      authorizationVersion: 3,
      roles: [{ roleType: 'FARMER' }],
    });
    expect(() =>
      parseCurrentAuthoritySnapshot({ ...authority, authorizationVersion: 'not-a-version' }),
    ).toThrow(/required service dependency/u);
  });

  it('separates opaque return-state and stable limiter HMAC namespaces', async () => {
    const protector = createHmacReturnStateProtector('a-production-shaped-secret-with-32-bytes');
    const common = {
      environment: 'demo',
      appId: 'farmer-app',
      origin: 'https://farmer.example.test',
    };
    const opaque = await protector.digest({
      ...common,
      returnStateId: '10000000-0000-4000-8000-000000000010',
      routeKey: 'FARMER_HOME',
    });
    const limiter = await protector.rateLimitDigest({
      ...common,
      installationId: '10000000-0000-4000-8000-000000000011',
    });
    expect(opaque).toMatch(/^[0-9a-f]{64}$/u);
    expect(limiter).toMatch(/^[0-9a-f]{64}$/u);
    expect(opaque).not.toBe(limiter);
    await expect(
      protector.rateLimitDigest({
        ...common,
        installationId: '10000000-0000-4000-8000-000000000011',
      }),
    ).resolves.toBe(limiter);
  });

  it('maps only the dedicated return-state limiter SQLSTATE to safe 429', () => {
    expect(
      translateReturnStateSqlError({ code: 'P4290', message: 'raw database detail' }),
    ).toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retryable: true,
      title: 'Too many return-state requests.',
    });
    expect(translateReturnStateSqlError({ code: '42501' })).toBeUndefined();
    expect(translateReturnStateSqlError(new Error('P4290 in untrusted text'))).toBeUndefined();
  });

  it('preserves the translated 429 through the production return-state operation', async () => {
    const rateLimited = translateReturnStateSqlError({ code: 'P4290' });
    if (rateLimited === undefined) throw new Error('Expected dedicated SQLSTATE translation.');
    const composition = createProductionDomainComposition({
      returnState: {
        purpose: 'ephemeral-auth-state',
        transaction: (work) =>
          work({
            insert: () => Promise.reject(rateLimited),
          }),
      },
      returnStateProtector: createHmacReturnStateProtector(
        'a-production-shaped-secret-with-32-bytes',
      ),
    });
    await expect(
      composition.operations.execute({
        operationId: 'createReturnState',
        boundary: {
          correlationId: '10000000-0000-4000-8000-000000000020',
          environment: 'demo',
          origin: 'https://farmer.example.test',
          installationId: '10000000-0000-4000-8000-000000000011',
          clientBuild: 'test',
          appCheck: {
            appId: 'farmer-app',
            environment: 'demo',
            expiresAt: '2026-07-13T12:00:00.000Z',
          },
        },
        body: { routeKey: 'FARMER_HOME' },
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429, retryable: true });
  });

  it('is honestly unready without mandatory database credentials', async () => {
    const boundary = createProductionPostgresBoundary({
      environment: 'demo',
      databaseUrls: {},
      appIds: { farmer: ['farmer-app'], rsk: ['rsk-app'], mp: ['mp-app'] },
    });
    expect(boundary.configured).toBe(false);
    await expect(boundary.ready()).resolves.toBe(false);
    await expect(
      boundary.authorizer.authorize({
        operationId: 'getAuthSession',
        surface: 'farmer',
        installationId: '10000000-0000-4000-8000-000000000011',
        clientBuild: 'test',
        clientSchemaVersion: 1,
        identity: {
          subjectId: authority.subjectId,
          subjectType: 'FARMER',
          environment: 'demo',
          expiresAt: '2026-07-13T12:00:00.000Z',
          securityVersion: 2,
          mfaState: 'NOT_REQUIRED',
        },
        appCheck: {
          appId: 'farmer-app',
          environment: 'demo',
          expiresAt: '2026-07-13T12:00:00.000Z',
        },
      }),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE', status: 503 });
    await boundary.close();
  });

  it('keeps optional KMS absence out of configuration and rejects unreachable pools', async () => {
    const boundary = createProductionPostgresBoundary({
      environment: 'demo',
      databaseUrls: {
        farmer: 'postgresql://local:local@127.0.0.1:1/farmer',
        rsk: 'postgresql://local:local@127.0.0.1:1/rsk',
        authState: 'postgresql://local:local@127.0.0.1:1/auth-state',
      },
      appIds: { farmer: ['farmer-app'], rsk: ['rsk-app'], mp: ['mp-app'] },
      returnStateHmacSecret: 'a-production-shaped-secret-with-32-bytes',
    });
    expect(boundary.configured).toBe(true);
    expect(boundary.protectedFieldDecryptor).toBeUndefined();
    await expect(boundary.ready()).resolves.toBe(false);
    await boundary.close();
  });
});
