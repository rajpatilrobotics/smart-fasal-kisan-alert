import { parseServiceEnvironment } from '@smart-fasal/config';

export const SERVICE_NAME = 'domain-worker' as const;
export const SERVICE_CONFIG = parseServiceEnvironment(process.env, {
  defaultPort: 8081,
  serviceName: SERVICE_NAME,
});

export type DomainWorkerEnvironment = 'local' | 'preview' | 'staging' | 'demo' | 'production';

export type DatabaseConfiguration =
  | { readonly available: true; readonly url: string }
  | {
      readonly available: false;
      readonly code: 'DATABASE_CONFIGURATION_INVALID' | 'DATABASE_CONFIGURATION_MISSING';
    };

export interface DomainWorkerConfiguration {
  readonly batchSize: number;
  readonly database: DatabaseConfiguration;
  readonly environment: DomainWorkerEnvironment;
  readonly leaseMilliseconds: number;
  readonly maximumBackoffMilliseconds: number;
  readonly operationTimeoutMilliseconds: number;
  readonly pollIntervalMilliseconds: number;
  readonly workerId: string;
}

const ENVIRONMENTS = new Set<DomainWorkerEnvironment>([
  'local',
  'preview',
  'staging',
  'demo',
  'production',
]);
const WORKER_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/u;

function boundedInteger(
  value: string | undefined,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value.trim().length === 0) return defaultValue;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error('DOMAIN_WORKER_CONFIGURATION_INVALID');
  }
  return parsed;
}

function parseDatabaseConfiguration(value: string | undefined): DatabaseConfiguration {
  if (value === undefined || value.trim().length === 0) {
    return { available: false, code: 'DATABASE_CONFIGURATION_MISSING' };
  }
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname.length === 0) {
      return { available: false, code: 'DATABASE_CONFIGURATION_INVALID' };
    }
    return { available: true, url: value };
  } catch {
    return { available: false, code: 'DATABASE_CONFIGURATION_INVALID' };
  }
}

export function parseDomainWorkerConfiguration(
  environment: Record<string, string | undefined>,
): DomainWorkerConfiguration {
  const deploymentEnvironment = environment['SMART_FASAL_ENVIRONMENT'] ?? 'local';
  if (!ENVIRONMENTS.has(deploymentEnvironment as DomainWorkerEnvironment)) {
    throw new Error('DOMAIN_WORKER_CONFIGURATION_INVALID');
  }
  const operationTimeoutMilliseconds = boundedInteger(
    environment['DOMAIN_WORKER_OPERATION_TIMEOUT_MS'],
    5_000,
    100,
    30_000,
  );
  const batchSize = boundedInteger(environment['DOMAIN_WORKER_BATCH_SIZE'], 2, 1, 100);
  const leaseMilliseconds = boundedInteger(
    environment['DOMAIN_WORKER_LEASE_MS'],
    15_000,
    1_000,
    60_000,
  );
  if (leaseMilliseconds <= operationTimeoutMilliseconds * batchSize + 1_000) {
    throw new Error('DOMAIN_WORKER_CONFIGURATION_INVALID');
  }
  const workerId = environment['DOMAIN_WORKER_ID'] ?? `${SERVICE_NAME}:${String(process.pid)}`;
  if (!WORKER_ID.test(workerId)) throw new Error('DOMAIN_WORKER_CONFIGURATION_INVALID');

  return Object.freeze({
    batchSize,
    database: parseDatabaseConfiguration(environment['DOMAIN_WORKER_DATABASE_URL']),
    environment: deploymentEnvironment as DomainWorkerEnvironment,
    leaseMilliseconds,
    maximumBackoffMilliseconds: boundedInteger(
      environment['DOMAIN_WORKER_MAX_BACKOFF_MS'],
      30_000,
      1_000,
      120_000,
    ),
    operationTimeoutMilliseconds,
    pollIntervalMilliseconds: boundedInteger(
      environment['DOMAIN_WORKER_POLL_INTERVAL_MS'],
      1_000,
      100,
      60_000,
    ),
    workerId,
  });
}

export const DOMAIN_WORKER_CONFIG = parseDomainWorkerConfiguration(process.env);
