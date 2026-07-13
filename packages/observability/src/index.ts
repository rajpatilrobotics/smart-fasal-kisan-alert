import { SpanStatusCode, trace, type Tracer } from '@opentelemetry/api';

export function getPlatformTracer(scope: string): Tracer {
  return trace.getTracer(`smart-fasal/${scope}`);
}

const ALLOWED_LOG_FIELDS = new Set([
  'routeTemplate',
  'operation',
  'statusCode',
  'latencyMs',
  'actorClass',
  'referenceHash',
  'environment',
  'problemCode',
  'correlationId',
  'traceId',
  'buildId',
]);

export type SafeLogValue = string | number | boolean;
export type SafeLogRecord = Readonly<Record<string, SafeLogValue>>;

const SAFE_STRING_FIELDS: Readonly<Record<string, (value: string) => boolean>> = {
  routeTemplate: (value) =>
    value.length <= 200 &&
    value.startsWith('/') &&
    !value.includes('?') &&
    !value.includes('#') &&
    !/\s/u.test(value),
  operation: (value) => value.length <= 120 && /^[A-Za-z0-9._:/{}* -]+$/u.test(value),
  actorClass: (value) =>
    ['FARMER', 'STAFF', 'MP_STAFF', 'SYSTEM', 'DEVICE', 'PROVIDER'].includes(value),
  referenceHash: (value) => /^(?:sha256:)?[0-9a-f]{64}$/u.test(value),
  environment: (value) => ['local', 'preview', 'staging', 'demo', 'production'].includes(value),
  problemCode: (value) => /^[A-Z][A-Z0-9_]{0,79}$/u.test(value),
  correlationId: (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value),
  traceId: (value) => /^[0-9a-f]{32}$/u.test(value),
  buildId: (value) => value.length <= 120 && /^[A-Za-z0-9][A-Za-z0-9._:+-]*$/u.test(value),
};

export function allowlistedLogMetadata(input: Readonly<Record<string, unknown>>): SafeLogRecord {
  const output: Record<string, SafeLogValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_LOG_FIELDS.has(key)) continue;
    if (typeof value === 'string' && SAFE_STRING_FIELDS[key]?.(value) === true) {
      output[key] = value;
    } else if (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      ((key === 'statusCode' && value >= 100 && value <= 599) ||
        (key === 'latencyMs' && value >= 0 && value <= 86_400_000))
    ) {
      output[key] = value;
    }
  }
  return Object.freeze(output);
}

export interface SafeHttpRequestRecord {
  readonly route: string;
  readonly method: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly environment: string;
  readonly correlationId: string;
  readonly actorClass?: string;
  readonly problemCode?: string;
}

export interface SafeLogLineSink {
  write(line: string): void;
}

/** Maps an API's typed completion fact to one bounded JSON line and never throws into a request. */
export function createSafeHttpRequestLogger(options: {
  readonly sink: SafeLogLineSink;
  readonly buildId?: string;
}): { write(record: SafeHttpRequestRecord): void } {
  return Object.freeze({
    write(record: SafeHttpRequestRecord) {
      const metadata = allowlistedLogMetadata({
        routeTemplate: record.route,
        operation: record.method,
        statusCode: record.statusCode,
        latencyMs: record.durationMs,
        environment: record.environment,
        correlationId: record.correlationId,
        ...(record.actorClass === undefined ? {} : { actorClass: record.actorClass }),
        ...(record.problemCode === undefined ? {} : { problemCode: record.problemCode }),
        ...(options.buildId === undefined ? {} : { buildId: options.buildId }),
      });
      try {
        options.sink.write(`${JSON.stringify({ event: 'http.request.completed', ...metadata })}\n`);
      } catch {
        // Observability must never alter the request outcome or expose a raw sink failure.
      }
    },
  });
}

export async function inSpan<T>(tracer: Tracer, name: string, work: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await work();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.addEvent('operation.failure', { 'error.type': 'UNEXPECTED_OPERATION_FAILURE' });
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Operation failed' });
      throw error;
    } finally {
      span.end();
    }
  });
}
