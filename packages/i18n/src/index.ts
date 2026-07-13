import en from './locales/en.json' with { type: 'json' };
import hi from './locales/hi.json' with { type: 'json' };
import mr from './locales/mr.json' with { type: 'json' };

export const supportedLocales = ['en', 'mr', 'hi'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export type MessageKey = keyof typeof en;

export const messages: Record<SupportedLocale, typeof en> = { en, hi, mr };

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.some((locale) => locale === value);
}
