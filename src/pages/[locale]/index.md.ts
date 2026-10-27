import type { APIRoute, GetStaticPaths } from 'astro';
import { DEFAULT_LOCALE, LOCALES, isLocale } from '~/i18n';
import { homeMarkdown } from '~/lib/agent-content';

export const getStaticPaths: GetStaticPaths = () => LOCALES
  .filter((info) => info.code !== DEFAULT_LOCALE)
  .map((info) => ({ params: { locale: info.code } }));

export const GET: APIRoute = ({ params, site }) => {
  if (!params.locale || !isLocale(params.locale)) throw new Error(`Unknown locale ${String(params.locale)}`);
  return new Response(homeMarkdown(params.locale, site!), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
