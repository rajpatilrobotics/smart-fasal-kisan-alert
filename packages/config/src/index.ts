import { z } from 'zod';

export const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']);

export const serviceEnvironmentSchema = z
  .object({
    NODE_ENV: nodeEnvironmentSchema.default('development'),
    HOST: z.string().trim().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65_535),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_URL: z.url().startsWith('postgres').optional(),
  })
  .strict();

export interface ServiceConfiguration extends z.infer<typeof serviceEnvironmentSchema> {
  serviceName: string;
}

export function parseServiceEnvironment(
  environment: Record<string, string | undefined>,
  defaults: { defaultPort: number; serviceName: string },
): ServiceConfiguration {
  const parsed = serviceEnvironmentSchema.parse({
    DATABASE_URL: environment['DATABASE_URL'],
    HOST: environment['HOST'],
    LOG_LEVEL: environment['LOG_LEVEL'],
    NODE_ENV: environment['NODE_ENV'],
    PORT: environment['PORT'] ?? defaults.defaultPort,
  });

  return { ...parsed, serviceName: z.string().trim().min(1).parse(defaults.serviceName) };
}
