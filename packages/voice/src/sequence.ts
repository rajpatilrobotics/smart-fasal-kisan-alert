import { voiceFailure } from './errors.js';

export type SequenceDisposition =
  | { readonly kind: 'ACCEPTED'; readonly highestContiguous: number }
  | { readonly kind: 'DUPLICATE'; readonly highestContiguous: number }
  | { readonly kind: 'GAP'; readonly expected: number; readonly highestContiguous: number };

/** Tracks each transport direction independently; gaps never move the accepted watermark. */
export class MonotonicSequenceWindow {
  #highestReceived = 0;
  #highestPeerAcknowledged = 0;
  #lastSent = 0;

  receive(sequence: number): SequenceDisposition {
    if (!Number.isSafeInteger(sequence) || sequence <= 0) {
      throw voiceFailure('VOICE_FRAME_INVALID', 400);
    }
    if (sequence <= this.#highestReceived) {
      return Object.freeze({ kind: 'DUPLICATE', highestContiguous: this.#highestReceived });
    }
    const expected = this.#highestReceived + 1;
    if (sequence !== expected) {
      return Object.freeze({ kind: 'GAP', expected, highestContiguous: this.#highestReceived });
    }
    this.#highestReceived = sequence;
    return Object.freeze({ kind: 'ACCEPTED', highestContiguous: this.#highestReceived });
  }

  acknowledgePeer(sequence: number): void {
    if (!Number.isSafeInteger(sequence) || sequence < this.#highestPeerAcknowledged) {
      throw voiceFailure('VOICE_FRAME_INVALID', 400);
    }
    if (sequence > this.#lastSent) throw voiceFailure('VOICE_FRAME_INVALID', 400);
    this.#highestPeerAcknowledged = sequence;
  }

  nextSendingSequence(): number {
    this.#lastSent += 1;
    return this.#lastSent;
  }

  get highestReceived(): number {
    return this.#highestReceived;
  }

  get highestPeerAcknowledged(): number {
    return this.#highestPeerAcknowledged;
  }
}
