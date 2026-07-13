import { describe, expect, it } from 'vitest';

import { CreateMediaUploadIntentRequestSchema } from './media/index.js';

const digest = `sha256:${'a'.repeat(64)}`;
const id = '00000000-0000-4000-8000-000000000001';

function request(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    mediaProtocolVersion: 1,
    purpose: 'CROP_HEALTH_IMAGE',
    owner: { ownerType: 'HEALTH_REPORT', ownerId: id },
    expectedSha256: digest,
    claimedMimeType: 'image/jpeg',
    declaredSizeBytes: 1024,
    declaredWidth: 640,
    declaredHeight: 480,
    consentAccessVersion: 1,
    ...overrides,
  };
}

describe('media upload intent contract', () => {
  it('binds each purpose to its owner type and media family', () => {
    expect(
      CreateMediaUploadIntentRequestSchema.safeParse(
        request({ owner: { ownerType: 'DIARY_ENTRY', ownerId: id } }),
      ).success,
    ).toBe(false);
    expect(
      CreateMediaUploadIntentRequestSchema.safeParse(request({ claimedMimeType: 'audio/wav' }))
        .success,
    ).toBe(false);
  });

  it('requires image dimensions and applies the ten MiB crop-health ceiling', () => {
    expect(
      CreateMediaUploadIntentRequestSchema.safeParse(
        request({ declaredWidth: undefined, declaredHeight: undefined }),
      ).success,
    ).toBe(false);
    expect(
      CreateMediaUploadIntentRequestSchema.safeParse(
        request({ declaredSizeBytes: 10 * 1024 * 1024 + 1 }),
      ).success,
    ).toBe(false);
  });

  it('accepts a correctly bound offline voice intent', () => {
    expect(
      CreateMediaUploadIntentRequestSchema.safeParse({
        ...request({
          purpose: 'VOICE_OFFLINE_AUDIO',
          owner: { ownerType: 'VOICE_SESSION', ownerId: id },
          claimedMimeType: 'audio/wav',
          declaredWidth: undefined,
          declaredHeight: undefined,
          declaredDurationSeconds: 4,
        }),
      }).success,
    ).toBe(true);
  });
});
