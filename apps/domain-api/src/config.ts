import { parseServiceEnvironment } from '@smart-fasal/config';

export const SERVICE_NAME = 'domain-api' as const;
export const SERVICE_CONFIG = parseServiceEnvironment(process.env, {
  defaultPort: 8080,
  serviceName: SERVICE_NAME,
});

const DEPLOYMENT_ENVIRONMENTS = ['local', 'preview', 'staging', 'demo', 'production'] as const;
const RECOMMENDATION_EVIDENCE_MODES = ['recorded_raigad', 'live_unavailable'] as const;

export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];
export type RecommendationEvidenceMode = (typeof RECOMMENDATION_EVIDENCE_MODES)[number];

function isDeploymentEnvironment(value: string): value is DeploymentEnvironment {
  return DEPLOYMENT_ENVIRONMENTS.some((candidate) => candidate === value);
}

function readDeploymentEnvironment(
  value: string | undefined,
  nodeEnvironment: typeof SERVICE_CONFIG.NODE_ENV,
): DeploymentEnvironment {
  if (value === undefined) {
    if (nodeEnvironment === 'production') {
      throw new Error('SMART_FASAL_ENVIRONMENT is required in production.');
    }
    return 'local';
  }
  if (isDeploymentEnvironment(value)) return value;
  throw new Error('SMART_FASAL_ENVIRONMENT must name a supported environment.');
}

function readExactOrigin(
  value: string | undefined,
  localDefault: string,
  nodeEnvironment: typeof SERVICE_CONFIG.NODE_ENV,
): string {
  if (value === undefined && nodeEnvironment === 'production') {
    throw new Error('Every application origin must be explicitly configured in production.');
  }
  const candidate = value ?? localDefault;
  const parsed = new URL(candidate);
  if (parsed.origin !== candidate || !['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Application origins must be exact HTTP(S) origins without paths.');
  }
  if (nodeEnvironment === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Application origins must use HTTPS in production.');
  }
  return candidate;
}

function readMfaMaximumAge(value: string | undefined): number {
  const seconds = Number(value ?? '900');
  if (!Number.isSafeInteger(seconds) || seconds < 60 || seconds > 86_400) {
    throw new Error('STAFF_MFA_MAX_AGE_SECONDS must be an integer from 60 through 86400.');
  }
  return seconds;
}

function readRecommendationEvidenceMode(
  value: string | undefined,
  environment: DeploymentEnvironment,
): RecommendationEvidenceMode {
  if (value === undefined) {
    return environment === 'local' || environment === 'demo'
      ? 'recorded_raigad'
      : 'live_unavailable';
  }
  if (RECOMMENDATION_EVIDENCE_MODES.some((candidate) => candidate === value)) {
    return value as RecommendationEvidenceMode;
  }
  throw new Error('RECOMMENDATION_EVIDENCE_MODE must be recorded_raigad or live_unavailable.');
}

function optionalSecret(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  return candidate === undefined || candidate.length === 0 ? undefined : candidate;
}

const deploymentEnvironment = readDeploymentEnvironment(
  process.env['SMART_FASAL_ENVIRONMENT'],
  SERVICE_CONFIG.NODE_ENV,
);
const firebaseProjectId = process.env['FIREBASE_PROJECT_ID']?.trim();

export const API_BOUNDARY_CONFIG = {
  environment: deploymentEnvironment,
  firebaseProjectId: firebaseProjectId === '' ? undefined : firebaseProjectId,
  staffMfaMaximumAgeSeconds: readMfaMaximumAge(process.env['STAFF_MFA_MAX_AGE_SECONDS']),
  recommendationEvidenceMode: readRecommendationEvidenceMode(
    process.env['RECOMMENDATION_EVIDENCE_MODE'],
    deploymentEnvironment,
  ),
  databaseUrls: {
    farmer: optionalSecret(process.env['FARMER_DATABASE_URL']),
    rsk: optionalSecret(process.env['RSK_DATABASE_URL']),
    authState: optionalSecret(process.env['AUTH_STATE_DATABASE_URL']),
  },
  returnStateHmacSecret: optionalSecret(process.env['RETURN_STATE_HMAC_SECRET']),
  origins: {
    farmer: [
      readExactOrigin(
        process.env['FARMER_WEB_ORIGIN'],
        'http://localhost:3000',
        SERVICE_CONFIG.NODE_ENV,
      ),
    ],
    rsk: [
      readExactOrigin(
        process.env['RSK_WEB_ORIGIN'],
        'http://localhost:3001',
        SERVICE_CONFIG.NODE_ENV,
      ),
    ],
    mp: [
      readExactOrigin(
        process.env['MP_WEB_ORIGIN'],
        'http://localhost:3002',
        SERVICE_CONFIG.NODE_ENV,
      ),
    ],
  },
  appIds: {
    farmer: process.env['FARMER_FIREBASE_APP_ID'] ? [process.env['FARMER_FIREBASE_APP_ID']] : [],
    rsk: process.env['RSK_FIREBASE_APP_ID'] ? [process.env['RSK_FIREBASE_APP_ID']] : [],
    mp: process.env['MP_FIREBASE_APP_ID'] ? [process.env['MP_FIREBASE_APP_ID']] : [],
  },
} as const;
