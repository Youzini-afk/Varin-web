import { defineConfig } from 'astro/config';

// Static output only: every page is prebuilt HTML, interactive parts are small module scripts.
// SITE_URL sets the public origin used for canonical and hreflang links; change it with the domain.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://varin-web.pages.dev',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  devToolbar: { enabled: false },
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
