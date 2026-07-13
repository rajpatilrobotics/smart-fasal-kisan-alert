import { describe, expect, it } from 'vitest';

import { VoiceFailure } from './errors.js';
import {
  InMemoryVoiceTicketStore,
  MAX_SESSION_TTL_MS,
  MAX_TICKET_TTL_MS,
  type VoiceTicketBinding,
} from './tickets.js';

const SESSION_ID = '019f5678-1234-7000-8000-000000000001';
const TICKET = 'abcdefghijklmnopqrstuvwxyzABCDEFGH123456789';

const binding: VoiceTicketBinding = {
  environment: 'local',
  subjectId: '019f5678-1234-7000-8000-000000000002',
  roleContextId: '019f5678-1234-7000-8000-000000000003',
  roleType: 'FARMER',
  origin: 'http://localhost:3000',
  authorizationVersion: 7,
  devicePartitionId: '019f5678-1234-7000-8000-000000000004',
  language: 'mr',
  visualRoute: '/farmer/today',
  contextIds: ['019f5678-1234-7000-8000-000000000005'],
};

describe('one-time bound voice tickets', () => {
  it('stores only a hash, consumes exactly once and clamps both expiries', () => {
    let now = Date.parse('2026-07-13T00:00:00.000Z');
    const store = new InMemoryVoiceTicketStore({
      now: () => now,
      randomId: () => SESSION_ID,
      randomTicket: () => TICKET,
      sessionTtlMs: MAX_SESSION_TTL_MS * 2,
      ticketTtlMs: MAX_TICKET_TTL_MS * 2,
    });

    const issued = store.createSession(binding);
    expect(issued.singleUseTicket).toBe(TICKET);
    expect(Date.parse(issued.ticketExpiresAt) - now).toBe(MAX_TICKET_TTL_MS);
    expect(Date.parse(issued.session.expiresAt) - now).toBe(MAX_SESSION_TTL_MS);
    expect(JSON.stringify(store.inspectStoredTickets())).not.toContain(TICKET);
    expect(store.inspectStoredTickets()[0]?.ticketHash).toMatch(/^sha256:[0-9a-f]{64}$/u);

    expect(store.consume(TICKET, binding).state).toBe('READY');
    expect(() => store.consume(TICKET, binding)).toThrow(VoiceFailure);
    now += 1;
  });

  it('fails closed for origin or access-version mismatch without loosening the binding', () => {
    const store = new InMemoryVoiceTicketStore({
      randomId: () => SESSION_ID,
      randomTicket: () => TICKET,
    });
    store.createSession(binding);

    expect(() => store.consume(TICKET, { ...binding, origin: 'https://attacker.invalid' })).toThrow(
      'CONSENT_OR_ACCESS_VERSION_CHANGED',
    );
    expect(() => store.consume(TICKET, { ...binding, authorizationVersion: 8 })).toThrow(
      'CONSENT_OR_ACCESS_VERSION_CHANGED',
    );
    expect(store.consume(TICKET, binding).state).toBe('READY');
  });

  it('rejects expiry and revokes an older unconsumed ticket on reconnect', () => {
    let now = 1_000;
    let ticketNumber = 0;
    const tickets = [
      'abcdefghijklmnopqrstuvwxyzABCDEFGH123456789',
      'abcdefghijklmnopqrstuvwxyzABCDEFGH123456780',
    ];
    const store = new InMemoryVoiceTicketStore({
      now: () => now,
      randomId: () => SESSION_ID,
      randomTicket: () => tickets[ticketNumber++] ?? TICKET,
    });
    const first = store.createSession(binding);
    const second = store.reconnect(SESSION_ID, binding);

    expect(() => store.consume(first.singleUseTicket, binding)).toThrow('VOICE_TICKET_INVALID');
    expect(store.consume(second.singleUseTicket, binding).state).toBe('READY');

    const expiring = new InMemoryVoiceTicketStore({
      now: () => now,
      randomId: () => SESSION_ID,
      randomTicket: () => TICKET,
    });
    expiring.createSession(binding);
    now += MAX_TICKET_TTL_MS;
    expect(() => expiring.consume(TICKET, binding)).toThrow('VOICE_TICKET_INVALID');
  });

  it('atomically allows only one concurrent Origin-bound realtime redemption', async () => {
    const store = new InMemoryVoiceTicketStore({
      randomId: () => SESSION_ID,
      randomTicket: () => TICKET,
    });
    store.createSession(binding);
    const reauthorize = async () => {
      await Promise.resolve();
      return true;
    };

    const results = await Promise.allSettled([
      store.consumeRealtime(TICKET, binding.origin, reauthorize),
      store.consumeRealtime(TICKET, binding.origin, reauthorize),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });
});
