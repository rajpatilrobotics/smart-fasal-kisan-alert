import { describe, expect, it } from 'vitest';

import { isSupportedLocale, messages, supportedLocales } from './index';

describe('locale catalogs', () => {
  it('keep an identical key set', () => {
    const expected = Object.keys(messages.en).sort();
    for (const locale of supportedLocales) {
      expect(Object.keys(messages[locale]).sort()).toEqual(expected);
    }
  });

  it('recognizes only the three approved interface locales', () => {
    expect(isSupportedLocale('mr')).toBe(true);
    expect(isSupportedLocale('hi')).toBe(true);
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
  });
});
