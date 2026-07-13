// Generated from strict Zod contracts. Do not edit by hand.
import { HealthPayloadSchema } from '../runtime/schemas.js';

export const contractVersion = '1.2.0-m3';
export const serviceHealth = { statuses: ['ok', 'not_ready'] };
export function isHealthPayload(value) {
  return HealthPayloadSchema.safeParse(value).success;
}
