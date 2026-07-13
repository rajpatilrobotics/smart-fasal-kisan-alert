import { describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import RskEntryPage from './page';

describe('RSK entry route', () => {
  it('redirects to the real authentication route', () => {
    RskEntryPage();
    expect(redirectMock).toHaveBeenCalledWith('/auth');
  });
});
