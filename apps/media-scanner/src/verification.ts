import { createHash } from 'node:crypto';

import type { MediaPurpose } from '@smart-fasal/contracts/schemas';

export const MEDIA_SCANNER_VERSION = 'm2-media-verifier-v1' as const;

export type MediaMimeType =
  'image/jpeg' | 'image/png' | 'image/webp' | 'audio/webm;codecs=opus' | 'audio/wav';

export type MediaFailureCode =
  | 'GENERATION_MISMATCH'
  | 'SIZE_MISMATCH'
  | 'CHECKSUM_MISMATCH'
  | 'MIME_MISMATCH'
  | 'UNSUPPORTED_CODEC'
  | 'DECODER_REJECTED'
  | 'POLYGLOT_REJECTED'
  | 'MALWARE_REJECTED'
  | 'DIMENSION_LIMIT_EXCEEDED'
  | 'DURATION_LIMIT_EXCEEDED'
  | 'CONSENT_OR_ACCESS_VERSION_CHANGED';

export type ScannerAdapterName =
  'CONSENT_ACCESS_CHECKER' | 'DECODER' | 'LIFECYCLE_STORE' | 'MALWARE_SCANNER';

export type ScannerAdapterUnavailableCode =
  | 'CONSENT_ACCESS_CHECK_UNAVAILABLE'
  | 'DECODER_ADAPTER_UNAVAILABLE'
  | 'LIFECYCLE_STORE_UNAVAILABLE'
  | 'MALWARE_SCANNER_UNAVAILABLE';

export type AdapterAvailability =
  { status: 'AVAILABLE' } | { status: 'UNAVAILABLE'; code: ScannerAdapterUnavailableCode };

export type MediaScannerReadiness =
  | { ready: true }
  | {
      ready: false;
      code: 'MEDIA_SCANNER_ADAPTERS_UNAVAILABLE' | 'WORKER_STOPPED';
      missing: readonly ScannerAdapterName[];
      retryable: true;
    };

export interface MediaPurposePolicy {
  allowedMimeTypes: readonly MediaMimeType[];
  maximumBytes: number;
  maximumPixels?: number;
  maximumDurationSeconds?: number;
}

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const TEN_MIB = 10 * 1024 * 1024;
const FIFTEEN_MIB = 15 * 1024 * 1024;
const MAXIMUM_IMAGE_PIXELS = 40_000_000;

export const MEDIA_PURPOSE_POLICIES: Readonly<Record<MediaPurpose, MediaPurposePolicy>> =
  Object.freeze({
    CROP_HEALTH_IMAGE: {
      allowedMimeTypes: IMAGE_MIME_TYPES,
      maximumBytes: TEN_MIB,
      maximumPixels: MAXIMUM_IMAGE_PIXELS,
    },
    DIARY_MEDIA: {
      allowedMimeTypes: IMAGE_MIME_TYPES,
      maximumBytes: TEN_MIB,
      maximumPixels: MAXIMUM_IMAGE_PIXELS,
    },
    RSK_VISIT_EVIDENCE: {
      allowedMimeTypes: IMAGE_MIME_TYPES,
      maximumBytes: FIFTEEN_MIB,
      maximumPixels: MAXIMUM_IMAGE_PIXELS,
    },
    SENSOR_MAINTENANCE_EVIDENCE: {
      allowedMimeTypes: IMAGE_MIME_TYPES,
      maximumBytes: FIFTEEN_MIB,
      maximumPixels: MAXIMUM_IMAGE_PIXELS,
    },
    VOICE_OFFLINE_AUDIO: {
      allowedMimeTypes: ['audio/webm;codecs=opus', 'audio/wav'],
      maximumBytes: TEN_MIB,
      maximumDurationSeconds: 120,
    },
  });

export interface MediaVerificationInput {
  assetId: string;
  purpose: MediaPurpose;
  finalizedGeneration: string;
  objectGeneration: string;
  declaredSizeBytes: number;
  finalizedSizeBytes: number;
  expectedSha256: string;
  finalizedSha256: string;
  claimedMimeType: MediaMimeType;
  consentAccessVersion: number;
  bytes: Uint8Array;
}

export type ConsentAccessCheck =
  | { status: 'ALLOWED' }
  | { status: 'DENIED' }
  | { status: 'UNAVAILABLE'; code: 'CONSENT_ACCESS_CHECK_UNAVAILABLE' };

export interface ConsentAccessChecker {
  readonly availability: AdapterAvailability;
  checkCurrent(input: {
    assetId: string;
    purpose: MediaPurpose;
    consentAccessVersion: number;
  }): Promise<ConsentAccessCheck>;
}

export type MalwareScanResult =
  | { status: 'SAFE'; scannerVersion: string }
  | { status: 'UNSAFE' }
  | { status: 'UNAVAILABLE'; code: 'MALWARE_SCANNER_UNAVAILABLE' };

export interface MalwareScannerAdapter {
  readonly availability: AdapterAvailability;
  scan(input: { assetId: string; sha256: string; bytes: Uint8Array }): Promise<MalwareScanResult>;
}

export type DecoderResult =
  | {
      status: 'ACCEPTED';
      derivativeBytes: Uint8Array;
      derivativeMimeType: MediaMimeType;
      metadataStripped: true;
      decoderVersion: string;
      width?: number;
      height?: number;
      durationSeconds?: number;
      codec?: 'opus' | 'pcm';
    }
  | {
      status: 'REJECTED';
      failureCode:
        | 'UNSUPPORTED_CODEC'
        | 'DECODER_REJECTED'
        | 'DIMENSION_LIMIT_EXCEEDED'
        | 'DURATION_LIMIT_EXCEEDED';
    }
  | { status: 'UNAVAILABLE'; code: 'DECODER_ADAPTER_UNAVAILABLE' };

export interface MediaDecoderAdapter {
  readonly availability: AdapterAvailability;
  decode(input: {
    bytes: Uint8Array;
    mimeType: MediaMimeType;
    maximumPixels?: number;
    maximumDurationSeconds?: number;
  }): Promise<DecoderResult>;
}

export interface VerifiedMediaResult {
  outcome: 'VERIFIED';
  state: 'VERIFIED';
  sourceSha256: string;
  derivativeSha256: string;
  verifiedMimeType: MediaMimeType;
  verifiedSizeBytes: number;
  derivativeBytes: Uint8Array;
  scannerVersion: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  replayed: boolean;
}

export interface RejectedMediaResult {
  outcome: 'REJECTED';
  state: 'REJECTED';
  failureCode: MediaFailureCode;
  replayed: boolean;
}

type StoredVerificationResult =
  Omit<VerifiedMediaResult, 'replayed'> | Omit<RejectedMediaResult, 'replayed'>;

export type MediaVerificationResult =
  | VerifiedMediaResult
  | RejectedMediaResult
  | { outcome: 'IN_PROGRESS'; state: 'SCANNING'; replayed: true }
  | {
      outcome: 'UNAVAILABLE';
      state: 'FAILED_RETRYABLE';
      code: ScannerAdapterUnavailableCode;
      retryable: true;
      replayed: false;
    };

type ClaimedVerificationResult =
  | VerifiedMediaResult
  | RejectedMediaResult
  | Extract<MediaVerificationResult, { outcome: 'UNAVAILABLE' }>;

export type LifecycleClaim =
  | { status: 'CLAIMED' }
  | { status: 'IN_PROGRESS' }
  | { status: 'REPLAY'; result: StoredVerificationResult }
  | { status: 'CONFLICT' };

export interface MediaVerificationLifecycleStore {
  readonly availability: AdapterAvailability;
  claim(assetId: string, fingerprint: string): Promise<LifecycleClaim>;
  complete(assetId: string, fingerprint: string, result: StoredVerificationResult): Promise<void>;
  release(assetId: string, fingerprint: string): Promise<void>;
}

export interface MediaVerificationDependencies {
  accessChecker: ConsentAccessChecker;
  decoder: MediaDecoderAdapter;
  lifecycleStore: MediaVerificationLifecycleStore;
  malwareScanner: MalwareScannerAdapter;
}

export class MediaVerificationReplayConflictError extends Error {
  readonly code = 'MEDIA_SCAN_IDENTITY_REUSED' as const;

  constructor() {
    super('The asset scan identity was reused with different immutable input');
    this.name = 'MediaVerificationReplayConflictError';
  }
}

export function unavailableProductionReadiness(): MediaScannerReadiness {
  return {
    ready: false,
    code: 'MEDIA_SCANNER_ADAPTERS_UNAVAILABLE',
    missing: ['CONSENT_ACCESS_CHECKER', 'DECODER', 'LIFECYCLE_STORE', 'MALWARE_SCANNER'],
    retryable: true,
  };
}

export function evaluateScannerReadiness(
  dependencies: MediaVerificationDependencies,
): MediaScannerReadiness {
  const missing: ScannerAdapterName[] = [];
  if (dependencies.accessChecker.availability.status === 'UNAVAILABLE') {
    missing.push('CONSENT_ACCESS_CHECKER');
  }
  if (dependencies.decoder.availability.status === 'UNAVAILABLE') missing.push('DECODER');
  if (dependencies.lifecycleStore.availability.status === 'UNAVAILABLE') {
    missing.push('LIFECYCLE_STORE');
  }
  if (dependencies.malwareScanner.availability.status === 'UNAVAILABLE') {
    missing.push('MALWARE_SCANNER');
  }
  return missing.length === 0
    ? { ready: true }
    : {
        ready: false,
        code: 'MEDIA_SCANNER_ADAPTERS_UNAVAILABLE',
        missing,
        retryable: true,
      };
}

export class MediaVerificationEngine {
  readonly #dependencies: MediaVerificationDependencies;

  constructor(dependencies: MediaVerificationDependencies) {
    this.#dependencies = dependencies;
  }

  get readiness(): MediaScannerReadiness {
    return evaluateScannerReadiness(this.#dependencies);
  }

  async verify(input: MediaVerificationInput): Promise<MediaVerificationResult> {
    const access = await this.#dependencies.accessChecker.checkCurrent({
      assetId: input.assetId,
      purpose: input.purpose,
      consentAccessVersion: input.consentAccessVersion,
    });
    if (access.status === 'UNAVAILABLE') return unavailable(access.code);
    if (access.status === 'DENIED') return rejected('CONSENT_OR_ACCESS_VERSION_CHANGED');

    const computedSourceSha256 = sha256Digest(input.bytes);
    const fingerprint = verificationFingerprint(input, computedSourceSha256);
    const claim = await this.#dependencies.lifecycleStore.claim(input.assetId, fingerprint);

    if (claim.status === 'CONFLICT') throw new MediaVerificationReplayConflictError();
    if (claim.status === 'IN_PROGRESS') {
      return { outcome: 'IN_PROGRESS', state: 'SCANNING', replayed: true };
    }
    if (claim.status === 'REPLAY') return withReplay(claim.result);

    try {
      const result = await this.#verifyClaimed(input, computedSourceSha256);
      if (result.outcome === 'UNAVAILABLE') {
        await this.#dependencies.lifecycleStore.release(input.assetId, fingerprint);
        return result;
      }
      const stored = withoutReplay(result);
      await this.#dependencies.lifecycleStore.complete(input.assetId, fingerprint, stored);
      return result;
    } catch (error) {
      await this.#dependencies.lifecycleStore.release(input.assetId, fingerprint);
      throw error;
    }
  }

  async #verifyClaimed(
    input: MediaVerificationInput,
    computedSourceSha256: string,
  ): Promise<ClaimedVerificationResult> {
    const policy = MEDIA_PURPOSE_POLICIES[input.purpose];
    if (input.finalizedGeneration !== input.objectGeneration) {
      return rejected('GENERATION_MISMATCH');
    }
    if (
      input.declaredSizeBytes !== input.finalizedSizeBytes ||
      input.finalizedSizeBytes !== input.bytes.byteLength ||
      input.bytes.byteLength > policy.maximumBytes
    ) {
      return rejected('SIZE_MISMATCH');
    }
    if (
      input.expectedSha256 !== input.finalizedSha256 ||
      input.finalizedSha256 !== computedSourceSha256
    ) {
      return rejected('CHECKSUM_MISMATCH');
    }
    if (!policy.allowedMimeTypes.includes(input.claimedMimeType)) {
      return rejected('UNSUPPORTED_CODEC');
    }

    const detectedMimeType = detectMagicMime(input.bytes);
    if (detectedMimeType === undefined) return rejected('UNSUPPORTED_CODEC');
    if (detectedMimeType !== input.claimedMimeType) return rejected('MIME_MISMATCH');

    const sourceContainer = inspectContainer(input.bytes, detectedMimeType);
    if (!sourceContainer.valid) return rejected(sourceContainer.failureCode);

    const malware = await this.#dependencies.malwareScanner.scan({
      assetId: input.assetId,
      sha256: computedSourceSha256,
      bytes: input.bytes,
    });
    if (malware.status === 'UNAVAILABLE') return unavailable(malware.code);
    if (malware.status === 'UNSAFE') return rejected('MALWARE_REJECTED');

    const decoded = await this.#dependencies.decoder.decode({
      bytes: input.bytes,
      mimeType: detectedMimeType,
      ...(policy.maximumPixels === undefined ? {} : { maximumPixels: policy.maximumPixels }),
      ...(policy.maximumDurationSeconds === undefined
        ? {}
        : { maximumDurationSeconds: policy.maximumDurationSeconds }),
    });
    if (decoded.status === 'UNAVAILABLE') return unavailable(decoded.code);
    if (decoded.status === 'REJECTED') return rejected(decoded.failureCode);
    if (
      decoded.derivativeMimeType !== detectedMimeType ||
      !policy.allowedMimeTypes.includes(decoded.derivativeMimeType)
    ) {
      return rejected('MIME_MISMATCH');
    }

    const limitsFailure = validateDecodedLimits(decoded, detectedMimeType, policy);
    if (limitsFailure !== undefined) return rejected(limitsFailure);

    const derivativeContainer = inspectContainer(
      decoded.derivativeBytes,
      decoded.derivativeMimeType,
    );
    if (!derivativeContainer.valid) return rejected(derivativeContainer.failureCode);

    return {
      outcome: 'VERIFIED',
      state: 'VERIFIED',
      sourceSha256: computedSourceSha256,
      derivativeSha256: sha256Digest(decoded.derivativeBytes),
      verifiedMimeType: decoded.derivativeMimeType,
      verifiedSizeBytes: input.bytes.byteLength,
      derivativeBytes: Uint8Array.from(decoded.derivativeBytes),
      scannerVersion: `${MEDIA_SCANNER_VERSION}/${malware.scannerVersion}/${decoded.decoderVersion}`,
      ...(decoded.width === undefined ? {} : { width: decoded.width }),
      ...(decoded.height === undefined ? {} : { height: decoded.height }),
      ...(decoded.durationSeconds === undefined
        ? {}
        : { durationSeconds: decoded.durationSeconds }),
      replayed: false,
    };
  }
}

export class InMemoryMediaVerificationLifecycleStore implements MediaVerificationLifecycleStore {
  readonly availability: AdapterAvailability = { status: 'AVAILABLE' };
  readonly #entries = new Map<
    string,
    { fingerprint: string; state: 'IN_PROGRESS' | 'COMPLETE'; result?: StoredVerificationResult }
  >();

  constructor(environment = process.env['NODE_ENV']) {
    if (environment === 'production') {
      throw new Error('InMemoryMediaVerificationLifecycleStore cannot run in production');
    }
  }

  claim(assetId: string, fingerprint: string): Promise<LifecycleClaim> {
    const existing = this.#entries.get(assetId);
    if (existing === undefined) {
      this.#entries.set(assetId, { fingerprint, state: 'IN_PROGRESS' });
      return Promise.resolve({ status: 'CLAIMED' });
    }
    if (existing.fingerprint !== fingerprint) return Promise.resolve({ status: 'CONFLICT' });
    if (existing.state === 'IN_PROGRESS') return Promise.resolve({ status: 'IN_PROGRESS' });
    if (existing.result === undefined) throw new Error('Completed scan is missing its result');
    return Promise.resolve({ status: 'REPLAY', result: cloneStoredResult(existing.result) });
  }

  complete(assetId: string, fingerprint: string, result: StoredVerificationResult): Promise<void> {
    const existing = this.#entries.get(assetId);
    if (existing === undefined) throw new MediaVerificationReplayConflictError();
    if (existing.fingerprint !== fingerprint || existing.state !== 'IN_PROGRESS') {
      throw new MediaVerificationReplayConflictError();
    }
    this.#entries.set(assetId, {
      fingerprint,
      state: 'COMPLETE',
      result: cloneStoredResult(result),
    });
    return Promise.resolve();
  }

  release(assetId: string, fingerprint: string): Promise<void> {
    const existing = this.#entries.get(assetId);
    if (existing?.fingerprint === fingerprint && existing.state === 'IN_PROGRESS') {
      this.#entries.delete(assetId);
    }
    return Promise.resolve();
  }
}

export function sha256Digest(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export function detectMagicMime(bytes: Uint8Array): MediaMimeType | undefined {
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return 'audio/wav';
  if (hasPrefix(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'audio/webm;codecs=opus';
  return undefined;
}

type ContainerInspection =
  { valid: true } | { valid: false; failureCode: 'DECODER_REJECTED' | 'POLYGLOT_REJECTED' };

export function inspectContainer(bytes: Uint8Array, mimeType: MediaMimeType): ContainerInspection {
  try {
    switch (mimeType) {
      case 'image/jpeg':
        inspectJpeg(bytes);
        break;
      case 'image/png':
        inspectPng(bytes);
        break;
      case 'image/webp':
        inspectWebp(bytes);
        break;
      case 'audio/wav':
        inspectWav(bytes);
        break;
      case 'audio/webm;codecs=opus':
        inspectWebm(bytes);
        break;
    }
    return { valid: true };
  } catch (error) {
    if (error instanceof ContainerInspectionError) {
      return { valid: false, failureCode: error.failureCode };
    }
    throw error;
  }
}

class ContainerInspectionError extends Error {
  constructor(
    readonly failureCode: 'DECODER_REJECTED' | 'POLYGLOT_REJECTED',
    message: string,
  ) {
    super(message);
    this.name = 'ContainerInspectionError';
  }
}

function inspectJpeg(bytes: Uint8Array): void {
  requireContainer(bytes.byteLength >= 4 && hasPrefix(bytes, [0xff, 0xd8, 0xff]));
  let firstEnd = -1;
  for (let index = 2; index < bytes.byteLength - 1; index += 1) {
    if (bytes[index] === 0xff && bytes[index + 1] === 0xd9) {
      firstEnd = index;
      break;
    }
  }
  requireContainer(firstEnd >= 0);
  if (firstEnd !== bytes.byteLength - 2) {
    throw new ContainerInspectionError('POLYGLOT_REJECTED', 'JPEG has trailing payload');
  }
}

const PNG_ALLOWED_CHUNKS = new Set([
  'IHDR',
  'PLTE',
  'IDAT',
  'IEND',
  'tRNS',
  'gAMA',
  'cHRM',
  'sRGB',
  'iCCP',
  'pHYs',
  'tEXt',
  'zTXt',
  'iTXt',
  'eXIf',
  'bKGD',
  'sBIT',
  'hIST',
  'tIME',
]);

function inspectPng(bytes: Uint8Array): void {
  requireContainer(
    bytes.byteLength >= 20 && hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  let offset = 8;
  let chunkCount = 0;
  let sawHeader = false;
  let sawData = false;
  while (offset < bytes.byteLength) {
    requireContainer(offset + 12 <= bytes.byteLength);
    const length = readU32Be(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    requireContainer(dataEnd >= dataStart && chunkEnd <= bytes.byteLength);
    if (!PNG_ALLOWED_CHUNKS.has(type)) {
      throw new ContainerInspectionError('POLYGLOT_REJECTED', 'PNG has an unknown chunk');
    }
    const expectedCrc = readU32Be(bytes, dataEnd);
    const actualCrc = crc32(bytes.subarray(offset + 4, dataEnd));
    requireContainer(expectedCrc === actualCrc);

    if (chunkCount === 0) {
      requireContainer(type === 'IHDR' && length === 13);
      sawHeader = true;
    } else if (type === 'IHDR') {
      requireContainer(false);
    }
    if (type === 'IDAT') sawData = true;
    if (type === 'IEND') {
      requireContainer(length === 0 && sawHeader && sawData);
      if (chunkEnd !== bytes.byteLength) {
        throw new ContainerInspectionError('POLYGLOT_REJECTED', 'PNG has trailing payload');
      }
      return;
    }
    chunkCount += 1;
    offset = chunkEnd;
  }
  requireContainer(false);
}

const WEBP_ALLOWED_CHUNKS = new Set([
  'VP8 ',
  'VP8L',
  'VP8X',
  'ALPH',
  'ANIM',
  'ANMF',
  'ICCP',
  'EXIF',
  'XMP ',
]);

function inspectWebp(bytes: Uint8Array): void {
  inspectRiffEnvelope(bytes, 'WEBP');
  let sawImagePayload = false;
  for (const chunk of riffChunks(bytes)) {
    if (!WEBP_ALLOWED_CHUNKS.has(chunk.type)) {
      throw new ContainerInspectionError('POLYGLOT_REJECTED', 'WebP has an unknown chunk');
    }
    if (['VP8 ', 'VP8L', 'ANMF'].includes(chunk.type)) sawImagePayload = true;
  }
  requireContainer(sawImagePayload);
}

const WAV_ALLOWED_CHUNKS = new Set([
  'fmt ',
  'data',
  'fact',
  'LIST',
  'JUNK',
  'PAD ',
  'bext',
  'iXML',
]);

function inspectWav(bytes: Uint8Array): void {
  inspectRiffEnvelope(bytes, 'WAVE');
  let sawFormat = false;
  let sawData = false;
  for (const chunk of riffChunks(bytes)) {
    if (!WAV_ALLOWED_CHUNKS.has(chunk.type)) {
      throw new ContainerInspectionError('POLYGLOT_REJECTED', 'WAV has an unknown chunk');
    }
    if (chunk.type === 'fmt ') {
      requireContainer(!sawFormat && chunk.data.byteLength >= 16 && chunk.data.byteLength <= 40);
      const audioFormat = readU16Le(chunk.data, 0);
      const channels = readU16Le(chunk.data, 2);
      const sampleRate = readU32Le(chunk.data, 4);
      const byteRate = readU32Le(chunk.data, 8);
      const blockAlign = readU16Le(chunk.data, 12);
      const bitsPerSample = readU16Le(chunk.data, 14);
      requireContainer(
        audioFormat === 1 &&
          channels >= 1 &&
          channels <= 2 &&
          sampleRate >= 8_000 &&
          sampleRate <= 48_000 &&
          [8, 16, 24, 32].includes(bitsPerSample) &&
          blockAlign === channels * (bitsPerSample / 8) &&
          byteRate === sampleRate * blockAlign,
      );
      sawFormat = true;
    }
    if (chunk.type === 'data') sawData = true;
  }
  requireContainer(sawFormat && sawData);
}

const WEBM_HEADER_IDS = new Set(['4286', '42F7', '42F2', '42F3', '4282', '4287', '4285']);
const WEBM_SEGMENT_IDS = new Set([
  '114D9B74',
  '1549A966',
  '1654AE6B',
  '1F43B675',
  '1C53BB6B',
  'EC',
  'BF',
]);

function inspectWebm(bytes: Uint8Array): void {
  const header = readEbmlElement(bytes, 0);
  requireContainer(header.id === '1A45DFA3');
  let headerOffset = header.dataStart;
  let documentType: string | undefined;
  while (headerOffset < header.dataEnd) {
    const element = readEbmlElement(bytes, headerOffset, header.dataEnd);
    if (!WEBM_HEADER_IDS.has(element.id)) {
      throw new ContainerInspectionError('POLYGLOT_REJECTED', 'WebM has an unknown header');
    }
    if (element.id === '4282') {
      documentType = ascii(bytes, element.dataStart, element.dataEnd - element.dataStart);
    }
    headerOffset = element.dataEnd;
  }
  requireContainer(headerOffset === header.dataEnd && documentType === 'webm');

  const segment = readEbmlElement(bytes, header.dataEnd);
  requireContainer(segment.id === '18538067');
  if (segment.dataEnd < bytes.byteLength) {
    throw new ContainerInspectionError('POLYGLOT_REJECTED', 'WebM has trailing payload');
  }
  requireContainer(segment.dataEnd === bytes.byteLength);

  let offset = segment.dataStart;
  let sawTracks = false;
  let sawCluster = false;
  while (offset < segment.dataEnd) {
    const element = readEbmlElement(bytes, offset, segment.dataEnd);
    if (!WEBM_SEGMENT_IDS.has(element.id)) {
      throw new ContainerInspectionError('POLYGLOT_REJECTED', 'WebM has an unsafe element');
    }
    if (element.id === 'EC') {
      requireContainer(
        element.dataEnd - element.dataStart <= 1_024 &&
          bytes.subarray(element.dataStart, element.dataEnd).every((byte) => byte === 0),
      );
    }
    if (element.id === 'BF') requireContainer(element.dataEnd - element.dataStart === 4);
    if (element.id === '1654AE6B') sawTracks = true;
    if (element.id === '1F43B675') sawCluster = true;
    offset = element.dataEnd;
  }
  requireContainer(offset === segment.dataEnd && sawTracks && sawCluster);
}

interface EbmlElement {
  id: string;
  dataStart: number;
  dataEnd: number;
}

function readEbmlElement(bytes: Uint8Array, offset: number, limit = bytes.byteLength): EbmlElement {
  requireContainer(offset < limit);
  const idLength = vintLength(requiredByte(bytes, offset), 4);
  requireContainer(offset + idLength < limit);
  const id = [...bytes.subarray(offset, offset + idLength)]
    .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  const sizeOffset = offset + idLength;
  const sizeLength = vintLength(requiredByte(bytes, sizeOffset), 8);
  requireContainer(sizeOffset + sizeLength <= limit);

  const marker = 1 << (8 - sizeLength);
  let value = BigInt(requiredByte(bytes, sizeOffset) & (marker - 1));
  let unknown = (requiredByte(bytes, sizeOffset) & (marker - 1)) === marker - 1;
  for (let index = 1; index < sizeLength; index += 1) {
    const byte = requiredByte(bytes, sizeOffset + index);
    value = (value << 8n) | BigInt(byte);
    unknown &&= byte === 0xff;
  }
  requireContainer(!unknown && value <= BigInt(Number.MAX_SAFE_INTEGER));
  const dataStart = sizeOffset + sizeLength;
  const dataEnd = dataStart + Number(value);
  requireContainer(dataEnd >= dataStart && dataEnd <= limit);
  return { id, dataStart, dataEnd };
}

function vintLength(firstByte: number, maximum: number): number {
  let marker = 0x80;
  let length = 1;
  while (length <= maximum && (firstByte & marker) === 0) {
    marker >>= 1;
    length += 1;
  }
  requireContainer(length <= maximum && marker !== 0);
  return length;
}

function inspectRiffEnvelope(bytes: Uint8Array, formType: 'WEBP' | 'WAVE'): void {
  requireContainer(
    bytes.byteLength >= 20 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === formType,
  );
  const declaredEnd = readU32Le(bytes, 4) + 8;
  if (declaredEnd < bytes.byteLength) {
    throw new ContainerInspectionError('POLYGLOT_REJECTED', `${formType} has trailing payload`);
  }
  requireContainer(declaredEnd === bytes.byteLength);
}

interface RiffChunk {
  type: string;
  data: Uint8Array;
}

function riffChunks(bytes: Uint8Array): readonly RiffChunk[] {
  const chunks: RiffChunk[] = [];
  let offset = 12;
  while (offset < bytes.byteLength) {
    requireContainer(offset + 8 <= bytes.byteLength);
    const type = ascii(bytes, offset, 4);
    const size = readU32Le(bytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    const paddedEnd = dataEnd + (size % 2);
    requireContainer(dataEnd >= dataStart && paddedEnd <= bytes.byteLength);
    chunks.push({ type, data: bytes.subarray(dataStart, dataEnd) });
    offset = paddedEnd;
  }
  requireContainer(offset === bytes.byteLength && chunks.length > 0);
  return chunks;
}

function validateDecodedLimits(
  decoded: Extract<DecoderResult, { status: 'ACCEPTED' }>,
  mimeType: MediaMimeType,
  policy: MediaPurposePolicy,
): MediaFailureCode | undefined {
  if (mimeType.startsWith('image/')) {
    if (decoded.width === undefined || decoded.height === undefined) return 'DECODER_REJECTED';
    if (
      decoded.width < 1 ||
      decoded.height < 1 ||
      policy.maximumPixels === undefined ||
      decoded.width * decoded.height > policy.maximumPixels
    ) {
      return 'DIMENSION_LIMIT_EXCEEDED';
    }
    return undefined;
  }
  if (decoded.durationSeconds === undefined || decoded.durationSeconds <= 0) {
    return 'DECODER_REJECTED';
  }
  if (
    policy.maximumDurationSeconds === undefined ||
    decoded.durationSeconds > policy.maximumDurationSeconds
  ) {
    return 'DURATION_LIMIT_EXCEEDED';
  }
  if (
    (mimeType === 'audio/webm;codecs=opus' && decoded.codec !== 'opus') ||
    (mimeType === 'audio/wav' && decoded.codec !== 'pcm')
  ) {
    return 'UNSUPPORTED_CODEC';
  }
  return undefined;
}

function rejected(failureCode: MediaFailureCode): RejectedMediaResult {
  return { outcome: 'REJECTED', state: 'REJECTED', failureCode, replayed: false };
}

function unavailable(
  code: ScannerAdapterUnavailableCode,
): Extract<MediaVerificationResult, { outcome: 'UNAVAILABLE' }> {
  return {
    outcome: 'UNAVAILABLE',
    state: 'FAILED_RETRYABLE',
    code,
    retryable: true,
    replayed: false,
  };
}

function withReplay(result: StoredVerificationResult): VerifiedMediaResult | RejectedMediaResult {
  return { ...cloneStoredResult(result), replayed: true };
}

function withoutReplay(
  result: VerifiedMediaResult | RejectedMediaResult,
): StoredVerificationResult {
  const { replayed, ...stored } = result;
  void replayed;
  return stored;
}

function cloneStoredResult(result: StoredVerificationResult): StoredVerificationResult {
  return result.outcome === 'VERIFIED'
    ? { ...result, derivativeBytes: Uint8Array.from(result.derivativeBytes) }
    : { ...result };
}

function verificationFingerprint(input: MediaVerificationInput, computedSha256: string): string {
  const fields = [
    input.assetId,
    input.purpose,
    input.finalizedGeneration,
    input.objectGeneration,
    String(input.declaredSizeBytes),
    String(input.finalizedSizeBytes),
    input.expectedSha256,
    input.finalizedSha256,
    input.claimedMimeType,
    String(input.consentAccessVersion),
    computedSha256,
  ];
  return sha256Digest(Buffer.from(fields.join('\u001f'), 'utf8'));
}

function requireContainer(condition: boolean): asserts condition {
  if (!condition) {
    throw new ContainerInspectionError('DECODER_REJECTED', 'Malformed media container');
  }
}

function hasPrefix(bytes: Uint8Array, expected: readonly number[]): boolean {
  return (
    bytes.byteLength >= expected.length && expected.every((value, index) => bytes[index] === value)
  );
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || length < 0 || offset + length > bytes.byteLength) return '';
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function requiredByte(bytes: Uint8Array, offset: number): number {
  const value = bytes[offset];
  requireContainer(value !== undefined);
  return value;
}

function readU16Le(bytes: Uint8Array, offset: number): number {
  requireContainer(offset >= 0 && offset + 2 <= bytes.byteLength);
  return requiredByte(bytes, offset) | (requiredByte(bytes, offset + 1) << 8);
}

function readU32Le(bytes: Uint8Array, offset: number): number {
  requireContainer(offset >= 0 && offset + 4 <= bytes.byteLength);
  return (
    requiredByte(bytes, offset) +
    requiredByte(bytes, offset + 1) * 0x100 +
    requiredByte(bytes, offset + 2) * 0x1_0000 +
    requiredByte(bytes, offset + 3) * 0x1_000000
  );
}

function readU32Be(bytes: Uint8Array, offset: number): number {
  requireContainer(offset >= 0 && offset + 4 <= bytes.byteLength);
  return (
    requiredByte(bytes, offset) * 0x1_000000 +
    requiredByte(bytes, offset + 1) * 0x1_0000 +
    requiredByte(bytes, offset + 2) * 0x100 +
    requiredByte(bytes, offset + 3)
  );
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
