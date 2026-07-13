const guardedTransactionBrand: unique symbol = Symbol('GuardedTransaction');

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DATABASE_ENVIRONMENTS = ['local', 'preview', 'staging', 'demo', 'production'] as const;
export const DATABASE_PURPOSES = [
  'farmer.self_service',
  'case.expert_support',
  'field.visit',
  'sensor.maintenance',
  'assisted.service',
  'alert.delivery',
  'market.support',
  'data.rights',
] as const;

export type DatabaseEnvironment = (typeof DATABASE_ENVIRONMENTS)[number];
export type PurposeCode = (typeof DATABASE_PURPOSES)[number];
export type RoleType = 'FARMER' | 'RSK';

export interface TransactionAuthorizationContext {
  environment: DatabaseEnvironment;
  subjectId: string;
  roleContextId: string;
  roleType: RoleType;
  purposeCode: PurposeCode;
  officeId?: string;
  jurisdictionId?: string;
  authorizationVersion: number;
}

export interface ParameterizedStatement {
  text: string;
  values: readonly unknown[];
}

export interface TransactionConnection {
  query<Row extends Record<string, unknown>>(
    statement: ParameterizedStatement,
  ): Promise<readonly Row[]>;
}

export interface TransactionPool {
  transaction<Result>(
    work: (connection: TransactionConnection) => Promise<Result>,
  ): Promise<Result>;
}

export interface GuardedTransaction {
  readonly authorization: Readonly<Required<TransactionAuthorizationContext>>;
  readonly [guardedTransactionBrand]: true;
  execute<Row extends Record<string, unknown>>(
    statement: ParameterizedStatement,
  ): Promise<readonly Row[]>;
}

export class InvalidTransactionContextError extends Error {
  readonly code = 'AUTHORIZATION_DENIED';

  constructor() {
    super('A complete, valid transaction authorization context is required');
    this.name = 'InvalidTransactionContextError';
  }
}

export async function runInGuardedTransaction<Result>(
  pool: TransactionPool,
  context: TransactionAuthorizationContext,
  work: (transaction: GuardedTransaction) => Promise<Result>,
): Promise<Result> {
  const validated = validateTransactionContext(context);

  return pool.transaction(async (connection) => {
    await bindAuthorizationContext(connection, validated);
    const transaction: GuardedTransaction = {
      authorization: validated,
      [guardedTransactionBrand]: true,
      execute: (statement) => connection.query(statement),
    };
    return work(transaction);
  });
}

export function validateTransactionContext(
  context: TransactionAuthorizationContext,
): Readonly<Required<TransactionAuthorizationContext>> {
  const officeId = context.officeId ?? NIL_UUID;
  const jurisdictionId = context.jurisdictionId ?? NIL_UUID;
  const valid =
    DATABASE_ENVIRONMENTS.includes(context.environment) &&
    isUuid(context.subjectId) &&
    isUuid(context.roleContextId) &&
    isNullableContextUuid(officeId) &&
    isNullableContextUuid(jurisdictionId) &&
    ['FARMER', 'RSK'].includes(context.roleType) &&
    DATABASE_PURPOSES.includes(context.purposeCode) &&
    Number.isSafeInteger(context.authorizationVersion) &&
    context.authorizationVersion > 0 &&
    ((context.roleType === 'FARMER' &&
      officeId === NIL_UUID &&
      jurisdictionId === NIL_UUID &&
      ['farmer.self_service', 'data.rights'].includes(context.purposeCode)) ||
      (context.roleType === 'RSK' &&
        officeId !== NIL_UUID &&
        jurisdictionId !== NIL_UUID &&
        context.purposeCode !== 'farmer.self_service'));

  if (!valid) throw new InvalidTransactionContextError();
  return Object.freeze({ ...context, officeId, jurisdictionId });
}

async function bindAuthorizationContext(
  connection: TransactionConnection,
  context: Readonly<Required<TransactionAuthorizationContext>>,
): Promise<void> {
  const settings = [
    ['app.environment', context.environment],
    ['app.surface', context.roleType],
    ['app.subject_id', context.subjectId],
    ['app.role_context_id', context.roleContextId],
    ['app.role_type', context.roleType],
    ['app.purpose_code', context.purposeCode],
    ['app.office_id', context.officeId],
    ['app.jurisdiction_id', context.jurisdictionId],
    ['app.authorization_version', String(context.authorizationVersion)],
  ] as const;

  for (const [name, value] of settings) {
    await connection.query({
      text: 'select set_config($1, $2, true)',
      values: [name, value],
    });
  }
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isNullableContextUuid(value: string): boolean {
  return value === NIL_UUID || isUuid(value);
}
