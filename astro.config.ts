import { existsSync, readFileSync } from 'node:fs';
import starlight from '@astrojs/starlight';
import type { AstroIntegration } from 'astro';
import { defineConfig } from 'astro/config';
import { copyFor, DEFAULT_LOCALE, LOCALES } from './src/i18n';
import { localeRedirectScript } from './src/lib/locale-redirect';
import { REPO_URL } from './src/site';

// The user guides come from the product repository. scripts/sync-docs.mjs copies them into src/content/docs/
// and maps packages/docs/sidebar.config.json to src/generated/docs-sidebar.json; the package scripts run it first.
const sidebarFile = new URL('./src/generated/docs-sidebar.json', import.meta.url);
if (!existsSync(sidebarFile)) throw new Error('The user guides are not synced yet. Run `bun run sync:docs` first.');
const sidebar = JSON.parse(readFileSync(sidebarFile, 'utf8'));

// Starlight adds @astrojs/sitemap unless an integration with that name is present. The site writes its own
// sitemap.xml (homepages and guides with their hreflang alternates), so this empty entry takes the slot.
const ownSitemap: AstroIntegration = { name: '@astrojs/sitemap', hooks: {} };

// Starlight switches Astro to `where` style scoping. That lowers the specificity of every component style on the
// homepage and changes how they combine with base.css (the closing paragraph lost its centring). `class` scoping
// gives the homepage the same specificity as Astro's default `attribute` scoping, and, like `where`, carries a
// component's scope onto the child components it styles, which Starlight relies on (sidebar carets, icons).
// Starlight's own component styles sit in cascade layers, so the higher specificity does not change their order.
const classScopedStyles: AstroIntegration = {
  name: 'varin:class-scoped-styles',
  hooks: { 'astro:config:setup': ({ updateConfig }) => { updateConfig({ scopedStyleStrategy: 'class' }); } },
};

// Static output only: every page is prebuilt HTML, interactive parts are small module scripts.
// SITE_URL sets the public origin used for canonical and hreflang links; change it with the domain.
const site = process.env.SITE_URL ?? 'https://varin.dev';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  // Starlight would otherwise turn on link prefetching for every page, including the homepages.
  prefetch: false,
  // Rasterize the repository-owned social-card SVG into a PNG for link previews.
  image: { dangerouslyProcessSVG: true },
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  devToolbar: { enabled: false },
  integrations: [
    ownSitemap,
    starlight({
      // Locales and their URL prefixes are the homepage's: English at /docs/, the others at /{locale}/docs/.
      title: Object.fromEntries(LOCALES.map((info) => [info.htmlLang, `Varin ${copyFor(info.code).nav.docs}`])),
      titleDelimiter: '·',
      defaultLocale: 'root',
      locales: Object.fromEntries(LOCALES.map((info) => [
        info.code === DEFAULT_LOCALE ? 'root' : info.code,
        { label: info.name, lang: info.htmlLang },
      ])),
      sidebar,
      social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
      favicon: '/favicon.svg',
      head: [
        // The English guides' entry page sends first-time visitors to their language; the script returns
        // immediately on every other guide page (src/lib/locale-redirect.ts).
        { tag: 'script', content: localeRedirectScript(Object.fromEntries(LOCALES.map((info) => [info.code, info.prefix])), ['/docs/']) },
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon-32.png', sizes: '32x32', type: 'image/png' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#fcfbf9' } },
        { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#161616' } },
        { tag: 'meta', attrs: { name: 'robots', content: 'index, follow, max-image-preview:large' } },
        { tag: 'link', attrs: { rel: 'sitemap', href: '/sitemap.xml' } },
        { tag: 'link', attrs: { rel: 'describedby', type: 'text/plain', href: new URL('/llms.txt', site).href, title: 'Varin agent reading guide' } },
      ],
      customCss: [
        '@fontsource-variable/inter',
        '@fontsource-variable/jetbrains-mono',
        './src/styles/tokens.css',
        './src/styles/docs.css',
      ],
      components: {
        SiteTitle: './src/components/docs/SiteTitle.astro',
        ThemeProvider: './src/components/docs/ThemeProvider.astro',
        ThemeSelect: './src/components/docs/ThemeSelect.astro',
        LanguageSelect: './src/components/docs/LanguageSelect.astro',
      },
      routeMiddleware: './src/lib/docs-route-data.ts',
      // Code panels stay dark in both appearances, like the homepage's (--code).
      expressiveCode: {
        themes: ['github-dark-default'],
        styleOverrides: {
          borderRadius: '12px',
          borderColor: 'transparent',
          codeBackground: 'var(--code)',
          codeFontFamily: 'var(--mono)',
          codeFontSize: '13.5px',
          uiFontFamily: 'var(--sans)',
          frames: {
            editorTabBarBackground: 'var(--code)',
            editorActiveTabBackground: 'var(--code)',
            terminalBackground: 'var(--code)',
            terminalTitlebarBackground: 'color-mix(in srgb, var(--code) 96%, #fff)',
            terminalTitlebarBorderBottomColor: 'rgba(255, 255, 255, 0.06)',
            frameBoxShadowCssValue: 'none',
          },
        },
      },
      // The site's own 404 page serves every path, including /docs/.
      disable404Route: true,
    }),
    classScopedStyles,
  ],
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
