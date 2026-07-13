import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import type { AuthorizationContext } from '@smart-fasal/contracts';

import { voiceFailure } from './errors.js';

export const VOICE_PROTOCOL = 'sfka.voice.v1' as const;
export const MAX_TICKET_TTL_MS = 60_000;
export const MAX_SESSION_TTL_MS = 15 * 60_000;

export type VoiceEnvironment = AuthorizationContext['environment'];
export type VoiceRoleType = AuthorizationContext['roleType'];

export interface VoicePrincipal {
  readonly environment: VoiceEnvironment;
  readonly subjectId: string;
  readonly roleContextId: string;
  readonly roleType: VoiceRoleType;
  readonly origin: string;
  readonly authorizationVersion: number;
  readonly devicePartitionId: string;
}

export interface VoiceTicketBinding extends VoicePrincipal {
  readonly language: 'mr' | 'hi' | 'en';
  readonly visualRoute: string;
  readonly contextIds: readonly string[];
}

export interface VoiceSession {
  readonly sessionId: string;
  readonly binding: VoiceTicketBinding;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly state: 'CREATED' | 'READY' | 'RECONNECTING' | 'CLOSED';
  readonly providerGeneration: number;
}

export interface IssuedVoiceSession {
  readonly session: VoiceSession;
  readonly singleUseTicket: string;
  readonly ticketExpiresAt: string;
}

interface TicketRecord {
  readonly ticketHash: string;
  readonly sessionId: string;
  readonly binding: VoiceTicketBinding;
  readonly expiresAtMs: number;
  consumedAtMs?: number;
}

interface MutableVoiceSession {
  readonly sessionId: string;
  readonly binding: VoiceTicketBinding;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  state: VoiceSession['state'];
  providerGeneration: number;
}

export interface VoiceTicketStoreOptions {
  readonly now?: () => number;
  readonly randomTicket?: () => string;
  readonly randomId?: () => string;
  readonly sessionTtlMs?: number;
  readonly ticketTtlMs?: number;
}

function ticketHash(ticket: string): string {
  return `sha256:${createHash('sha256').update(ticket, 'utf8').digest('hex')}`;
}

function normalizedBinding(binding: VoiceTicketBinding): VoiceTicketBinding {
  let origin: URL;
  try {
    origin = new URL(binding.origin);
  } catch {
    throw voiceFailure('AUTHORIZATION_DENIED', 403);
  }
  if (
    (origin.protocol !== 'https:' &&
      !(origin.protocol === 'http:' && origin.hostname === 'localhost')) ||
    origin.origin !== binding.origin ||
    origin.username !== '' ||
    origin.password !== '' ||
    origin.pathname !== '/' ||
    origin.search !== '' ||
    origin.hash !== ''
  ) {
    throw voiceFailure('AUTHORIZATION_DENIED', 403);
  }
  if (!binding.visualRoute.startsWith('/') || binding.visualRoute.includes('?')) {
    throw voiceFailure('AUTHORIZATION_DENIED', 403);
  }
  const contextIds = [...new Set(binding.contextIds)].sort();
  if (contextIds.length !== binding.contextIds.length || contextIds.length > 8) {
    throw voiceFailure('AUTHORIZATION_DENIED', 403);
  }
  return Object.freeze({ ...binding, contextIds: Object.freeze(contextIds) });
}

function sameString(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function sameBinding(left: VoiceTicketBinding, right: VoiceTicketBinding): boolean {
  const normalizedRight = normalizedBinding(right);
  return (
    sameString(left.environment, normalizedRight.environment) &&
    sameString(left.subjectId, normalizedRight.subjectId) &&
    sameString(left.roleContextId, normalizedRight.roleContextId) &&
    sameString(left.roleType, normalizedRight.roleType) &&
    sameString(left.origin, normalizedRight.origin) &&
    left.authorizationVersion === normalizedRight.authorizationVersion &&
    sameString(left.devicePartitionId, normalizedRight.devicePartitionId) &&
    sameString(left.language, normalizedRight.language) &&
    sameString(left.visualRoute, normalizedRight.visualRoute) &&
    left.contextIds.length === normalizedRight.contextIds.length &&
    left.contextIds.every((value, index) =>
      sameString(value, normalizedRight.contextIds[index] ?? ''),
    )
  );
}

function publicSession(session: MutableVoiceSession): VoiceSession {
  return Object.freeze({
    sessionId: session.sessionId,
    binding: session.binding,
    createdAt: new Date(session.createdAtMs).toISOString(),
    expiresAt: new Date(session.expiresAtMs).toISOString(),
    state: session.state,
    providerGeneration: session.providerGeneration,
  });
}

/** In-memory adapter for local/tests. Durable production adapters implement the same atomic semantics. */
export class InMemoryVoiceTicketStore {
  readonly #now: () => number;
  readonly #randomTicket: () => string;
  readonly #randomId: () => string;
  readonly #sessionTtlMs: number;
  readonly #ticketTtlMs: number;
  readonly #ticketsByHash = new Map<string, TicketRecord>();
  readonly #sessions = new Map<string, MutableVoiceSession>();
  readonly #consumeLocks = new Map<string, Promise<void>>();

  constructor(options: VoiceTicketStoreOptions = {}) {
    this.#now = options.now ?? Date.now;
    this.#randomTicket = options.randomTicket ?? (() => randomBytes(32).toString('base64url'));
    this.#randomId = options.randomId ?? randomUUID;
    this.#ticketTtlMs = Math.min(options.ticketTtlMs ?? MAX_TICKET_TTL_MS, MAX_TICKET_TTL_MS);
    this.#sessionTtlMs = Math.min(options.sessionTtlMs ?? MAX_SESSION_TTL_MS, MAX_SESSION_TTL_MS);
    if (this.#ticketTtlMs <= 0 || this.#sessionTtlMs <= 0) {
      throw new Error('Voice expiry must be positive');
    }
  }

  createSession(binding: VoiceTicketBinding): IssuedVoiceSession {
    const now = this.#now();
    const session: MutableVoiceSession = {
      sessionId: this.#randomId(),
      binding: normalizedBinding(binding),
      createdAtMs: now,
      expiresAtMs: now + this.#sessionTtlMs,
      state: 'CREATED',
      providerGeneration: 0,
    };
    this.#sessions.set(session.sessionId, session);
    return this.#issueTicket(session);
  }

  reconnect(sessionId: string, binding: VoiceTicketBinding): IssuedVoiceSession {
    const session = this.#requiredActiveSession(sessionId);
    if (!sameBinding(session.binding, binding)) {
      throw voiceFailure('CONSENT_OR_ACCESS_VERSION_CHANGED', 403);
    }
    const now = this.#now();
    for (const ticket of this.#ticketsByHash.values()) {
      if (ticket.sessionId === sessionId && ticket.consumedAtMs === undefined) {
        ticket.consumedAtMs = now;
      }
    }
    session.providerGeneration += 1;
    session.state = 'RECONNECTING';
    return this.#issueTicket(session);
  }

  consume(ticket: string, binding: VoiceTicketBinding): VoiceSession {
    if (!/^[A-Za-z0-9_-]{32,512}$/u.test(ticket)) {
      throw voiceFailure('VOICE_TICKET_INVALID', 401);
    }
    const record = this.#ticketsByHash.get(ticketHash(ticket));
    const now = this.#now();
    if (record === undefined || record.consumedAtMs !== undefined) {
      throw voiceFailure('VOICE_TICKET_INVALID', 401);
    }
    if (record.expiresAtMs <= now) {
      throw voiceFailure('VOICE_TICKET_INVALID', 401);
    }
    const session = this.#requiredActiveSession(record.sessionId);
    if (!sameBinding(record.binding, binding) || !sameBinding(session.binding, binding)) {
      throw voiceFailure('CONSENT_OR_ACCESS_VERSION_CHANGED', 403);
    }

    // No await occurs between the used check and write. Durable adapters use one compare-and-set.
    record.consumedAtMs = now;
    session.state = 'READY';
    return publicSession(session);
  }

  async consumeRealtime(
    ticket: string,
    origin: string,
    reauthorize: (binding: VoiceTicketBinding) => Promise<boolean>,
  ): Promise<VoiceSession> {
    if (!/^[A-Za-z0-9_-]{32,512}$/u.test(ticket)) {
      throw voiceFailure('VOICE_TICKET_INVALID', 401);
    }
    const hash = ticketHash(ticket);
    return this.#withConsumeLock(hash, async () => {
      const record = this.#ticketsByHash.get(hash);
      const now = this.#now();
      if (record === undefined || record.consumedAtMs !== undefined || record.expiresAtMs <= now) {
        throw voiceFailure('VOICE_TICKET_INVALID', 401);
      }
      if (!sameString(record.binding.origin, origin)) {
        throw voiceFailure('AUTHORIZATION_DENIED', 403);
      }
      const session = this.#requiredActiveSession(record.sessionId);
      if (!(await reauthorize(record.binding))) {
        throw voiceFailure('CONSENT_OR_ACCESS_VERSION_CHANGED', 403);
      }
      // Recheck after asynchronous authorization. The keyed lock is the in-memory compare-and-set.
      if (record.expiresAtMs <= this.#now()) {
        throw voiceFailure('VOICE_TICKET_INVALID', 401);
      }
      record.consumedAtMs = this.#now();
      session.state = 'READY';
      return publicSession(session);
    });
  }

  getSession(sessionId: string, principal?: VoicePrincipal): VoiceSession {
    const session = this.#requiredActiveSession(sessionId);
    if (principal !== undefined) this.#assertPrincipal(session, principal);
    return publicSession(session);
  }

  closeSession(sessionId: string, principal: VoicePrincipal): VoiceSession {
    const session = this.#requiredActiveSession(sessionId);
    this.#assertPrincipal(session, principal);
    session.providerGeneration += 1;
    session.state = 'CLOSED';
    return publicSession(session);
  }

  invalidateProviderWork(sessionId: string): number {
    const session = this.#requiredActiveSession(sessionId);
    session.providerGeneration += 1;
    return session.providerGeneration;
  }

  beginProviderWork(sessionId: string): number {
    return this.#requiredActiveSession(sessionId).providerGeneration;
  }

  isProviderWorkCurrent(sessionId: string, generation: number): boolean {
    const session = this.#sessions.get(sessionId);
    return (
      session !== undefined &&
      session.state !== 'CLOSED' &&
      session.expiresAtMs > this.#now() &&
      session.providerGeneration === generation
    );
  }

  inspectStoredTickets(): readonly Readonly<TicketRecord>[] {
    return [...this.#ticketsByHash.values()].map((record) => Object.freeze({ ...record }));
  }

  #issueTicket(session: MutableVoiceSession): IssuedVoiceSession {
    const ticket = this.#randomTicket();
    if (!/^[A-Za-z0-9_-]{32,512}$/u.test(ticket)) {
      throw new Error('Ticket source returned an invalid value');
    }
    const hash = ticketHash(ticket);
    if (this.#ticketsByHash.has(hash)) throw new Error('Ticket source returned a duplicate');
    const expiresAtMs = Math.min(this.#now() + this.#ticketTtlMs, session.expiresAtMs);
    this.#ticketsByHash.set(hash, {
      ticketHash: hash,
      sessionId: session.sessionId,
      binding: session.binding,
      expiresAtMs,
    });
    return Object.freeze({
      session: publicSession(session),
      singleUseTicket: ticket,
      ticketExpiresAt: new Date(expiresAtMs).toISOString(),
    });
  }

  #requiredActiveSession(sessionId: string): MutableVoiceSession {
    const session = this.#sessions.get(sessionId);
    if (session === undefined) throw voiceFailure('AUTHORIZATION_DENIED', 404);
    if (session.expiresAtMs <= this.#now()) {
      session.providerGeneration += 1;
      session.state = 'CLOSED';
      throw voiceFailure('AUTHORIZATION_DENIED', 403);
    }
    if (session.state === 'CLOSED') throw voiceFailure('INVALID_STATE_TRANSITION', 409);
    return session;
  }

  #assertPrincipal(session: MutableVoiceSession, principal: VoicePrincipal): void {
    const binding = session.binding;
    if (
      binding.environment !== principal.environment ||
      binding.subjectId !== principal.subjectId ||
      binding.roleContextId !== principal.roleContextId ||
      binding.roleType !== principal.roleType ||
      binding.origin !== principal.origin ||
      binding.devicePartitionId !== principal.devicePartitionId
    ) {
      throw voiceFailure('AUTHORIZATION_DENIED', 403);
    }
    if (binding.authorizationVersion !== principal.authorizationVersion) {
      throw voiceFailure('CONSENT_OR_ACCESS_VERSION_CHANGED', 403);
    }
  }

  async #withConsumeLock<T>(ticketHashKey: string, work: () => Promise<T>): Promise<T> {
    const prior = this.#consumeLocks.get(ticketHashKey) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#consumeLocks.set(
      ticketHashKey,
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
