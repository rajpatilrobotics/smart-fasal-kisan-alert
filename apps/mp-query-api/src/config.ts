import { parseServiceEnvironment } from '@smart-fasal/config';

export const SERVICE_NAME = 'mp-query-api' as const;
export const SERVICE_CONFIG = parseServiceEnvironment(process.env, {
  defaultPort: 8084,
  serviceName: SERVICE_NAME,
});
