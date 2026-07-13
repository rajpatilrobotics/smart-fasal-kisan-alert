import { describe, expect, it } from 'vitest';

import {
  CommandRejectedError,
  environmentBoundPrincipal,
  executeCommand,
  hashSemanticCommand,
  type AtomicCommandCommit,
  type CommandStore,
  type SemanticCommand,
  type StoredCommandExecution,
} from './index';

const command: SemanticCommand = {
  commandId: '00000000-0000-4000-8000-000000000001',
  commandSchemaVersion: 1,
  operation: 'RecordConsentDecision',
  target: { type: 'consentDecision', id: '00000000-0000-4000-8000-000000000002' },
  expectedRevision: 2,
  payload: { scopeKey: 'location.processing', decision: 'ALLOW' },
};

const principal = {
  environment: 'demo',
  subjectId: '00000000-0000-4000-8000-000000000003',
  authorizationVersion: 7,
};

const effect = {
  mutation: { type: 'consentDecision' },
  auditFacts: [],
  sourceEvents: [{ eventType: 'consent.decision_recorded' }],
  integrationEvents: [{ eventType: 'consent.decision_recorded' }],
  outboxEntries: [{ destination: 'domain-worker' }],
  result: { type: 'consentDecision', id: command.target.id, revision: 3 },
  eventIds: ['00000000-0000-4000-8000-000000000004'],
};

class MemoryStore implements CommandStore {
  readonly executions = new Map<string, StoredCommandExecution>();
  commits: AtomicCommandCommit[] = [];
  revision = 2;
  failAfterCommit = false;
  private transactionTail: Promise<void> = Promise.resolve();

  async transaction<Result>(
    work: (unitOfWork: {
      lockExecution(principalId: string, commandId: string): Promise<void>;
      findExecution(
        principalId: string,
        commandId: string,
      ): Promise<StoredCommandExecution | undefined>;
      currentRevision(): Promise<number>;
      commitAtomic(commit: AtomicCommandCommit): Promise<void>;
    }) => Promise<Result>,
  ): Promise<Result> {
    const previous = this.transactionTail;
    let release = (): void => undefined;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const result = await work({
        lockExecution: () => Promise.resolve(),
        findExecution: (principalId, commandId) =>
          Promise.resolve(this.executions.get(`${principalId}:${commandId}`)),
        currentRevision: () => Promise.resolve(this.revision),
        commitAtomic: (commit) => {
          const key = `${commit.execution.principalId}:${commit.execution.commandId}`;
          this.executions.set(key, commit.execution);
          this.commits.push(commit);
          return Promise.resolve();
        },
      });
      if (this.failAfterCommit) throw new Error('connection lost after commit');
      return result;
    } finally {
      release();
    }
  }
}

function options(store: MemoryStore) {
  return {
    command,
    principal,
    store,
    authorize: () => true,
    prepareEffect: () => effect,
    now: () => new Date('2026-07-13T08:00:00.000Z'),
  };
}

describe('RFC 8785 semantic command hash', () => {
  it('is stable across object key ordering and excludes transport context', () => {
    const reordered = {
      ...command,
      payload: { decision: 'ALLOW', scopeKey: 'location.processing' },
    };
    expect(hashSemanticCommand(command)).toBe(hashSemanticCommand(reordered));
    expect(hashSemanticCommand(command)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('binds idempotency to environment and stable subject, not a role context', () => {
    expect(environmentBoundPrincipal(principal)).toBe(`demo:${principal.subjectId}`);
  });
});

describe('atomic command execution', () => {
  it('commits state, receipt, event, integration event and outbox as one unit', async () => {
    const store = new MemoryStore();
    const receipt = await executeCommand(options(store));
    expect(receipt.disposition).toBe('ACCEPTED');
    expect(store.commits).toHaveLength(1);
    expect(store.commits[0]?.effect).toEqual(effect);
  });

  it('returns the original safe receipt on identical replay', async () => {
    const store = new MemoryStore();
    await executeCommand(options(store));
    const replay = await executeCommand(options(store));
    expect(replay).toMatchObject({ disposition: 'ALREADY_ACCEPTED', eventIds: effect.eventIds });
    expect(store.commits).toHaveLength(1);
  });

  it('returns a retryable dependency outcome for an incomplete same-hash execution', async () => {
    const store = new MemoryStore();
    const principalId = environmentBoundPrincipal(principal);
    store.executions.set(`${principalId}:${command.commandId}`, {
      principalId,
      commandId: command.commandId,
      commandHash: hashSemanticCommand(command),
      operation: command.operation,
      authorizationVersion: principal.authorizationVersion,
      state: 'IN_PROGRESS',
    });

    await expect(executeCommand(options(store))).rejects.toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
    });
    expect(store.commits).toHaveLength(0);
  });

  it('serializes concurrent identical commands into one logical effect', async () => {
    const store = new MemoryStore();
    const receipts = await Promise.all([
      executeCommand(options(store)),
      executeCommand(options(store)),
    ]);
    expect(receipts.map(({ disposition }) => disposition).sort()).toEqual([
      'ACCEPTED',
      'ALREADY_ACCEPTED',
    ]);
    expect(store.commits).toHaveLength(1);
  });

  it('rejects the same key with a different semantic hash', async () => {
    const store = new MemoryStore();
    await executeCommand(options(store));
    await expect(
      executeCommand({ ...options(store), command: { ...command, payload: { decision: 'DENY' } } }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('rejects stale revisions without a state change', async () => {
    const store = new MemoryStore();
    store.revision = 4;
    await expect(executeCommand(options(store))).rejects.toMatchObject({
      code: 'EXPECTED_REVISION_MISMATCH',
    });
    expect(store.commits).toHaveLength(0);
  });

  it('does not replay after authorization version changes', async () => {
    const store = new MemoryStore();
    await executeCommand(options(store));
    await expect(
      executeCommand({ ...options(store), principal: { ...principal, authorizationVersion: 8 } }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_VERSION_CHANGED' });
  });

  it('reauthorizes an identical replay after capability or consent access loss', async () => {
    const store = new MemoryStore();
    await executeCommand(options(store));
    await expect(
      executeCommand({ ...options(store), authorize: () => false }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_DENIED' });
    expect(store.commits).toHaveLength(1);
  });

  it('recovers from a timeout after commit through the receipt', async () => {
    const store = new MemoryStore();
    store.failAfterCommit = true;
    await expect(executeCommand(options(store))).rejects.toThrow('connection lost after commit');
    store.failAfterCommit = false;
    await expect(executeCommand(options(store))).resolves.toMatchObject({
      disposition: 'ALREADY_ACCEPTED',
    });
    expect(store.commits).toHaveLength(1);
  });

  it('rejects authorization before applying an effect', async () => {
    const store = new MemoryStore();
    await expect(
      executeCommand({ ...options(store), authorize: () => false }),
    ).rejects.toBeInstanceOf(CommandRejectedError);
    expect(store.commits).toHaveLength(0);
  });
});
