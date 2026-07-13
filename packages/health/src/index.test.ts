import { describe, expect, it } from 'vitest';

import { createHealthPayload } from './index';

describe('createHealthPayload', () => {
  it('creates an ISO-dated platform health response', () => {
    const payload = createHealthPayload('farmer-web', 'ok');
    expect(payload).toMatchObject({ service: 'farmer-web', status: 'ok' });
    expect(Number.isNaN(Date.parse(payload.timestamp))).toBe(false);
  });
});
