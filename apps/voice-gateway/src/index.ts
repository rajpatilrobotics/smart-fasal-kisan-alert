import { startService } from '@smart-fasal/service-runtime';

import { SERVICE_CONFIG } from './config.js';

await startService({
  host: SERVICE_CONFIG.HOST,
  port: SERVICE_CONFIG.PORT,
  serviceName: SERVICE_CONFIG.serviceName,
});
