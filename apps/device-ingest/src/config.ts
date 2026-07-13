import { parseServiceEnvironment } from '@smart-fasal/config';

export const SERVICE_NAME = 'device-ingest' as const;
export const SERVICE_CONFIG = parseServiceEnvironment(process.env, {
  defaultPort: 8082,
  serviceName: SERVICE_NAME,
});
