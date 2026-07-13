import { createSafeHttpRequestLogger } from '@smart-fasal/observability';

import { buildMpQueryApi } from './app.js';
import { SERVICE_CONFIG } from './config.js';

const requestLogger = createSafeHttpRequestLogger({
  sink: {
    write(line) {
      process.stdout.write(line);
    },
  },
});

const app = buildMpQueryApi({
  environment: SERVICE_CONFIG.environment,
  origins: SERVICE_CONFIG.mpOrigins,
  appIds: SERVICE_CONFIG.mpAppIds,
  runtimeMode: process.env['NODE_ENV'] === 'production' ? 'production' : 'development',
  requestLogger,
});

const close = () => {
  void app.close();
};
process.once('SIGINT', close);
process.once('SIGTERM', close);
app.addHook('onClose', () => {
  process.off('SIGINT', close);
  process.off('SIGTERM', close);
});

await app.listen({ host: SERVICE_CONFIG.HOST, port: SERVICE_CONFIG.PORT });
