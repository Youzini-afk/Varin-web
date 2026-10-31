import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { getImage } from 'astro:assets';
import socialCard from '~/assets/social-card.svg';
import { LOCALES, localeInfo } from '~/i18n';
import { docsLocale } from '~/lib/docs';

/**
 * Aligns the guides' metadata with the homepages: the same hreflang and Open Graph locale codes,
 * and the same social preview image.
 */
export const onRequest = defineRouteMiddleware(async (context) => {
  const route = context.locals.starlightRoute;
  const info = localeInfo(docsLocale(route));
  for (const { tag, attrs } of route.head) {
    if (!attrs) continue;
    if (tag === 'link' && attrs.rel === 'alternate' && typeof attrs.hreflang === 'string') {
      const match = LOCALES.find((locale) => locale.htmlLang === attrs.hreflang);
      if (match) attrs.hreflang = match.hreflang;
    }
    if (tag === 'meta' && attrs.property === 'og:locale') attrs.content = info.ogLocale;
  }
  const image = await getImage({ src: socialCard, format: 'png', width: 1200, height: 630 });
  const imageUrl = new URL(image.src, context.site).href;
  const alt = 'Varin · Open-source AI Agent Harness for coding, research and office work';
  route.head.push(
    ...LOCALES.filter((locale) => locale.code !== info.code).map((locale) => ({ tag: 'meta' as const, attrs: { property: 'og:locale:alternate', content: locale.ogLocale } })),
    { tag: 'meta', attrs: { property: 'og:image', content: imageUrl } },
    { tag: 'meta', attrs: { property: 'og:image:type', content: 'image/png' } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: alt } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: imageUrl } },
    { tag: 'meta', attrs: { name: 'twitter:image:alt', content: alt } },
  );
});
