import {
  CAPABILITY_KEYS,
  CONSENT_SCOPES,
  DATA_CLASSIFICATIONS,
  PURPOSE_CODES,
} from '@smart-fasal/contracts/schemas';

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];
export type ConsentScope = (typeof CONSENT_SCOPES)[number];
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];
export type PurposeCode = (typeof PURPOSE_CODES)[number];

export const CAPABILITY_REGISTRY: ReadonlySet<string> = new Set(CAPABILITY_KEYS);
export const CONSENT_SCOPE_REGISTRY: ReadonlySet<string> = new Set(CONSENT_SCOPES);
export const DATA_CLASSIFICATION_REGISTRY: ReadonlySet<string> = new Set(DATA_CLASSIFICATIONS);
export const PURPOSE_REGISTRY: ReadonlySet<string> = new Set(PURPOSE_CODES);

export function isRegisteredCapability(value: string): value is CapabilityKey {
  return CAPABILITY_REGISTRY.has(value);
}

export function isRegisteredConsentScope(value: string): value is ConsentScope {
  return CONSENT_SCOPE_REGISTRY.has(value);
}

export function isRegisteredDataClassification(value: string): value is DataClassification {
  return DATA_CLASSIFICATION_REGISTRY.has(value);
}

export function isRegisteredPurpose(value: string): value is PurposeCode {
  return PURPOSE_REGISTRY.has(value);
}
