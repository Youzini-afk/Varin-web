import { en } from './en';
import { fr } from './fr';
import { ja } from './ja';
import type { Copy, Locale } from './types';
import { zhCN } from './zh-cn';
import { zhTW } from './zh-tw';

export type { Copy, Locale, TeamRole } from './types';

export interface LocaleInfo {
  readonly code: Locale;
  /** URL prefix; empty for the default locale. */
  readonly prefix: string;
  /** Value of the html `lang` attribute. */
  readonly htmlLang: string;
  /** Value used in `hreflang` alternates. */
  readonly hreflang: string;
  /** The language's own name, shown in the language menu. */
  readonly name: string;
  /** Compact label for the navigation bar. */
  readonly short: string;
}

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALES: readonly LocaleInfo[] = [
  { code: 'en', prefix: '', htmlLang: 'en', hreflang: 'en', name: 'English', short: 'EN' },
  { code: 'zh-cn', prefix: '/zh-cn', htmlLang: 'zh-CN', hreflang: 'zh-Hans', name: '简体中文', short: '简' },
  { code: 'zh-tw', prefix: '/zh-tw', htmlLang: 'zh-TW', hreflang: 'zh-Hant', name: '繁體中文', short: '繁' },
  { code: 'fr', prefix: '/fr', htmlLang: 'fr', hreflang: 'fr', name: 'Français', short: 'FR' },
  { code: 'ja', prefix: '/ja', htmlLang: 'ja', hreflang: 'ja', name: '日本語', short: '日' },
];

/** Storage key for an explicit language choice made in the language menu. */
export const LOCALE_STORAGE_KEY = 'varin-web-locale';

const COPY: Record<Locale, Copy> = { en, 'zh-cn': zhCN, 'zh-tw': zhTW, fr, ja };

export const copyFor = (locale: Locale): Copy => COPY[locale];

export const localeInfo = (locale: Locale): LocaleInfo => LOCALES.find((info) => info.code === locale) ?? (LOCALES[0] as LocaleInfo);

export const isLocale = (value: string): value is Locale => LOCALES.some((info) => info.code === value);

/** English lives at the root, other locales under their own prefix, matching the docs routes. */
export const localePath = (locale: Locale, path = '/'): string => {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${localeInfo(locale).prefix}${clean}`;
};
