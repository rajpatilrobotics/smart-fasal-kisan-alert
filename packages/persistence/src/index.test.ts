import { describe, expect, it, vi } from 'vitest';

import {
  InvalidTransactionContextError,
  runInGuardedTransaction,
  validateTransactionContext,
  type ParameterizedStatement,
  type TransactionConnection,
  type TransactionPool,
} from './index';

const context = {
  environment: 'local' as const,
  subjectId: '00000000-0000-4000-8000-000000000001',
  roleContextId: '00000000-0000-4000-8000-000000000002',
  roleType: 'FARMER' as const,
  purposeCode: 'farmer.self_service' as const,
  authorizationVersion: 3,
};

function fakePool() {
  const statements: ParameterizedStatement[] = [];
  const query = vi.fn((statement: ParameterizedStatement) => {
    statements.push(statement);
    return Promise.resolve([]);
  });
  const connection: TransactionConnection = {
    query,
  };
  const pool: TransactionPool = {
    transaction: (work) => work(connection),
  };
  return { pool, query, statements };
}

describe('guarded persistence transaction', () => {
  it('binds every setting with transaction-local parameterized set_config', async () => {
    const { pool, statements } = fakePool();
    await runInGuardedTransaction(pool, context, async (transaction) => {
      expect(transaction.authorization.officeId).toBe('00000000-0000-0000-0000-000000000000');
      await transaction.execute({ text: 'select 1', values: [] });
    });

    expect(statements.slice(0, 9).map(({ values }) => values[0])).toEqual([
      'app.environment',
      'app.surface',
      'app.subject_id',
      'app.role_context_id',
      'app.role_type',
      'app.purpose_code',
      'app.office_id',
      'app.jurisdiction_id',
      'app.authorization_version',
    ]);
    expect(
      statements.slice(0, 9).every(({ text }) => text === 'select set_config($1, $2, true)'),
    ).toBe(true);
  });

  it.each([
    [{ ...context, subjectId: 'malformed' }],
    [{ ...context, purposeCode: 'unknown.purpose' as 'farmer.self_service' }],
    [{ ...context, environment: 'unknown' as 'local' }],
    [{ ...context, authorizationVersion: 0 }],
    [{ ...context, roleType: 'RSK' as const }],
  ])('denies missing or malformed context before checking out a connection', async (candidate) => {
    const { pool, query } = fakePool();
    await expect(
      runInGuardedTransaction(pool, candidate, () => Promise.resolve('never')),
    ).rejects.toBeInstanceOf(InvalidTransactionContextError);
    expect(query).not.toHaveBeenCalled();
  });

  it('does not reuse settings across pool transactions', async () => {
    const { pool, statements } = fakePool();
    await runInGuardedTransaction(pool, context, () => Promise.resolve(undefined));
    statements.length = 0;
    await runInGuardedTransaction(
      pool,
      { ...context, subjectId: '00000000-0000-4000-8000-000000000099' },
      () => Promise.resolve(undefined),
    );
    expect(statements).toHaveLength(9);
    expect(statements[0]?.values).toEqual(['app.environment', 'local']);
    expect(statements[2]?.values).toEqual([
      'app.subject_id',
      '00000000-0000-4000-8000-000000000099',
    ]);
  });
});

describe('context validation', () => {
  it('requires office and jurisdiction for staff surfaces', () => {
    expect(() => validateTransactionContext({ ...context, roleType: 'RSK' })).toThrow(
      InvalidTransactionContextError,
    );
    expect(
      validateTransactionContext({
        ...context,
        roleType: 'RSK',
        purposeCode: 'assisted.service',
        officeId: '00000000-0000-4000-8000-000000000011',
        jurisdictionId: '00000000-0000-4000-8000-000000000012',
      }).roleType,
    ).toBe('RSK');
  });

  it('rejects role-purpose and Farmer office confusion', () => {
    expect(() =>
      validateTransactionContext({ ...context, purposeCode: 'assisted.service' }),
    ).toThrow(InvalidTransactionContextError);
    expect(() =>
      validateTransactionContext({
        ...context,
        officeId: '00000000-0000-4000-8000-000000000011',
      }),
    ).toThrow(InvalidTransactionContextError);
    expect(() =>
      validateTransactionContext({
        ...context,
        roleType: 'RSK',
        purposeCode: 'farmer.self_service',
        officeId: '00000000-0000-4000-8000-000000000011',
        jurisdictionId: '00000000-0000-4000-8000-000000000012',
      }),
    ).toThrow(InvalidTransactionContextError);
  });
});
