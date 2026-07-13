import Dexie, { type Table } from 'dexie';

import type { DeviceMode } from '@smart-fasal/contracts/schemas';

import { decryptJson, encryptJson, type EncryptedEnvelope } from './crypto.js';

export interface PartitionKeyContext {
  readonly databaseName: string;
  readonly environment: string;
  readonly subjectDeviceBindingId: string;
  readonly deviceMode: DeviceMode;
}

export interface PartitionKeyProvider {
  readonly protection: 'DEVICE_WRAPPED';
  unlock(context: PartitionKeyContext): Promise<CryptoKey>;
  lock(context: PartitionKeyContext): void;
}

export interface PartitionWrappingKeySource {
  unlock(context: PartitionKeyContext): Promise<CryptoKey>;
  lock(context: PartitionKeyContext): void;
}

export interface PartitionKeyEnvelopeStore {
  load(partition: string): Promise<EncryptedEnvelope | undefined>;
  putIfAbsent(partition: string, envelope: EncryptedEnvelope): Promise<EncryptedEnvelope>;
}

interface PartitionKeyEnvelopeRow {
  readonly partition: string;
  readonly envelope: EncryptedEnvelope;
}

class PartitionKeyEnvelopeDatabase extends Dexie {
  envelopes!: Table<PartitionKeyEnvelopeRow, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({ envelopes: '&partition' });
  }
}

/** Stores ciphertext only in an identity-neutral IndexedDB; the wrapping key stays external. */
export class IndexedDbPartitionKeyEnvelopeStore implements PartitionKeyEnvelopeStore {
  readonly #database: PartitionKeyEnvelopeDatabase;

  constructor(databaseName = 'smart-fasal-device-wrapped-keys-v1') {
    this.#database = new PartitionKeyEnvelopeDatabase(databaseName);
  }

  load(partition: string): Promise<EncryptedEnvelope | undefined> {
    return this.#database.envelopes.get(partition).then((row) => row?.envelope);
  }

  async putIfAbsent(partition: string, envelope: EncryptedEnvelope): Promise<EncryptedEnvelope> {
    return this.#database.transaction('rw', this.#database.envelopes, async () => {
      const existing = await this.#database.envelopes.get(partition);
      if (existing !== undefined) return existing.envelope;
      await this.#database.envelopes.add({ partition, envelope });
      return envelope;
    });
  }
}

interface WrappedKeyPayload {
  readonly rawKeyBytes: readonly number[];
}

function webCrypto(): Crypto {
  const crypto = (globalThis as { crypto?: Crypto }).crypto;
  if (crypto?.subtle === undefined) throw new Error('WEB_CRYPTO_UNAVAILABLE');
  return crypto;
}

function assertAesGcmKey(key: CryptoKey, usage: 'partition' | 'wrapping'): void {
  if (
    key.type !== 'secret' ||
    key.algorithm.name !== 'AES-GCM' ||
    !key.usages.includes('encrypt') ||
    !key.usages.includes('decrypt')
  ) {
    throw new Error(`${usage.toUpperCase()}_KEY_INVALID`);
  }
  if (key.extractable) throw new Error(`${usage.toUpperCase()}_KEY_MUST_BE_OPAQUE`);
}

function keyAad(context: PartitionKeyContext) {
  return {
    partition: context.databaseName,
    store: 'deviceWrappedPartitionKeys',
    recordId: context.databaseName,
    schemaVersion: 1,
    index: {
      deviceMode: context.deviceMode,
      environment: context.environment,
      subjectDeviceBindingId: context.subjectDeviceBindingId,
    },
  } as const;
}

async function importOpaquePartitionKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const key = await webCrypto().subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
  assertAesGcmKey(key, 'partition');
  return key;
}

async function unwrapPartitionKey(
  wrappingKey: CryptoKey,
  context: PartitionKeyContext,
  envelope: EncryptedEnvelope,
): Promise<CryptoKey> {
  const payload = await decryptJson<WrappedKeyPayload>(wrappingKey, keyAad(context), envelope);
  if (
    !Array.isArray(payload.rawKeyBytes) ||
    payload.rawKeyBytes.length !== 32 ||
    payload.rawKeyBytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)
  ) {
    throw new Error('PARTITION_KEY_ENVELOPE_INVALID');
  }
  const raw = Uint8Array.from(payload.rawKeyBytes);
  try {
    return await importOpaquePartitionKey(raw);
  } finally {
    raw.fill(0);
  }
}

/**
 * Persists only an AES-GCM envelope. A platform/device-auth adapter must provide the
 * non-exportable wrapping key after the active identity is unlocked.
 */
export class DeviceWrappedPartitionKeyProvider implements PartitionKeyProvider {
  readonly protection = 'DEVICE_WRAPPED' as const;
  readonly #cache = new Map<string, CryptoKey>();

  constructor(
    private readonly envelopeStore: PartitionKeyEnvelopeStore,
    private readonly wrappingKeySource: PartitionWrappingKeySource,
  ) {}

  async unlock(context: PartitionKeyContext): Promise<CryptoKey> {
    const cached = this.#cache.get(context.databaseName);
    if (cached !== undefined) return cached;
    const wrappingKey = await this.wrappingKeySource.unlock(context);
    assertAesGcmKey(wrappingKey, 'wrapping');
    let envelope = await this.envelopeStore.load(context.databaseName);
    if (envelope === undefined) {
      const generated = await webCrypto().subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
      );
      const raw = new Uint8Array(await webCrypto().subtle.exportKey('raw', generated));
      const rawKeyBytes = [...raw];
      try {
        const candidate = await encryptJson(wrappingKey, keyAad(context), {
          rawKeyBytes,
        });
        envelope = await this.envelopeStore.putIfAbsent(context.databaseName, candidate);
      } finally {
        raw.fill(0);
        rawKeyBytes.fill(0);
      }
    }
    try {
      const key = await unwrapPartitionKey(wrappingKey, context, envelope);
      this.#cache.set(context.databaseName, key);
      return key;
    } catch {
      throw new Error('PARTITION_KEY_UNLOCK_FAILED');
    }
  }

  lock(context: PartitionKeyContext): void {
    this.#cache.delete(context.databaseName);
    this.wrappingKeySource.lock(context);
  }
}

export function assertOpaquePartitionKey(key: CryptoKey): void {
  assertAesGcmKey(key, 'partition');
}
