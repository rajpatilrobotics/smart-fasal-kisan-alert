import { describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import MpEntryPage from './page';

describe('MP entry route', () => {
  it('redirects to the real authentication route', () => {
    MpEntryPage();
    expect(redirectMock).toHaveBeenCalledWith('/auth');
  });
});
