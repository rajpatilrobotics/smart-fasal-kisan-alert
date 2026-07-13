import { canonicalize } from 'json-canonicalize';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface EncryptedEnvelope {
  readonly algorithm: 'AES-GCM';
  readonly iv: string;
  readonly ciphertext: string;
  readonly aadDigest: string;
}

export interface RecordAad {
  readonly partition: string;
  readonly store: string;
  readonly recordId: string;
  readonly schemaVersion: number;
  readonly index: Readonly<Record<string, boolean | number | string | null>>;
}

function webCrypto(): Crypto {
  const crypto = (globalThis as { crypto?: Crypto }).crypto;
  if (crypto?.subtle === undefined) throw new Error('WEB_CRYPTO_UNAVAILABLE');
  return crypto;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function aadBytes(aad: RecordAad): Uint8Array<ArrayBuffer> {
  return encoder.encode(canonicalize(aad));
}

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await webCrypto().subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256CanonicalJson(value: unknown): Promise<string> {
  return `sha256:${await sha256Hex(encoder.encode(canonicalize(value)))}`;
}

export async function createPartitionDatabaseName(
  environment: string,
  subjectDeviceBindingId: string,
  deviceMode: 'PERSONAL' | 'TRUSTED_FAMILY' | 'RSK_ASSISTED',
): Promise<string> {
  if (!/^[a-z][a-z0-9-]{1,31}$/u.test(environment)) throw new TypeError('ENVIRONMENT_INVALID');
  if (subjectDeviceBindingId.length < 8 || subjectDeviceBindingId.length > 160) {
    throw new TypeError('SUBJECT_DEVICE_BINDING_INVALID');
  }
  const digest = await sha256Hex(
    encoder.encode(`${environment}\u0000${subjectDeviceBindingId}\u0000${deviceMode}`),
  );
  return `smart-fasal-farmer-${digest}`;
}

export async function generatePartitionKey(): Promise<CryptoKey> {
  return webCrypto().subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptJson(
  key: CryptoKey,
  aad: RecordAad,
  value: unknown,
): Promise<EncryptedEnvelope> {
  const serialized = JSON.stringify(value) as string | undefined;
  if (serialized === undefined) throw new TypeError('PAYLOAD_NOT_SERIALIZABLE');
  const iv = webCrypto().getRandomValues(new Uint8Array(12));
  const additionalData = aadBytes(aad);
  const ciphertext = await webCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
    key,
    encoder.encode(serialized),
  );
  return {
    algorithm: 'AES-GCM',
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    aadDigest: `sha256:${await sha256Hex(additionalData)}`,
  };
}

export async function decryptJson<Value>(
  key: CryptoKey,
  aad: RecordAad,
  envelope: EncryptedEnvelope,
): Promise<Value> {
  const serializedAlgorithm: unknown = (
    envelope as EncryptedEnvelope & { readonly algorithm?: unknown }
  ).algorithm;
  if (serializedAlgorithm !== 'AES-GCM') throw new Error('ENCRYPTION_ALGORITHM_UNSUPPORTED');
  const additionalData = aadBytes(aad);
  const expectedDigest = `sha256:${await sha256Hex(additionalData)}`;
  if (envelope.aadDigest !== expectedDigest) throw new Error('ENCRYPTED_RECORD_AAD_MISMATCH');
  const plaintext = await webCrypto().subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64UrlToBytes(envelope.iv),
      additionalData,
      tagLength: 128,
    },
    key,
    base64UrlToBytes(envelope.ciphertext),
  );
  return JSON.parse(decoder.decode(plaintext)) as Value;
}
