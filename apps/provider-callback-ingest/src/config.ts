import { parseServiceEnvironment } from '@smart-fasal/config';

export const SERVICE_NAME = 'provider-callback-ingest' as const;
export const SERVICE_CONFIG = parseServiceEnvironment(process.env, {
  defaultPort: 8083,
  serviceName: SERVICE_NAME,
});
