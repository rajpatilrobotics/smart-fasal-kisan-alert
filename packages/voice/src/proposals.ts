import { createHash, randomUUID } from 'node:crypto';

import type { JsonValue, VoiceProposalResponse } from '@smart-fasal/contracts';
import { canonicalize } from 'json-canonicalize';

import { voiceFailure } from './errors.js';
import type { VoicePrincipal } from './tickets.js';

export type JsonObject = Record<string, JsonValue>;
export interface VoiceCommandStatus {
  readonly commandId: string;
  readonly state: 'UNKNOWN' | 'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED';
  readonly receiptReference?: string;
}

export interface StoredProposalInput {
  readonly sessionId: string;
  readonly principal: VoicePrincipal;
  readonly toolKey: string;
  readonly payload: JsonObject;
  readonly readBack: JsonObject;
  readonly expiresAt: string;
}

export interface ConfirmProposalInput {
  readonly proposalId: string;
  readonly expectedProposalRevision: number;
  readonly payloadHash: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly principal: VoicePrincipal;
}

export interface CorrectProposalInput {
  readonly proposalId: string;
  readonly expectedProposalRevision: number;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly correction: JsonObject;
  readonly principal: VoicePrincipal;
}

export interface CancelProposalInput {
  readonly proposalId: string;
  readonly expectedProposalRevision: number;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly principal: VoicePrincipal;
}

export interface DomainMutationExecutor {
  execute(input: {
    readonly commandId: string;
    readonly idempotencyKey: string;
    readonly payload: JsonObject;
    readonly principal: VoicePrincipal;
    readonly toolKey: string;
  }): Promise<{ readonly accepted: boolean; readonly receiptReference?: string }>;
}

export interface VoiceProposalPolicy {
  reauthorize(input: {
    readonly principal: VoicePrincipal;
    readonly sessionId: string;
    readonly toolKey: string;
  }): Promise<boolean>;
}

interface MutableProposal {
  readonly proposalId: string;
  readonly sessionId: string;
  readonly principal: VoicePrincipal;
  readonly toolKey: string;
  readonly payload: JsonObject;
  readonly payloadHash: string;
  readonly readBack: JsonObject;
  readonly expiresAtMs: number;
  revision: number;
  state: VoiceProposalResponse['state'];
  commandId?: string;
}

interface ActionReceipt<T> {
  readonly actionFingerprint: string;
  readonly value: T;
}

export interface VoiceProposalStoreOptions {
  readonly executor: DomainMutationExecutor;
  readonly policy: VoiceProposalPolicy;
  readonly registeredToolKeys: readonly string[];
  readonly now?: () => number;
  readonly randomId?: () => string;
}

export function canonicalPayloadHash(payload: JsonObject): string {
  return `sha256:${createHash('sha256').update(canonicalize(payload), 'utf8').digest('hex')}`;
}

function fingerprint(value: JsonObject): string {
  return canonicalPayloadHash(value);
}

function principalFingerprint(principal: VoicePrincipal): JsonObject {
  return {
    authorizationVersion: principal.authorizationVersion,
    devicePartitionId: principal.devicePartitionId,
    environment: principal.environment,
    origin: principal.origin,
    roleContextId: principal.roleContextId,
    roleType: principal.roleType,
    subjectId: principal.subjectId,
  };
}

function samePrincipal(left: VoicePrincipal, right: VoicePrincipal): boolean {
  return (
    left.environment === right.environment &&
    left.subjectId === right.subjectId &&
    left.roleContextId === right.roleContextId &&
    left.roleType === right.roleType &&
    left.origin === right.origin &&
    left.authorizationVersion === right.authorizationVersion &&
    left.devicePartitionId === right.devicePartitionId
  );
}

function publicProposal(proposal: MutableProposal): VoiceProposalResponse {
  return Object.freeze({
    proposalId: proposal.proposalId,
    sessionId: proposal.sessionId,
    revision: proposal.revision,
    state: proposal.state,
    toolKey: proposal.toolKey,
    payloadHash: proposal.payloadHash,
    readBack: Object.freeze({ ...proposal.readBack }),
    expiresAt: new Date(proposal.expiresAtMs).toISOString(),
    ...(proposal.commandId === undefined ? {} : { commandId: proposal.commandId }),
  });
}

/** Persisted-adapter contract with an in-memory implementation for local and deterministic tests. */
export class InMemoryVoiceProposalStore {
  readonly #executor: DomainMutationExecutor;
  readonly #policy: VoiceProposalPolicy;
  readonly #registeredToolKeys: ReadonlySet<string>;
  readonly #now: () => number;
  readonly #randomId: () => string;
  readonly #proposals = new Map<string, MutableProposal>();
  readonly #commandReceipts = new Map<string, ActionReceipt<VoiceCommandStatus>>();
  readonly #correctionReceipts = new Map<string, ActionReceipt<VoiceProposalResponse>>();
  readonly #cancellationReceipts = new Map<string, ActionReceipt<VoiceProposalResponse>>();
  readonly #locks = new Map<string, Promise<void>>();

  constructor(options: VoiceProposalStoreOptions) {
    this.#executor = options.executor;
    this.#policy = options.policy;
    this.#registeredToolKeys = new Set(options.registeredToolKeys);
    this.#now = options.now ?? Date.now;
    this.#randomId = options.randomId ?? randomUUID;
  }

  create(input: StoredProposalInput): VoiceProposalResponse {
    if (!this.#registeredToolKeys.has(input.toolKey)) {
      throw voiceFailure('AUTHORIZATION_DENIED', 403);
    }
    const expiresAtMs = Date.parse(input.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= this.#now()) {
      throw voiceFailure('VOICE_PROPOSAL_EXPIRED', 409);
    }
    const proposal: MutableProposal = {
      proposalId: this.#randomId(),
      sessionId: input.sessionId,
      principal: Object.freeze({ ...input.principal }),
      toolKey: input.toolKey,
      payload: Object.freeze({ ...input.payload }),
      payloadHash: canonicalPayloadHash(input.payload),
      readBack: Object.freeze({ ...input.readBack }),
      expiresAtMs,
      revision: 0,
      state: 'PENDING',
    };
    this.#proposals.set(proposal.proposalId, proposal);
    return publicProposal(proposal);
  }

  get(proposalId: string, principal: VoicePrincipal): VoiceProposalResponse {
    const proposal = this.#requiredProposal(proposalId);
    this.#assertPrincipal(proposal, principal);
    this.#expireIfNeeded(proposal);
    return publicProposal(proposal);
  }

  async confirm(input: ConfirmProposalInput): Promise<VoiceCommandStatus> {
    this.#requireStableCommandIdentity(input.commandId, input.idempotencyKey);
    const actionFingerprint = fingerprint({
      action: 'CONFIRM',
      commandId: input.commandId,
      expectedProposalRevision: input.expectedProposalRevision,
      idempotencyKey: input.idempotencyKey,
      payloadHash: input.payloadHash,
      principal: principalFingerprint(input.principal),
      proposalId: input.proposalId,
    });
    await this.#reauthorizeAction(input.proposalId, input.principal);
    const prior = this.#commandReceipts.get(input.commandId);
    if (prior !== undefined) return this.#replay(prior, actionFingerprint);

    return this.#withProposalLock(input.proposalId, async () => {
      const insidePrior = this.#commandReceipts.get(input.commandId);
      if (insidePrior !== undefined) {
        await this.#reauthorizeAction(input.proposalId, input.principal);
        return this.#replay(insidePrior, actionFingerprint);
      }
      const proposal = this.#requiredPending(input.proposalId, input.expectedProposalRevision);
      this.#assertPrincipal(proposal, input.principal);
      if (proposal.payloadHash !== input.payloadHash) {
        throw voiceFailure('VOICE_PROPOSAL_HASH_MISMATCH', 409);
      }
      if (
        !(await this.#policy.reauthorize({
          principal: input.principal,
          sessionId: proposal.sessionId,
          toolKey: proposal.toolKey,
        }))
      ) {
        throw voiceFailure('AUTHORIZATION_DENIED', 403);
      }

      proposal.state = 'EXECUTING';
      proposal.revision += 1;
      proposal.commandId = input.commandId;
      let status: VoiceCommandStatus;
      try {
        const outcome = await this.#executor.execute({
          commandId: input.commandId,
          idempotencyKey: input.idempotencyKey,
          payload: proposal.payload,
          principal: input.principal,
          toolKey: proposal.toolKey,
        });
        proposal.state = outcome.accepted ? 'COMPLETE' : 'FAILED';
        proposal.revision += 1;
        status = Object.freeze({
          commandId: input.commandId,
          state: outcome.accepted ? 'ACCEPTED' : 'REJECTED',
          ...(outcome.receiptReference === undefined
            ? {}
            : { receiptReference: outcome.receiptReference }),
        });
      } catch (error) {
        proposal.state = 'FAILED';
        proposal.revision += 1;
        throw error;
      }
      this.#commandReceipts.set(input.commandId, { actionFingerprint, value: status });
      return status;
    });
  }

  async correct(input: CorrectProposalInput): Promise<VoiceProposalResponse> {
    this.#requireStableCommandIdentity(input.commandId, input.idempotencyKey);
    const actionFingerprint = fingerprint({
      action: 'CORRECT',
      commandId: input.commandId,
      correction: input.correction,
      expectedProposalRevision: input.expectedProposalRevision,
      idempotencyKey: input.idempotencyKey,
      principal: principalFingerprint(input.principal),
      proposalId: input.proposalId,
    });
    await this.#reauthorizeAction(input.proposalId, input.principal);
    const prior = this.#correctionReceipts.get(input.commandId);
    if (prior !== undefined) return this.#replay(prior, actionFingerprint);

    return this.#withProposalLock(input.proposalId, async () => {
      const insidePrior = this.#correctionReceipts.get(input.commandId);
      if (insidePrior !== undefined) {
        await this.#reauthorizeAction(input.proposalId, input.principal);
        return this.#replay(insidePrior, actionFingerprint);
      }
      const proposal = this.#requiredPending(input.proposalId, input.expectedProposalRevision);
      this.#assertPrincipal(proposal, input.principal);
      if (
        !(await this.#policy.reauthorize({
          principal: input.principal,
          sessionId: proposal.sessionId,
          toolKey: proposal.toolKey,
        }))
      ) {
        throw voiceFailure('AUTHORIZATION_DENIED', 403);
      }
      proposal.state = 'SUPERSEDED';
      proposal.revision += 1;
      const replacement = this.create({
        sessionId: proposal.sessionId,
        principal: proposal.principal,
        toolKey: proposal.toolKey,
        payload: input.correction,
        readBack: input.correction,
        expiresAt: new Date(proposal.expiresAtMs).toISOString(),
      });
      this.#correctionReceipts.set(input.commandId, { actionFingerprint, value: replacement });
      return replacement;
    });
  }

  async cancel(input: CancelProposalInput): Promise<VoiceProposalResponse> {
    this.#requireStableCommandIdentity(input.commandId, input.idempotencyKey);
    const actionFingerprint = fingerprint({
      action: 'CANCEL',
      commandId: input.commandId,
      expectedProposalRevision: input.expectedProposalRevision,
      idempotencyKey: input.idempotencyKey,
      principal: principalFingerprint(input.principal),
      proposalId: input.proposalId,
    });
    await this.#reauthorizeAction(input.proposalId, input.principal);
    const prior = this.#cancellationReceipts.get(input.commandId);
    if (prior !== undefined) return this.#replay(prior, actionFingerprint);

    return this.#withProposalLock(input.proposalId, async () => {
      const insidePrior = this.#cancellationReceipts.get(input.commandId);
      if (insidePrior !== undefined) {
        await this.#reauthorizeAction(input.proposalId, input.principal);
        return this.#replay(insidePrior, actionFingerprint);
      }
      const proposal = this.#requiredPending(input.proposalId, input.expectedProposalRevision);
      this.#assertPrincipal(proposal, input.principal);
      if (
        !(await this.#policy.reauthorize({
          principal: input.principal,
          sessionId: proposal.sessionId,
          toolKey: proposal.toolKey,
        }))
      ) {
        throw voiceFailure('AUTHORIZATION_DENIED', 403);
      }
      proposal.state = 'CANCELLED';
      proposal.revision += 1;
      const value = publicProposal(proposal);
      this.#cancellationReceipts.set(input.commandId, { actionFingerprint, value });
      return value;
    });
  }

  commandStatus(commandId: string, principal: VoicePrincipal): VoiceCommandStatus {
    const proposal = [...this.#proposals.values()].find((item) => item.commandId === commandId);
    if (proposal !== undefined) this.#assertPrincipal(proposal, principal);
    const receipt = this.#commandReceipts.get(commandId);
    return receipt?.value ?? Object.freeze({ commandId, state: 'UNKNOWN' });
  }

  #requiredProposal(proposalId: string): MutableProposal {
    const proposal = this.#proposals.get(proposalId);
    if (proposal === undefined) throw voiceFailure('AUTHORIZATION_DENIED', 404);
    return proposal;
  }

  #requiredPending(proposalId: string, expectedRevision: number): MutableProposal {
    const proposal = this.#requiredProposal(proposalId);
    this.#expireIfNeeded(proposal);
    if (proposal.state === 'EXPIRED') throw voiceFailure('VOICE_PROPOSAL_EXPIRED', 409);
    if (proposal.state !== 'PENDING' || proposal.revision !== expectedRevision) {
      throw voiceFailure('INVALID_STATE_TRANSITION', 409);
    }
    return proposal;
  }

  #assertPrincipal(proposal: MutableProposal, principal: VoicePrincipal): void {
    if (!samePrincipal(proposal.principal, principal)) {
      if (
        proposal.principal.subjectId === principal.subjectId &&
        proposal.principal.authorizationVersion !== principal.authorizationVersion
      ) {
        throw voiceFailure('CONSENT_OR_ACCESS_VERSION_CHANGED', 403);
      }
      throw voiceFailure('AUTHORIZATION_DENIED', 403);
    }
  }

  #expireIfNeeded(proposal: MutableProposal): void {
    if (proposal.state === 'PENDING' && proposal.expiresAtMs <= this.#now()) {
      proposal.state = 'EXPIRED';
      proposal.revision += 1;
    }
  }

  #requireStableCommandIdentity(commandId: string, idempotencyKey: string): void {
    if (commandId !== idempotencyKey) throw voiceFailure('INVALID_STATE_TRANSITION', 409);
  }

  async #reauthorizeAction(proposalId: string, principal: VoicePrincipal): Promise<void> {
    const proposal = this.#requiredProposal(proposalId);
    this.#assertPrincipal(proposal, principal);
    this.#expireIfNeeded(proposal);
    if (proposal.state === 'EXPIRED') throw voiceFailure('VOICE_PROPOSAL_EXPIRED', 409);
    if (
      !(await this.#policy.reauthorize({
        principal,
        sessionId: proposal.sessionId,
        toolKey: proposal.toolKey,
      }))
    ) {
      throw voiceFailure('AUTHORIZATION_DENIED', 403);
    }
  }

  #replay<T>(receipt: ActionReceipt<T>, actionFingerprint: string): T {
    if (receipt.actionFingerprint !== actionFingerprint) {
      throw voiceFailure('INVALID_STATE_TRANSITION', 409);
    }
    return receipt.value;
  }

  async #withProposalLock<T>(proposalId: string, work: () => Promise<T>): Promise<T> {
    const prior = this.#locks.get(proposalId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#locks.set(
      proposalId,
      prior.then(() => held),
    );
    await prior;
    try {
      return await work();
    } finally {
      release();
    }
  }
}
