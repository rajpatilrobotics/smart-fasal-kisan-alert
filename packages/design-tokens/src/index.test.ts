import { describe, expect, it } from 'vitest';

import { color, radius, space } from './index';

describe('design tokens', () => {
  it('provides visible focus and minimum control foundations', () => {
    expect(color.focus).not.toBe(color.canvas);
    expect(radius.control).toBe('0.75rem');
    expect(space[4]).toBe('1rem');
  });
});
