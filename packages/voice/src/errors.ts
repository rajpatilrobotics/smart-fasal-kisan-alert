export type VoiceFailureCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHORIZATION_DENIED'
  | 'CONSENT_OR_ACCESS_VERSION_CHANGED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'INVALID_STATE_TRANSITION'
  | 'RATE_LIMITED'
  | 'VOICE_FRAME_INVALID'
  | 'VOICE_FRAME_TOO_LARGE'
  | 'VOICE_PROPOSAL_EXPIRED'
  | 'VOICE_PROPOSAL_HASH_MISMATCH'
  | 'VOICE_SEQUENCE_GAP'
  | 'VOICE_TICKET_INVALID';

export class VoiceFailure extends Error {
  readonly code: VoiceFailureCode;
  readonly retryable: boolean;
  readonly statusCode: number;

  constructor(code: VoiceFailureCode, options: { retryable?: boolean; statusCode: number }) {
    super(code);
    this.name = 'VoiceFailure';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.statusCode = options.statusCode;
  }
}

export function voiceFailure(
  code: VoiceFailureCode,
  statusCode: number,
  retryable = false,
): VoiceFailure {
  return new VoiceFailure(code, { retryable, statusCode });
}
