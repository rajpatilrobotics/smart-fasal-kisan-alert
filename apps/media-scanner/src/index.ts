import { startService } from '@smart-fasal/service-runtime';

import { SERVICE_CONFIG } from './config.js';
import { WorkerLifecycle } from './lifecycle.js';

const worker = new WorkerLifecycle();

await startService({
  host: SERVICE_CONFIG.HOST,
  onStart: () => {
    worker.start();
  },
  onStop: () => {
    worker.stop();
  },
  readiness: () => worker.isReady,
  port: SERVICE_CONFIG.PORT,
  serviceName: SERVICE_CONFIG.serviceName,
});
