import { describe, expect, it } from 'vitest';

import { MemoryProviderSink, SinkOnlyAlertDeliveryAdapter } from './index';

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

  it.each(['sms', 'whatsapp', 'push'] as const)(
    'queues %s advisory alerts only to the local memory sink',
    (channel) => {
      const sink = new MemoryProviderSink('test');
      const adapter = new SinkOnlyAlertDeliveryAdapter(sink, 'test');
      const receipt = adapter.queue({
        alertId: '019f5678-1234-7000-8000-000000000101',
        advisoryId: '019f5678-1234-7000-8000-000000000102',
        body: 'Recorded demo advisory only',
        channel,
        consentConfirmed: true,
        dataMode: 'RECORDED',
        destinationRef: `allowlisted-${channel}-recipient`,
        idempotencyKey: `alert-${channel}-1`,
        recipientAllowlisted: true,
      });

      expect(receipt).toMatchObject({
        status: 'SINK_ACCEPTED',
        provider: 'memory-sink',
        channel,
      });
      expect(sink.messages).toEqual([
        expect.objectContaining({
          channel,
          destination: `allowlisted-${channel}-recipient`,
          idempotencyKey: `alert-${channel}-1`,
        }),
      ]);
    },
  );

  it('blocks external-style alert delivery without consent or an allowlisted recipient', () => {
    const sink = new MemoryProviderSink('test');
    const adapter = new SinkOnlyAlertDeliveryAdapter(sink, 'test');
    const base = {
      alertId: '019f5678-1234-7000-8000-000000000103',
      body: 'Do not send externally',
      channel: 'sms' as const,
      dataMode: 'RECORDED' as const,
      destinationRef: 'not-allowlisted',
      idempotencyKey: 'blocked-alert-1',
    };

    expect(
      adapter.queue({
        ...base,
        consentConfirmed: false,
        recipientAllowlisted: true,
      }),
    ).toMatchObject({ status: 'BLOCKED', reason: 'CONSENT_REQUIRED' });
    expect(
      adapter.queue({
        ...base,
        consentConfirmed: true,
        recipientAllowlisted: false,
      }),
    ).toMatchObject({ status: 'BLOCKED', reason: 'RECIPIENT_NOT_ALLOWLISTED' });
    expect(sink.messages).toHaveLength(0);
  });

  it('cannot run as a production delivery adapter', () => {
    expect(
      () => new SinkOnlyAlertDeliveryAdapter(new MemoryProviderSink('test'), 'production'),
    ).toThrow('SinkOnlyAlertDeliveryAdapter cannot run in production');
  });
});
