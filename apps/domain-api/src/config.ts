import { parseServiceEnvironment } from '@smart-fasal/config';

export const SERVICE_NAME = 'domain-api' as const;
export const SERVICE_CONFIG = parseServiceEnvironment(process.env, {
  defaultPort: 8080,
  serviceName: SERVICE_NAME,
});
