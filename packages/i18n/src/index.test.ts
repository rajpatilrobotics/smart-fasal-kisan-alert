import { describe, expect, it } from 'vitest';

import { messages, supportedLocales } from './index';

describe('locale catalogs', () => {
  it('keep an identical key set', () => {
    const expected = Object.keys(messages.en).sort();
    for (const locale of supportedLocales) {
      expect(Object.keys(messages[locale]).sort()).toEqual(expected);
    }
  });
});
