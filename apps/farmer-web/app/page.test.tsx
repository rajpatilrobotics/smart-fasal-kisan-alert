import { describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import FarmerEntryPage from './page';

describe('Farmer entry route', () => {
  it('redirects to the real authentication route', () => {
    FarmerEntryPage();
    expect(redirectMock).toHaveBeenCalledWith('/auth');
  });
});
