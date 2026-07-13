import { startService } from '@smart-fasal/service-runtime';

import { DOMAIN_WORKER_CONFIG, SERVICE_CONFIG } from './config.js';
import { createDomainWorkerRuntime } from './runtime.js';

const runtime = createDomainWorkerRuntime({ configuration: DOMAIN_WORKER_CONFIG });

await startService({
  host: SERVICE_CONFIG.HOST,
  onStart: () => runtime.start(),
  onStop: () => runtime.close(),
  readiness: () => runtime.readiness().state === 'READY',
  port: SERVICE_CONFIG.PORT,
  serviceName: SERVICE_CONFIG.serviceName,
});
