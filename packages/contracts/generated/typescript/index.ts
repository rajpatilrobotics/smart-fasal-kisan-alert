// Generated from strict Zod contracts. Do not edit by hand.
import { z } from 'zod';

import { HealthPayloadSchema } from '../../src/http/common.js';

export * from '../../src/index.js';
export const contractVersion = '1.0.0-m1' as const;
export const serviceHealth = { statuses: ['ok', 'not_ready'] } as const;
export type HealthPayload = z.infer<typeof HealthPayloadSchema>;
export type HealthStatus = HealthPayload['status'];
export function isHealthPayload(value: unknown): value is HealthPayload {
  return HealthPayloadSchema.safeParse(value).success;
}
