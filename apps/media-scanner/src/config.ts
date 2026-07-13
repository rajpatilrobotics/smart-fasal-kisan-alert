import { parseServiceEnvironment } from '@smart-fasal/config';

export const SERVICE_NAME = 'media-scanner' as const;
export const SERVICE_CONFIG = parseServiceEnvironment(process.env, {
  defaultPort: 8086,
  serviceName: SERVICE_NAME,
});
