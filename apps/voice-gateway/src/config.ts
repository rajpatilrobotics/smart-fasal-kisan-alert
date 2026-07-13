import { parseServiceEnvironment } from '@smart-fasal/config';

export const SERVICE_NAME = 'voice-gateway' as const;
export const SERVICE_CONFIG = parseServiceEnvironment(process.env, {
  defaultPort: 8087,
  serviceName: SERVICE_NAME,
});
