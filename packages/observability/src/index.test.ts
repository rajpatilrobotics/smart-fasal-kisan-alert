import { describe, expect, it } from 'vitest';

import {
  allowlistedLogMetadata,
  createSafeHttpRequestLogger,
  getPlatformTracer,
  inSpan,
} from './index';

describe('inSpan', () => {
  it('returns the wrapped result without requiring an exporter', async () => {
    await expect(
      inSpan(getPlatformTracer('test'), 'work', () => Promise.resolve(42)),
    ).resolves.toBe(42);
  });

  it('preserves failures after recording them', async () => {
    const failure = new Error('expected test failure');
    await expect(
      inSpan(getPlatformTracer('test'), 'failed-work', () => Promise.reject(failure)),
    ).rejects.toBe(failure);
  });
});

describe('safe observability metadata', () => {
  it('keeps only bounded allowlisted metadata', () => {
    expect(
      allowlistedLogMetadata({
        routeTemplate: '/v1/rsk/protected-disclosures',
        statusCode: 403,
        problemCode: 'AUTHORIZATION_DENIED',
        authorization: 'Bearer secret-token',
        appCheck: 'secret-app-check',
        body: { contact: 'protected' },
        sql: 'select protected_contact',
        error: new Error('raw provider secret'),
      }),
    ).toEqual({
      routeTemplate: '/v1/rsk/protected-disclosures',
      statusCode: 403,
      problemCode: 'AUTHORIZATION_DENIED',
    });
  });

  it('drops non-primitive values even when the key is allowlisted', () => {
    expect(allowlistedLogMetadata({ correlationId: { nested: 'not allowed' } })).toEqual({});
  });

  it('drops malformed or unbounded values even when their field name is allowlisted', () => {
    expect(
      allowlistedLogMetadata({
        routeTemplate: '/v1/farmer/bootstrap?token=secret',
        statusCode: 999,
        latencyMs: Number.POSITIVE_INFINITY,
        environment: 'secret-environment-value',
        problemCode: 'secret raw exception',
      }),
    ).toEqual({});
  });

  it('writes one bounded request fact without client build, headers, body, URL query or errors', () => {
    const lines: string[] = [];
    const logger = createSafeHttpRequestLogger({
      buildId: 'domain-api-1.0.0',
      sink: { write: (line) => lines.push(line) },
    });
    const unsafeInput = {
      route: '/v1/rsk/protected-disclosures',
      method: 'POST',
      statusCode: 403,
      durationMs: 12.5,
      environment: 'staging',
      correlationId: '10000000-0000-4000-8000-000000000001',
      actorClass: 'STAFF',
      problemCode: 'AUTHORIZATION_DENIED',
      authorization: 'Bearer secret',
      body: { contact: 'protected' },
      rawError: new Error('provider details'),
    } as unknown as Parameters<typeof logger.write>[0];

    logger.write(unsafeInput);

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '{}')).toEqual({
      event: 'http.request.completed',
      routeTemplate: '/v1/rsk/protected-disclosures',
      operation: 'POST',
      statusCode: 403,
      latencyMs: 12.5,
      environment: 'staging',
      correlationId: '10000000-0000-4000-8000-000000000001',
      actorClass: 'STAFF',
      problemCode: 'AUTHORIZATION_DENIED',
      buildId: 'domain-api-1.0.0',
    });
    expect(lines[0]).not.toMatch(/Bearer|contact|provider details|rawError|secret/u);
  });

  it('never changes a request outcome when the sink fails', () => {
    const logger = createSafeHttpRequestLogger({
      sink: {
        write() {
          throw new Error('raw logging backend failure');
        },
      },
    });

    expect(() => {
      logger.write({
        route: '/health/live',
        method: 'GET',
        statusCode: 200,
        durationMs: 1,
        environment: 'local',
        correlationId: '10000000-0000-4000-8000-000000000001',
      });
    }).not.toThrow();
  });
});
