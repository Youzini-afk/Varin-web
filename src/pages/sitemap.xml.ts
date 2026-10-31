import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { DEFAULT_LOCALE, LOCALES, localePath } from '~/i18n';
import { docsEntryPath } from '~/lib/docs';
import { xmlEscape } from '~/lib/seo';

/** Only canonical HTML pages belong here: the homepages and the user guides. Markdown copies and the 404 stay out. */
export const GET: APIRoute = async ({ site }) => {
  const absolute = (path: string): string => xmlEscape(new URL(path, site).href);
  // Every guide exists in every language; Starlight serves the English text where a translation is missing.
  const guides = (await getCollection('docs'))
    .map((entry) => docsEntryPath(entry.id))
    .filter((entry) => entry.locale === DEFAULT_LOCALE)
    .map((entry) => entry.path)
    .sort();
  const urls = ['/', ...guides].flatMap((path) => {
    const alternates = [
      ...LOCALES.map((info) => `<xhtml:link rel="alternate" hreflang="${info.hreflang}" href="${absolute(localePath(info.code, path))}" />`),
      `<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(localePath(DEFAULT_LOCALE, path))}" />`,
    ].join('\n');
    return LOCALES.map((info) => `<url>\n<loc>${absolute(localePath(info.code, path))}</loc>\n${alternates}\n</url>`);
  }).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
