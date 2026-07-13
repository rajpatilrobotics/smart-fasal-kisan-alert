import { parseServiceEnvironment } from '@smart-fasal/config';

export const SERVICE_NAME = 'privacy-pipeline' as const;
export const SERVICE_CONFIG = parseServiceEnvironment(process.env, {
  defaultPort: 8085,
  serviceName: SERVICE_NAME,
});
