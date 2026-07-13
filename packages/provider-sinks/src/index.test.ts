import { describe, expect, it } from 'vitest';

import { MemoryProviderSink } from './index';

describe('MemoryProviderSink', () => {
  it('captures local messages without contacting a provider', () => {
    const sink = new MemoryProviderSink('test');
    sink.send({
      body: 'test only',
      channel: 'sms',
      destination: '+910000000000',
      idempotencyKey: 'test-message-1',
    });

    expect(sink.messages).toHaveLength(1);
  });

  it('cannot be enabled in production', () => {
    expect(() => new MemoryProviderSink('production')).toThrow();
  });
});
