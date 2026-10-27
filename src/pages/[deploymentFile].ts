import type { APIRoute, GetStaticPaths } from 'astro';
import { LOCALES, localePath } from '~/i18n';

// Astro ignores source files starting with "_"; a static path emits Cloudflare's reserved filename.
export const getStaticPaths: GetStaticPaths = () => [{ params: { deploymentFile: '_headers' } }];

/** Cloudflare Pages reads this build artifact. Astro's static endpoints cannot persist response headers. */
export const GET: APIRoute = ({ site }) => {
  const absolute = (path: string): string => new URL(path, site).href;
  const markdownHeaders = LOCALES.map((info) => `${localePath(info.code, '/index.md')}
  Content-Type: text/markdown; charset=utf-8
  Link: <${absolute(localePath(info.code))}>; rel="canonical", <${absolute('/llms.txt')}>; rel="describedby"`).join('\n\n');
  return new Response(`# Cloudflare Pages response headers, generated with the configured SITE_URL.
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

${markdownHeaders}

/llms.txt
  Content-Type: text/plain; charset=utf-8

/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  Link: <${absolute('/')}>; rel="canonical", <${absolute('/llms.txt')}>; rel="describedby"

/sitemap.xml
  Content-Type: application/xml; charset=utf-8

/404.html
  X-Robots-Tag: noindex
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
