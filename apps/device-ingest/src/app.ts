import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { buildService } from '@smart-fasal/service-runtime';

import { SERVICE_NAME } from './config.js';

const MAX_BATCH_BYTES = 256 * 1024;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

interface Challenge {
  readonly challengeId: string;
  readonly deviceId: string;
  readonly channelId: string;
  readonly expiresAt: number;
  readonly serverNonce: string;
  used: boolean;
}

interface Receipt {
  readonly receiptId: string;
  readonly batchId: string;
  state: 'PENDING' | 'DURABLY_ACCEPTED' | 'ALREADY_ACCEPTED' | 'REJECTED';
  readonly trustState: 'PENDING';
  readonly explicitlyNotAgronomicTrust: true;
  readonly receivedAt: string;
}

interface DeviceObservation {
  readonly observationId: string;
  readonly observedAt: string;
  readonly signal: string;
  readonly value: string;
  readonly unit: string;
}

interface DeviceBatchRequest {
  readonly batchId: string;
  readonly deviceId: string;
  readonly channelId: string;
  readonly challengeId: string;
  readonly payloadDigest: string;
  readonly signature: string;
  readonly observations: readonly DeviceObservation[];
}

export interface DeviceCredentialStore {
  secretFor(deviceId: string, channelId: string): Promise<string | undefined>;
}

export class MemoryDeviceCredentialStore implements DeviceCredentialStore {
  readonly #secrets = new Map<string, string>();

  put(deviceId: string, channelId: string, secret: string): void {
    this.#secrets.set(`${deviceId}:${channelId}`, secret);
  }

  async secretFor(deviceId: string, channelId: string): Promise<string | undefined> {
    await Promise.resolve();
    return this.#secrets.get(`${deviceId}:${channelId}`);
  }
}

export function buildDeviceIngestApp(options: {
  readonly credentials: DeviceCredentialStore;
  readonly now?: () => Date;
}) {
  const now = options.now ?? (() => new Date());
  const app = buildService({ serviceName: SERVICE_NAME });
  const challenges = new Map<string, Challenge>();
  const receipts = new Map<string, Receipt>();
  const payloadDigests = new Map<string, string>();

  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: MAX_BATCH_BYTES },
    (_request, body, done) => {
      try {
        const text = body.toString('utf8');
        const parsed = JSON.parse(text) as unknown;
        done(null, parsed);
      } catch (error) {
        done(error as Error);
      }
    },
  );

  app.post('/ingest/v1/challenges', async (request, reply) => {
    const body = parseChallenge(request.body);
    const secret = await options.credentials.secretFor(body.deviceId, body.channelId);
    if (secret === undefined) return reply.code(403).send(problem('AUTHORIZATION_DENIED'));
    const challengeId = randomUUID();
    const serverNonce = randomBytes(24).toString('base64url');
    const expiresAt = now().getTime() + CHALLENGE_TTL_MS;
    challenges.set(challengeId, {
      challengeId,
      deviceId: body.deviceId,
      channelId: body.channelId,
      expiresAt,
      serverNonce,
      used: false,
    });
    return {
      challengeId,
      serverNonce,
      expiresAt: new Date(expiresAt).toISOString(),
      algorithm: 'SFKA-HMAC-SHA256-v1',
    };
  });

  app.post('/ingest/v1/batches', async (request, reply) => {
    const body = parseBatch(request.body);
    const existing = receipts.get(body.batchId);
    if (existing !== undefined) {
      existing.state = 'ALREADY_ACCEPTED';
      return existing;
    }
    if (
      payloadDigests.get(body.batchId) !== undefined &&
      payloadDigests.get(body.batchId) !== body.payloadDigest
    ) {
      return reply.code(409).send(problem('REPLAY_DETECTED'));
    }
    const challenge = challenges.get(body.challengeId);
    if (
      challenge === undefined ||
      challenge.used ||
      challenge.expiresAt <= now().getTime() ||
      challenge.deviceId !== body.deviceId ||
      challenge.channelId !== body.channelId
    ) {
      return reply.code(409).send(problem('CHALLENGE_EXPIRED'));
    }
    const secret = await options.credentials.secretFor(body.deviceId, body.channelId);
    if (secret === undefined || !validSignature(body, secret)) {
      return reply.code(401).send(problem('SIGNATURE_INVALID'));
    }
    challenge.used = true;
    payloadDigests.set(body.batchId, body.payloadDigest);
    const receipt: Receipt = {
      receiptId: randomUUID(),
      batchId: body.batchId,
      state: 'DURABLY_ACCEPTED',
      trustState: 'PENDING',
      explicitlyNotAgronomicTrust: true,
      receivedAt: now().toISOString(),
    };
    receipts.set(body.batchId, receipt);
    reply.code(202);
    return receipt;
  });

  app.get<{ Params: { receiptId: string } }>('/ingest/v1/receipts/:receiptId', (request, reply) => {
    const receipt = [...receipts.values()].find(
      (candidate) => candidate.receiptId === request.params.receiptId,
    );
    if (receipt === undefined) return reply.code(404).send(problem('AUTHORIZATION_DENIED'));
    return receipt;
  });

  return app;
}

function validSignature(body: DeviceBatchRequest, secret: string): boolean {
  const expectedDigest = `sha256:${createHmac('sha256', secret)
    .update(
      stableJson({
        batchId: body.batchId,
        channelId: body.channelId,
        challengeId: body.challengeId,
        deviceId: body.deviceId,
        observations: body.observations,
      }),
    )
    .digest('hex')}`;
  if (expectedDigest !== body.payloadDigest) return false;
  const expectedSignature = `sha256=${createHmac('sha256', secret).update(body.payloadDigest).digest('hex')}`;
  return safeEqual(expectedSignature, body.signature);
}

function parseChallenge(value: unknown): {
  deviceId: string;
  channelId: string;
  clientNonce: string;
} {
  if (!isRecord(value)) throw new Error('INVALID_CHALLENGE');
  const { deviceId, channelId, clientNonce } = value;
  if (
    !boundedString(deviceId, 1, 160) ||
    !boundedString(channelId, 1, 160) ||
    !boundedString(clientNonce, 16, 128)
  ) {
    throw new Error('INVALID_CHALLENGE');
  }
  return { deviceId, channelId, clientNonce };
}

function parseBatch(value: unknown): DeviceBatchRequest {
  if (!isRecord(value)) throw new Error('INVALID_BATCH');
  const observations = value['observations'];
  if (!Array.isArray(observations) || observations.length < 1 || observations.length > 500) {
    throw new Error('INVALID_BATCH');
  }
  const batch = {
    batchId: value['batchId'],
    deviceId: value['deviceId'],
    channelId: value['channelId'],
    challengeId: value['challengeId'],
    payloadDigest: value['payloadDigest'],
    signature: value['signature'],
    observations: observations.map(parseObservation),
  };
  if (
    !boundedString(batch.batchId, 36, 36) ||
    !boundedString(batch.deviceId, 1, 160) ||
    !boundedString(batch.channelId, 1, 160) ||
    !boundedString(batch.challengeId, 36, 36) ||
    !/^sha256:[0-9a-f]{64}$/u.test(String(batch.payloadDigest)) ||
    !/^sha256=[0-9a-f]{64}$/u.test(String(batch.signature))
  ) {
    throw new Error('INVALID_BATCH');
  }
  return batch as DeviceBatchRequest;
}

function parseObservation(value: unknown): DeviceObservation {
  if (!isRecord(value)) throw new Error('INVALID_OBSERVATION');
  const observation = {
    observationId: value['observationId'],
    observedAt: value['observedAt'],
    signal: value['signal'],
    value: value['value'],
    unit: value['unit'],
  };
  if (
    !boundedString(observation.observationId, 36, 36) ||
    !boundedString(observation.observedAt, 20, 40) ||
    !boundedString(observation.signal, 1, 80) ||
    !boundedString(observation.value, 1, 80) ||
    !boundedString(observation.unit, 1, 80)
  ) {
    throw new Error('INVALID_OBSERVATION');
  }
  return observation as DeviceObservation;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function problem(code: string) {
  return {
    type: `https://smart-fasal.invalid/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title: code,
    status: code === 'SIGNATURE_INVALID' ? 401 : code === 'AUTHORIZATION_DENIED' ? 403 : 409,
    code,
    correlationId: randomUUID(),
    retryable: false,
    fieldErrors: [],
  };
}
