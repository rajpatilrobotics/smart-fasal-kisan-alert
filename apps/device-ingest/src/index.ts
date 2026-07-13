import { buildDeviceIngestApp, MemoryDeviceCredentialStore } from './app.js';
import { SERVICE_CONFIG } from './config.js';

const credentials = new MemoryDeviceCredentialStore();
const configuredSecret = process.env['DEVICE_INGEST_DEMO_SECRET'];
if (configuredSecret !== undefined) {
  credentials.put('demo-device', 'demo-channel', configuredSecret);
}

const app = buildDeviceIngestApp({ credentials });
await app.listen({ host: SERVICE_CONFIG.HOST, port: SERVICE_CONFIG.PORT });
