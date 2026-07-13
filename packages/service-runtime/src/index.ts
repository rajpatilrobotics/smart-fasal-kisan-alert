import Fastify, { type FastifyInstance } from 'fastify';
import { createHealthPayload, type HealthStatus } from '@smart-fasal/health';

export type { HealthPayload, HealthStatus } from '@smart-fasal/health';

export interface ServiceOptions {
  serviceName: string;
  readiness?: () => boolean | Promise<boolean>;
}

export interface StartServiceOptions extends ServiceOptions {
  host: string;
  port: number;
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
}

export function buildService({
  readiness = () => true,
  serviceName,
}: ServiceOptions): FastifyInstance {
  // Generic framework logging can serialize raw URLs and exception details. Each service attaches
  // the bounded allowlisted observability adapter explicitly when it has safe operation metadata.
  const app = Fastify({ logger: false });

  app.get('/health/live', (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return createHealthPayload(serviceName, 'ok');
  });

  app.get('/health/ready', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const ready = await readiness();
    const status: HealthStatus = ready ? 'ok' : 'not_ready';
    if (!ready) reply.code(503);
    return createHealthPayload(serviceName, status);
  });

  return app;
}

export async function startService({
  host,
  onStart = () => undefined,
  onStop = () => undefined,
  port,
  ...serviceOptions
}: StartServiceOptions): Promise<FastifyInstance> {
  const app = buildService(serviceOptions);

  app.addHook('onClose', onStop);

  const close = async () => {
    await app.close();
  };
  const handleSignal = () => {
    void close();
  };

  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
  app.addHook('onClose', () => {
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
  });
  await onStart();
  await app.listen({ host, port });
  return app;
}
