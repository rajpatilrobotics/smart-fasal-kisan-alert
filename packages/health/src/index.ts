import type { HealthPayload, HealthStatus } from '@smart-fasal/contracts/typescript';

export type { HealthPayload, HealthStatus } from '@smart-fasal/contracts/typescript';

export function createHealthPayload(service: string, status: HealthStatus): HealthPayload {
  return { service, status, timestamp: new Date().toISOString() };
}
