import { describe, expect, it, vi } from 'vitest';

import { registerFarmerServiceWorker } from './service-worker-registration';

describe('Farmer service-worker registration', () => {
  it('registers the one Farmer worker without using the HTTP cache', async () => {
    const register = vi.fn().mockResolvedValue({});
    await expect(registerFarmerServiceWorker({ serviceWorker: { register } })).resolves.toBe(true);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
  });

  it('keeps the connected app usable when workers are unsupported or registration fails', async () => {
    await expect(registerFarmerServiceWorker({})).resolves.toBe(false);
    await expect(
      registerFarmerServiceWorker({
        serviceWorker: { register: vi.fn().mockRejectedValue(new Error('blocked')) },
      }),
    ).resolves.toBe(false);
  });
});
