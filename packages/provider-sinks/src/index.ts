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
