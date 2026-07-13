import { describe, expect, it } from 'vitest';

import { getPlatformTracer, inSpan } from './index';

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
