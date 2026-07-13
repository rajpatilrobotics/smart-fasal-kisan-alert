import sharp from 'sharp';

import type { DecoderResult, MediaDecoderAdapter, MediaMimeType } from './verification.js';

const FORMAT_BY_MIME: Readonly<Partial<Record<MediaMimeType, 'jpeg' | 'png' | 'webp'>>> =
  Object.freeze({
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
  });

export class SharpImageDecoderAdapter implements MediaDecoderAdapter {
  readonly availability = { status: 'AVAILABLE' } as const;

  async decode(input: {
    bytes: Uint8Array;
    mimeType: MediaMimeType;
    maximumPixels?: number;
    maximumDurationSeconds?: number;
  }): Promise<DecoderResult> {
    const expectedFormat = FORMAT_BY_MIME[input.mimeType];
    if (expectedFormat === undefined || input.maximumPixels === undefined) {
      return { status: 'REJECTED', failureCode: 'UNSUPPORTED_CODEC' };
    }

    try {
      const source = sharp(input.bytes, {
        failOn: 'warning',
        limitInputPixels: input.maximumPixels,
        sequentialRead: true,
      });
      const sourceMetadata = await source.metadata();
      const sourceDimensions = sourceMetadata as { width?: number; height?: number };
      if (
        sourceMetadata.format !== expectedFormat ||
        sourceDimensions.width === undefined ||
        sourceDimensions.height === undefined ||
        (sourceMetadata.pages ?? 1) !== 1
      ) {
        return { status: 'REJECTED', failureCode: 'DECODER_REJECTED' };
      }
      if (sourceDimensions.width * sourceDimensions.height > input.maximumPixels) {
        return { status: 'REJECTED', failureCode: 'DIMENSION_LIMIT_EXCEEDED' };
      }

      let derivativePipeline = source.rotate();
      switch (expectedFormat) {
        case 'jpeg':
          derivativePipeline = derivativePipeline.jpeg({ quality: 90 });
          break;
        case 'png':
          derivativePipeline = derivativePipeline.png({ compressionLevel: 9 });
          break;
        case 'webp':
          derivativePipeline = derivativePipeline.webp({ effort: 4, quality: 90 });
          break;
      }
      const derivativeBytes = await derivativePipeline.toBuffer();
      const derivativeMetadata = await sharp(derivativeBytes, {
        failOn: 'warning',
        limitInputPixels: input.maximumPixels,
      }).metadata();
      const derivativeDimensions = derivativeMetadata as { width?: number; height?: number };
      if (
        derivativeMetadata.format !== expectedFormat ||
        derivativeDimensions.width === undefined ||
        derivativeDimensions.height === undefined ||
        derivativeDimensions.width * derivativeDimensions.height > input.maximumPixels
      ) {
        return { status: 'REJECTED', failureCode: 'DECODER_REJECTED' };
      }

      return {
        status: 'ACCEPTED',
        derivativeBytes,
        derivativeMimeType: input.mimeType,
        metadataStripped: true,
        decoderVersion: `sharp-${sharp.versions.sharp}`,
        width: derivativeDimensions.width,
        height: derivativeDimensions.height,
      };
    } catch {
      return { status: 'REJECTED', failureCode: 'DECODER_REJECTED' };
    }
  }
}
