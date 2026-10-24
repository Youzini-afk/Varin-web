import { en } from './en';
import type { Copy, Locale } from './types';
import { zhCN } from './zh-cn';

export type { Copy, Locale, TeamRole } from './types';

export const LOCALES: readonly Locale[] = ['en', 'zh-cn'];
export const DEFAULT_LOCALE: Locale = 'en';

const COPY: Record<Locale, Copy> = { en, 'zh-cn': zhCN };

export const copyFor = (locale: Locale): Copy => COPY[locale];

/** English lives at the root, other locales under their own prefix, matching the docs routes. */
export const localePath = (locale: Locale, path = '/'): string => {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return locale === DEFAULT_LOCALE ? clean : `/${locale}${clean === '/' ? '/' : clean}`;
};

export const otherLocale = (locale: Locale): Locale => (locale === 'en' ? 'zh-cn' : 'en');
