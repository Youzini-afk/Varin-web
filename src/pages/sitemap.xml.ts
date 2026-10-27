import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, LOCALES, localePath } from '~/i18n';
import { xmlEscape } from '~/lib/seo';

/** Only canonical HTML pages belong here; Markdown copies and the 404 stay out. */
export const GET: APIRoute = ({ site }) => {
  const absolute = (path: string): string => xmlEscape(new URL(path, site).href);
  const alternates = [
    ...LOCALES.map((info) => `<xhtml:link rel="alternate" hreflang="${info.hreflang}" href="${absolute(localePath(info.code))}" />`),
    `<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(localePath(DEFAULT_LOCALE))}" />`,
  ].join('\n');
  const urls = LOCALES.map((info) => `<url>\n<loc>${absolute(localePath(info.code))}</loc>\n${alternates}\n</url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
