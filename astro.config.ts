import { defineConfig } from 'astro/config';

// Static output only: every page is prebuilt HTML, interactive parts are small module scripts.
// SITE_URL sets the public origin used for canonical and hreflang links; change it with the domain.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://varin.dev',
  output: 'static',
  trailingSlash: 'ignore',
  // Rasterize the repository-owned social-card SVG into a PNG for link previews.
  image: { dangerouslyProcessSVG: true },
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
