import { describe, expect, it } from 'vitest';

import { parseVoiceSubprotocols } from './websocket-protocol.js';

const TICKET = 'abcdefghijklmnopqrstuvwxyzABCDEFGH123456789';

describe('voice WebSocket subprotocol parsing', () => {
  it('accepts the protocol followed by one ticket token', () => {
    expect(parseVoiceSubprotocols(`sfka.voice.v1, ticket.${TICKET}`)).toEqual({
      protocol: 'sfka.voice.v1',
      ticket: TICKET,
    });
  });

  it.each([
    `ticket.${TICKET}, sfka.voice.v1`,
    `sfka.voice.v1, ticket.${TICKET}, extra`,
    'sfka.voice.v1',
    `sfka.voice.v1, bearer.${TICKET}`,
    undefined,
  ])('rejects missing, reordered or additional credentials: %s', (header) => {
    expect(() => parseVoiceSubprotocols(header)).toThrow('INVALID_VOICE_SUBPROTOCOL');
  });
});
