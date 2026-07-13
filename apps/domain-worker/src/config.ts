import { parseServiceEnvironment } from '@smart-fasal/config';

export const SERVICE_NAME = 'domain-worker' as const;
export const SERVICE_CONFIG = parseServiceEnvironment(process.env, {
  defaultPort: 8081,
  serviceName: SERVICE_NAME,
});
