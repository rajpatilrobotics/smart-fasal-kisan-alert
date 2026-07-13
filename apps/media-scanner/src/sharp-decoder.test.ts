import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { SharpImageDecoderAdapter } from './sharp-decoder.js';

describe('SharpImageDecoderAdapter', () => {
  it('decodes within a pixel bound and emits a metadata-stripped derivative', async () => {
    const source = await sharp({
      create: {
        width: 2,
        height: 1,
        channels: 3,
        background: { r: 40, g: 120, b: 60 },
      },
    })
      .withMetadata({ density: 72, orientation: 6 })
      .jpeg()
      .toBuffer();
    const adapter = new SharpImageDecoderAdapter();

    const result = await adapter.decode({
      bytes: source,
      mimeType: 'image/jpeg',
      maximumPixels: 100,
    });

    expect(result.status).toBe('ACCEPTED');
    if (result.status !== 'ACCEPTED') return;
    const metadata = await sharp(result.derivativeBytes).metadata();
    expect(result.metadataStripped).toBe(true);
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.width).toBe(1);
    expect(metadata.height).toBe(2);
  });

  it('fails closed for audio and malformed images', async () => {
    const adapter = new SharpImageDecoderAdapter();

    await expect(
      adapter.decode({
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: 'audio/wav',
        maximumDurationSeconds: 120,
      }),
    ).resolves.toEqual({ status: 'REJECTED', failureCode: 'UNSUPPORTED_CODEC' });
    await expect(
      adapter.decode({
        bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
        mimeType: 'image/jpeg',
        maximumPixels: 100,
      }),
    ).resolves.toEqual({ status: 'REJECTED', failureCode: 'DECODER_REJECTED' });
  });
});
