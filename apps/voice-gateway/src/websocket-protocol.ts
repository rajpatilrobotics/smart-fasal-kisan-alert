import { VOICE_PROTOCOL } from '@smart-fasal/voice';

export interface ParsedVoiceSubprotocols {
  readonly protocol: typeof VOICE_PROTOCOL;
  readonly ticket: string;
}

/** The ticket is accepted only in the dedicated subprotocol token, never a URL/header bearer. */
export function parseVoiceSubprotocols(
  header: string | string[] | undefined,
): ParsedVoiceSubprotocols {
  if (typeof header !== 'string' || header.length > 1_024) {
    throw new Error('INVALID_VOICE_SUBPROTOCOL');
  }
  const tokens = header.split(',').map((token) => token.trim());
  if (tokens.length !== 2 || tokens[0] !== VOICE_PROTOCOL) {
    throw new Error('INVALID_VOICE_SUBPROTOCOL');
  }
  const ticketToken = tokens[1];
  if (ticketToken === undefined || !/^ticket\.[A-Za-z0-9_-]{32,512}$/u.test(ticketToken)) {
    throw new Error('INVALID_VOICE_SUBPROTOCOL');
  }
  return Object.freeze({ protocol: VOICE_PROTOCOL, ticket: ticketToken.slice('ticket.'.length) });
}
