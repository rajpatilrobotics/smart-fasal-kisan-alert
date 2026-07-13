import { describe, expect, it } from 'vitest';

import {
  InMemoryMediaVerificationLifecycleStore,
  MEDIA_PURPOSE_POLICIES,
  MediaVerificationEngine,
  MediaVerificationReplayConflictError,
  detectMagicMime,
  inspectContainer,
  sha256Digest,
  type AdapterAvailability,
  type ConsentAccessChecker,
  type DecoderResult,
  type MalwareScannerAdapter,
  type MediaDecoderAdapter,
  type MediaMimeType,
  type MediaVerificationDependencies,
  type MediaVerificationInput,
} from './verification.js';

const AVAILABLE: AdapterAvailability = { status: 'AVAILABLE' };

class FakeAccessChecker implements ConsentAccessChecker {
  readonly availability = AVAILABLE;
  allowed = true;
  calls = 0;

  checkCurrent(): Promise<{ status: 'ALLOWED' } | { status: 'DENIED' }> {
    this.calls += 1;
    return Promise.resolve(this.allowed ? { status: 'ALLOWED' } : { status: 'DENIED' });
  }
}

class FakeMalwareScanner implements MalwareScannerAdapter {
  readonly availability = AVAILABLE;
  unsafe = false;
  calls = 0;

  scan(): Promise<{ status: 'SAFE'; scannerVersion: string } | { status: 'UNSAFE' }> {
    this.calls += 1;
    return Promise.resolve(
      this.unsafe ? { status: 'UNSAFE' } : { status: 'SAFE', scannerVersion: 'test-malware-v1' },
    );
  }
}

class FakeDecoder implements MediaDecoderAdapter {
  readonly availability = AVAILABLE;
  calls = 0;
  mode: 'accepted' | 'unavailable' = 'accepted';
  derivativeTransform: (bytes: Uint8Array) => Uint8Array = (bytes) => Uint8Array.from(bytes);
  forcedResult?: DecoderResult;

  decode(input: { bytes: Uint8Array; mimeType: MediaMimeType }): Promise<DecoderResult> {
    this.calls += 1;
    if (this.forcedResult !== undefined) return Promise.resolve(this.forcedResult);
    if (this.mode === 'unavailable') {
      return Promise.resolve({
        status: 'UNAVAILABLE',
        code: 'DECODER_ADAPTER_UNAVAILABLE',
      });
    }
    const common = {
      status: 'ACCEPTED' as const,
      derivativeBytes: this.derivativeTransform(input.bytes),
      derivativeMimeType: input.mimeType,
      metadataStripped: true as const,
      decoderVersion: 'test-decoder-v1',
    };
    if (input.mimeType.startsWith('image/')) {
      return Promise.resolve({ ...common, width: 1, height: 1 });
    }
    return Promise.resolve({
      ...common,
      durationSeconds: 1,
      codec: input.mimeType === 'audio/wav' ? 'pcm' : 'opus',
    });
  }
}

function dependencies(
  options: {
    accessChecker?: FakeAccessChecker;
    decoder?: FakeDecoder;
    lifecycleStore?: InMemoryMediaVerificationLifecycleStore;
    malwareScanner?: FakeMalwareScanner;
  } = {},
): MediaVerificationDependencies {
  return {
    accessChecker: options.accessChecker ?? new FakeAccessChecker(),
    decoder: options.decoder ?? new FakeDecoder(),
    lifecycleStore: options.lifecycleStore ?? new InMemoryMediaVerificationLifecycleStore('test'),
    malwareScanner: options.malwareScanner ?? new FakeMalwareScanner(),
  };
}

function verificationInput(
  bytes: Uint8Array,
  mimeType: MediaMimeType,
  overrides: Partial<MediaVerificationInput> = {},
): MediaVerificationInput {
  const digest = sha256Digest(bytes);
  return {
    assetId: '01900000-0000-7000-8000-000000000001',
    purpose: mimeType.startsWith('audio/') ? 'VOICE_OFFLINE_AUDIO' : 'CROP_HEALTH_IMAGE',
    finalizedGeneration: '17',
    objectGeneration: '17',
    declaredSizeBytes: bytes.byteLength,
    finalizedSizeBytes: bytes.byteLength,
    expectedSha256: digest,
    finalizedSha256: digest,
    claimedMimeType: mimeType,
    consentAccessVersion: 3,
    bytes,
    ...overrides,
  };
}

async function verifyOnce(
  input: MediaVerificationInput,
  options: Parameters<typeof dependencies>[0] = {},
) {
  return new MediaVerificationEngine(dependencies(options)).verify(input);
}

describe('media verification policy', () => {
  it('pins purpose-specific type, byte, pixel and duration ceilings', () => {
    expect(MEDIA_PURPOSE_POLICIES.CROP_HEALTH_IMAGE).toMatchObject({
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maximumBytes: 10 * 1024 * 1024,
      maximumPixels: 40_000_000,
    });
    expect(MEDIA_PURPOSE_POLICIES.RSK_VISIT_EVIDENCE.maximumBytes).toBe(15 * 1024 * 1024);
    expect(MEDIA_PURPOSE_POLICIES.VOICE_OFFLINE_AUDIO).toMatchObject({
      allowedMimeTypes: ['audio/webm;codecs=opus', 'audio/wav'],
      maximumBytes: 10 * 1024 * 1024,
      maximumDurationSeconds: 120,
    });
  });

  it.each([
    ['generation', { objectGeneration: '18' }, 'GENERATION_MISMATCH'],
    ['size', { finalizedSizeBytes: 99 }, 'SIZE_MISMATCH'],
    ['checksum', { finalizedSha256: `sha256:${'0'.repeat(64)}` }, 'CHECKSUM_MISMATCH'],
  ] as const)('rejects a %s mismatch before decoding', async (_label, override, failureCode) => {
    const decoder = new FakeDecoder();
    const result = await verifyOnce(verificationInput(makePng(), 'image/png', override), {
      decoder,
    });

    expect(result).toMatchObject({ outcome: 'REJECTED', failureCode });
    expect(decoder.calls).toBe(0);
  });

  it('rejects a purpose ceiling breach before inspecting attacker-controlled bytes', async () => {
    const bytes = new Uint8Array(10 * 1024 * 1024 + 1);
    const result = await verifyOnce(verificationInput(bytes, 'image/png'));

    expect(result).toMatchObject({ outcome: 'REJECTED', failureCode: 'SIZE_MISMATCH' });
  });

  it('does not allow an image under the offline voice purpose', async () => {
    const result = await verifyOnce(
      verificationInput(makePng(), 'image/png', { purpose: 'VOICE_OFFLINE_AUDIO' }),
    );

    expect(result).toMatchObject({ outcome: 'REJECTED', failureCode: 'UNSUPPORTED_CODEC' });
  });
});

describe('strict media containers', () => {
  const fixtures: readonly [string, MediaMimeType, () => Uint8Array][] = [
    ['JPEG', 'image/jpeg', makeJpeg],
    ['PNG', 'image/png', makePng],
    ['WebP', 'image/webp', makeWebp],
    ['WAV', 'audio/wav', makeWav],
    ['WebM', 'audio/webm;codecs=opus', makeWebm],
  ];

  it.each(fixtures)(
    'accepts a bounded %s container and produces a derivative',
    async (_label, mimeType, fixture) => {
      const bytes = fixture();
      expect(detectMagicMime(bytes)).toBe(mimeType);
      expect(inspectContainer(bytes, mimeType)).toEqual({ valid: true });

      const result = await verifyOnce(verificationInput(bytes, mimeType));
      expect(result).toMatchObject({
        outcome: 'VERIFIED',
        verifiedMimeType: mimeType,
        replayed: false,
      });
    },
  );

  it.each(fixtures)(
    'rejects payload appended after the declared %s container end',
    async (_label, mimeType, fixture) => {
      const bytes = concat(fixture(), Uint8Array.from([0x50, 0x4b, 0x03, 0x04]));
      const result = await verifyOnce(verificationInput(bytes, mimeType));

      expect(result).toMatchObject({ outcome: 'REJECTED', failureCode: 'POLYGLOT_REJECTED' });
    },
  );

  it('rejects a claimed MIME that disagrees with magic bytes', async () => {
    const bytes = makeJpeg();
    const result = await verifyOnce(verificationInput(bytes, 'image/png'));

    expect(result).toMatchObject({ outcome: 'REJECTED', failureCode: 'MIME_MISMATCH' });
  });

  it('revalidates derivative structure instead of trusting the decoder adapter', async () => {
    const decoder = new FakeDecoder();
    decoder.derivativeTransform = (bytes) =>
      concat(bytes, Uint8Array.from([0x50, 0x4b, 0x03, 0x04]));

    const result = await verifyOnce(verificationInput(makePng(), 'image/png'), { decoder });
    expect(result).toMatchObject({ outcome: 'REJECTED', failureCode: 'POLYGLOT_REJECTED' });
  });
});

describe('security adapters and lifecycle', () => {
  it('checks current consent before malware scanning or decoding', async () => {
    const accessChecker = new FakeAccessChecker();
    const malwareScanner = new FakeMalwareScanner();
    const decoder = new FakeDecoder();
    accessChecker.allowed = false;

    const result = await verifyOnce(verificationInput(makePng(), 'image/png'), {
      accessChecker,
      malwareScanner,
      decoder,
    });

    expect(result).toMatchObject({
      outcome: 'REJECTED',
      failureCode: 'CONSENT_OR_ACCESS_VERSION_CHANGED',
    });
    expect(accessChecker.calls).toBe(1);
    expect(malwareScanner.calls).toBe(0);
    expect(decoder.calls).toBe(0);
  });

  it('rejects malware without sending it to a decoder', async () => {
    const malwareScanner = new FakeMalwareScanner();
    const decoder = new FakeDecoder();
    malwareScanner.unsafe = true;

    const result = await verifyOnce(verificationInput(makePng(), 'image/png'), {
      malwareScanner,
      decoder,
    });

    expect(result).toMatchObject({ outcome: 'REJECTED', failureCode: 'MALWARE_REJECTED' });
    expect(decoder.calls).toBe(0);
  });

  it('enforces decoded image and audio bounds', async () => {
    const imageDecoder = new FakeDecoder();
    imageDecoder.forcedResult = {
      status: 'ACCEPTED',
      derivativeBytes: makePng(),
      derivativeMimeType: 'image/png',
      metadataStripped: true,
      decoderVersion: 'test',
      width: 10_000,
      height: 10_000,
    };
    const imageResult = await verifyOnce(verificationInput(makePng(), 'image/png'), {
      decoder: imageDecoder,
    });
    expect(imageResult).toMatchObject({
      outcome: 'REJECTED',
      failureCode: 'DIMENSION_LIMIT_EXCEEDED',
    });

    const audioDecoder = new FakeDecoder();
    audioDecoder.forcedResult = {
      status: 'ACCEPTED',
      derivativeBytes: makeWav(),
      derivativeMimeType: 'audio/wav',
      metadataStripped: true,
      decoderVersion: 'test',
      durationSeconds: 121,
      codec: 'pcm',
    };
    const audioResult = await verifyOnce(verificationInput(makeWav(), 'audio/wav'), {
      decoder: audioDecoder,
    });
    expect(audioResult).toMatchObject({
      outcome: 'REJECTED',
      failureCode: 'DURATION_LIMIT_EXCEEDED',
    });
  });

  it('returns the original terminal result for an exact replay', async () => {
    const decoder = new FakeDecoder();
    const engine = new MediaVerificationEngine(dependencies({ decoder }));
    const input = verificationInput(makePng(), 'image/png');

    const first = await engine.verify(input);
    const replay = await engine.verify(input);

    expect(first).toMatchObject({ outcome: 'VERIFIED', replayed: false });
    expect(replay).toMatchObject({ outcome: 'VERIFIED', replayed: true });
    expect(decoder.calls).toBe(1);
    if (first.outcome === 'VERIFIED' && replay.outcome === 'VERIFIED') {
      expect(replay.derivativeSha256).toBe(first.derivativeSha256);
    }
  });

  it('rechecks consent before returning a previously verified replay', async () => {
    const accessChecker = new FakeAccessChecker();
    const decoder = new FakeDecoder();
    const engine = new MediaVerificationEngine(dependencies({ accessChecker, decoder }));
    const input = verificationInput(makePng(), 'image/png');
    await engine.verify(input);
    accessChecker.allowed = false;

    const replay = await engine.verify(input);

    expect(replay).toMatchObject({
      outcome: 'REJECTED',
      failureCode: 'CONSENT_OR_ACCESS_VERSION_CHANGED',
    });
    expect(accessChecker.calls).toBe(2);
    expect(decoder.calls).toBe(1);
  });

  it('raises a typed conflict for the same asset with different immutable scan input', async () => {
    const engine = new MediaVerificationEngine(dependencies());
    const input = verificationInput(makePng(), 'image/png');
    await engine.verify(input);

    const changedBytes = makeJpeg();
    await expect(
      engine.verify(
        verificationInput(changedBytes, 'image/jpeg', {
          assetId: input.assetId,
        }),
      ),
    ).rejects.toBeInstanceOf(MediaVerificationReplayConflictError);
  });

  it('releases a claim after typed adapter unavailability so an exact retry can succeed', async () => {
    const decoder = new FakeDecoder();
    const store = new InMemoryMediaVerificationLifecycleStore('test');
    decoder.mode = 'unavailable';
    const engine = new MediaVerificationEngine(dependencies({ decoder, lifecycleStore: store }));
    const input = verificationInput(makePng(), 'image/png');

    await expect(engine.verify(input)).resolves.toMatchObject({
      outcome: 'UNAVAILABLE',
      code: 'DECODER_ADAPTER_UNAVAILABLE',
    });
    decoder.mode = 'accepted';
    await expect(engine.verify(input)).resolves.toMatchObject({
      outcome: 'VERIFIED',
      replayed: false,
    });
  });

  it('forbids the in-memory lifecycle adapter in production', () => {
    expect(() => new InMemoryMediaVerificationLifecycleStore('production')).toThrow(
      'cannot run in production',
    );
  });
});

function makeJpeg(): Uint8Array {
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xd9]);
}

function makePng(): Uint8Array {
  const header = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const imageHeader = new Uint8Array(13);
  writeU32Be(imageHeader, 0, 1);
  writeU32Be(imageHeader, 4, 1);
  imageHeader.set([8, 2, 0, 0, 0], 8);
  return concat(
    header,
    pngChunk('IHDR', imageHeader),
    pngChunk('IDAT', Uint8Array.from([0x00])),
    pngChunk('IEND', new Uint8Array()),
  );
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = asciiBytes(type);
  const output = new Uint8Array(12 + data.byteLength);
  writeU32Be(output, 0, data.byteLength);
  output.set(typeBytes, 4);
  output.set(data, 8);
  writeU32Be(output, 8 + data.byteLength, testCrc32(concat(typeBytes, data)));
  return output;
}

function makeWebp(): Uint8Array {
  return riff('WEBP', [['VP8L', Uint8Array.from([0x2f, 0, 0, 0, 0])]]);
}

function makeWav(): Uint8Array {
  const format = new Uint8Array(16);
  writeU16Le(format, 0, 1);
  writeU16Le(format, 2, 1);
  writeU32Le(format, 4, 8_000);
  writeU32Le(format, 8, 16_000);
  writeU16Le(format, 12, 2);
  writeU16Le(format, 14, 16);
  return riff('WAVE', [
    ['fmt ', format],
    ['data', new Uint8Array(160)],
  ]);
}

function riff(formType: string, chunks: readonly (readonly [string, Uint8Array])[]): Uint8Array {
  const body = concat(
    asciiBytes(formType),
    ...chunks.map(([type, data]) => {
      const output = new Uint8Array(8 + data.byteLength + (data.byteLength % 2));
      output.set(asciiBytes(type), 0);
      writeU32Le(output, 4, data.byteLength);
      output.set(data, 8);
      return output;
    }),
  );
  const output = concat(asciiBytes('RIFF'), new Uint8Array(4), body);
  writeU32Le(output, 4, output.byteLength - 8);
  return output;
}

function makeWebm(): Uint8Array {
  const headerData = ebmlElement([0x42, 0x82], asciiBytes('webm'));
  const header = ebmlElement([0x1a, 0x45, 0xdf, 0xa3], headerData);
  const segmentData = concat(
    ebmlElement([0x16, 0x54, 0xae, 0x6b], new Uint8Array()),
    ebmlElement([0x1f, 0x43, 0xb6, 0x75], new Uint8Array()),
  );
  return concat(header, ebmlElement([0x18, 0x53, 0x80, 0x67], segmentData));
}

function ebmlElement(id: readonly number[], data: Uint8Array): Uint8Array {
  if (data.byteLength >= 127) throw new Error('Test fixture uses only one-byte EBML sizes');
  return concat(Uint8Array.from(id), Uint8Array.from([0x80 | data.byteLength]), data);
}

function concat(...parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function asciiBytes(value: string): Uint8Array {
  const output = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    output[index] = value.charCodeAt(index);
  }
  return output;
}

function writeU16Le(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32Le(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function writeU32Be(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function testCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
