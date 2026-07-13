import {
  InMemoryVoiceProposalStore,
  InMemoryVoiceTicketStore,
  VoiceFailure,
  VoiceTransportService,
} from '@smart-fasal/voice';

import { buildVoiceGatewayApp } from './app.js';
import { SERVICE_CONFIG } from './config.js';

// M2 defines the real transport boundary. Until a deployment supplies Identity/RLS adapters,
// the executable fails closed and reports not-ready instead of inventing a working provider.
const unavailable = () =>
  new VoiceFailure('DEPENDENCY_UNAVAILABLE', { retryable: true, statusCode: 503 });
const tickets = new InMemoryVoiceTicketStore();
const proposals = new InMemoryVoiceProposalStore({
  executor: { execute: () => Promise.reject(unavailable()) },
  policy: { reauthorize: () => Promise.resolve(false) },
  registeredToolKeys: [],
});
const service = new VoiceTransportService({ tickets, proposals });

const app = await buildVoiceGatewayApp({
  authorizer: {
    authorizeHttp: () => Promise.reject(unavailable()),
    deriveVoiceSessionBinding: () => Promise.reject(unavailable()),
    reauthorizeRealtime: () => Promise.resolve(false),
  },
  service,
  websocketEndpoint:
    process.env['VOICE_WEBSOCKET_ENDPOINT'] ??
    `wss://localhost:${String(SERVICE_CONFIG.PORT)}/v1/realtime`,
  readiness: () => false,
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
