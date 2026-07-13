import { buildMediaScannerApp } from './app.js';
import { SERVICE_CONFIG } from './config.js';
import { WorkerLifecycle } from './lifecycle.js';

const worker = new WorkerLifecycle();

const app = buildMediaScannerApp({
  serviceName: SERVICE_CONFIG.serviceName,
  readiness: () => worker.isReady,
});
worker.start();
app.addHook('onClose', () => {
  worker.stop();
});
const close = () => void app.close();
process.once('SIGINT', close);
process.once('SIGTERM', close);
app.addHook('onClose', () => {
  process.off('SIGINT', close);
  process.off('SIGTERM', close);
});
await app.listen({ host: SERVICE_CONFIG.HOST, port: SERVICE_CONFIG.PORT });
