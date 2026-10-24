import { defineConfig } from 'astro/config';

// Static output only: every page is prebuilt HTML, interactive parts are small module scripts.
export default defineConfig({
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
