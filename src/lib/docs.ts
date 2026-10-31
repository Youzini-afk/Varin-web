import type { CollectionEntry } from 'astro:content';
import sidebar from '~/generated/docs-sidebar.json';
import { DEFAULT_LOCALE, isLocale, localeInfo, type Locale } from '~/i18n';

/**
 * The user guides are rendered by Starlight from src/content/docs/, which scripts/sync-docs.mjs copies from the
 * product repository. English lives at /docs/, translations at /{locale}/docs/, beside the homepages.
 */
export const DOCS_PATH = '/docs/';

/** Starlight names the root locale `undefined` and the others by their URL prefix, the same codes as the homepage. */
export const docsLocale = (route: { locale: string | undefined }): Locale =>
  route.locale && isLocale(route.locale) ? route.locale : DEFAULT_LOCALE;

/** The page path without its locale prefix, e.g. /zh-tw/docs/install/ → /docs/install/. */
export const docsPath = (pathname: string, locale: Locale): string => {
  const { prefix } = localeInfo(locale);
  const path = prefix && pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
  return path.endsWith('/') ? path : `${path}/`;
};

/** Collection ids are the slug, prefixed for translations: docs/install, zh-tw/docs/install. */
export const docsEntryPath = (id: string): { locale: Locale; path: string } => {
  const [first = '', ...rest] = id.split('/');
  const locale = isLocale(first) && first !== DEFAULT_LOCALE ? first : DEFAULT_LOCALE;
  const slug = locale === DEFAULT_LOCALE ? id : rest.join('/');
  return { locale, path: `/${slug}/` };
};

interface SidebarItem {
  readonly label: string;
  readonly slug?: string;
  readonly items?: readonly SidebarItem[];
}

export interface Guide {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly body: string;
}

export interface GuideSection {
  readonly label: string;
  readonly guides: readonly Guide[];
}

/** English guides grouped and ordered like the docs sidebar (packages/docs/sidebar.config.json). */
export const englishGuides = (entries: readonly CollectionEntry<'docs'>[]): GuideSection[] => {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const slugs = (items: readonly SidebarItem[]): string[] =>
    items.flatMap((item) => (item.items ? slugs(item.items) : item.slug ? [item.slug] : []));
  return (sidebar as readonly SidebarItem[]).map((section) => ({
    label: section.label,
    guides: slugs(section.items ?? [section]).flatMap((slug) => {
      const entry = byId.get(slug);
      if (!entry) return [];
      return [{ title: entry.data.title, description: entry.data.description ?? '', path: docsEntryPath(entry.id).path, body: entry.body ?? '' }];
    }),
  }));
};
