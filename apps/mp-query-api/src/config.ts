export const SERVICE_NAME = 'mp-query-api' as const;

const DEPLOYMENT_ENVIRONMENTS = ['local', 'preview', 'staging', 'demo', 'production'] as const;

export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];

function isDeploymentEnvironment(value: string): value is DeploymentEnvironment {
  return DEPLOYMENT_ENVIRONMENTS.some((candidate) => candidate === value);
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? '8084');
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

function readDeploymentEnvironment(value: string | undefined): DeploymentEnvironment {
  if (value === undefined) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('SMART_FASAL_ENVIRONMENT is required in production.');
    }
    return 'local';
  }
  if (isDeploymentEnvironment(value)) return value;
  throw new Error('SMART_FASAL_ENVIRONMENT must name a supported environment.');
}

function readExactOrigin(value: string | undefined): string {
  if (value === undefined && process.env['NODE_ENV'] === 'production') {
    throw new Error('MP_WEB_ORIGIN is required in production.');
  }
  const candidate = value ?? 'http://localhost:3002';
  const parsed = new URL(candidate);
  if (parsed.origin !== candidate || !['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('MP_WEB_ORIGIN must be an exact HTTP(S) origin without a path.');
  }
  if (process.env['NODE_ENV'] === 'production' && parsed.protocol !== 'https:') {
    throw new Error('MP_WEB_ORIGIN must use HTTPS in production.');
  }
  return candidate;
}

export const SERVICE_CONFIG = {
  HOST: process.env['HOST'] ?? '0.0.0.0',
  PORT: readPort(process.env['PORT']),
  environment: readDeploymentEnvironment(process.env['SMART_FASAL_ENVIRONMENT']),
  mpAppIds: process.env['MP_FIREBASE_APP_ID'] ? [process.env['MP_FIREBASE_APP_ID']] : [],
  mpOrigins: [readExactOrigin(process.env['MP_WEB_ORIGIN'])],
  serviceName: SERVICE_NAME,
} as const;
