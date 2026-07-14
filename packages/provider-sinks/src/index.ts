export interface SinkMessage {
  channel: 'sms' | 'whatsapp' | 'push' | 'voice';
  destination: string;
  body: string;
  idempotencyKey: string;
}

export interface SinkReceipt {
  sink: 'memory';
  idempotencyKey: string;
  acceptedAt: string;
}

export class MemoryProviderSink {
  readonly messages: SinkMessage[] = [];

  constructor(environment = process.env['NODE_ENV']) {
    if (environment === 'production') {
      throw new Error('MemoryProviderSink cannot run in production');
    }
  }

  send(message: SinkMessage): SinkReceipt {
    this.messages.push(structuredClone(message));
    return {
      sink: 'memory',
      idempotencyKey: message.idempotencyKey,
      acceptedAt: new Date().toISOString(),
    };
  }
}

export type AlertDeliveryChannel = 'sms' | 'whatsapp' | 'push';

export interface AlertDeliveryRequest {
  readonly alertId: string;
  readonly advisoryId?: string;
  readonly channel: AlertDeliveryChannel;
  /** Destination is a test/sandbox reference in local/demo, never a public recipient. */
  readonly destinationRef: string;
  readonly body: string;
  readonly idempotencyKey: string;
  readonly consentConfirmed: boolean;
  readonly recipientAllowlisted: boolean;
  readonly dataMode: 'LIVE' | 'RECORDED' | 'SIMULATED';
}

export type AlertDeliveryReceipt =
  | {
      readonly status: 'SINK_ACCEPTED';
      readonly provider: 'memory-sink';
      readonly channel: AlertDeliveryChannel;
      readonly alertId: string;
      readonly idempotencyKey: string;
      readonly acceptedAt: string;
    }
  | {
      readonly status: 'BLOCKED';
      readonly provider: 'none';
      readonly channel: AlertDeliveryChannel;
      readonly alertId: string;
      readonly idempotencyKey: string;
      readonly reason:
        'CONSENT_REQUIRED' | 'RECIPIENT_NOT_ALLOWLISTED' | 'EXTERNAL_DELIVERY_DISABLED';
    };

export class SinkOnlyAlertDeliveryAdapter {
  constructor(
    private readonly sink = new MemoryProviderSink('test'),
    environment = process.env['NODE_ENV'],
  ) {
    if (environment === 'production') {
      throw new Error('SinkOnlyAlertDeliveryAdapter cannot run in production');
    }
  }

  queue(request: AlertDeliveryRequest): AlertDeliveryReceipt {
    if (!request.consentConfirmed) {
      return {
        status: 'BLOCKED',
        provider: 'none',
        channel: request.channel,
        alertId: request.alertId,
        idempotencyKey: request.idempotencyKey,
        reason: 'CONSENT_REQUIRED',
      };
    }
    if (!request.recipientAllowlisted) {
      return {
        status: 'BLOCKED',
        provider: 'none',
        channel: request.channel,
        alertId: request.alertId,
        idempotencyKey: request.idempotencyKey,
        reason: 'RECIPIENT_NOT_ALLOWLISTED',
      };
    }
    const receipt = this.sink.send({
      body: request.body,
      channel: request.channel,
      destination: request.destinationRef,
      idempotencyKey: request.idempotencyKey,
    });
    return {
      status: 'SINK_ACCEPTED',
      provider: 'memory-sink',
      channel: request.channel,
      alertId: request.alertId,
      idempotencyKey: receipt.idempotencyKey,
      acceptedAt: receipt.acceptedAt,
    };
  }
}
