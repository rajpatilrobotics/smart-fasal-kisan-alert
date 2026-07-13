import { SpanStatusCode, trace, type Tracer } from '@opentelemetry/api';

export function getPlatformTracer(scope: string): Tracer {
  return trace.getTracer(`smart-fasal/${scope}`);
}

export async function inSpan<T>(tracer: Tracer, name: string, work: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await work();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error('Unknown span failure'));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
