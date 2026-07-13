import type { SecurityResult } from '../problems.js';
import {
  createDeterministicIdentityVerifier,
  type DeterministicIdentityVerifierConfig,
} from './fake.js';
import { createFirebaseIdentityVerifier, type FirebaseIdentityVerifierConfig } from './firebase.js';
import type { IdentityVerifier } from './types.js';

export * from './fake.js';
export * from './firebase.js';
export * from './types.js';

export type IdentityVerifierConfig =
  FirebaseIdentityVerifierConfig | DeterministicIdentityVerifierConfig;

export function createIdentityVerifier(
  config: IdentityVerifierConfig,
): SecurityResult<IdentityVerifier> {
  return config.mode === 'firebase'
    ? createFirebaseIdentityVerifier(config)
    : createDeterministicIdentityVerifier(config);
}
