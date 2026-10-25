# Varin website

The product site for [Varin](https://github.com/Youzini-afk/Varin). Static Astro build in the five languages of
Varin's README:

| Path | Language |
| --- | --- |
| `/` | English |
| `/zh-cn/` | 简体中文 |
| `/zh-tw/` | 繁體中文 |
| `/fr/` | Français |
| `/ja/` | 日本語 |

The root page picks a language before first paint: a choice made in the language menu (stored in
`localStorage` as `varin-web-locale`) wins, otherwise the first supported entry of `navigator.languages`
(`zh-Hant`, `zh-TW`, `zh-HK` and `zh-MO` go to Traditional Chinese). Language pages never redirect, and each
homepage lists the others as `hreflang` alternates.

## Commands

Use Node.js 22.23.4+ (the version Astro requires) and Bun 1.3.14.

```sh
bun install --frozen-lockfile
bun run dev        # local development server
bun run build      # astro check, then static output in dist/
bun run preview    # serve dist/ on http://localhost:4321
```

`bun run verify:screens` renders the running preview in a local Chromium-family browser and writes
screenshots to `.screens/` (light, dark, phone width, every hero stage). It needs `puppeteer-core`, which it
finds in this project or in a Varin checkout (`VARIN_SOURCE_DIR`, default `../Varin`). Set `BROWSER_PATH`
when the browser is not Microsoft Edge on Windows.

## Deployment

Cloudflare Pages, production branch `main`, output directory `dist`. Pages does not recognise Bun's
text `bun.lock`, so its automatic `npm install` is turned off and the build installs from the lockfile itself:

| Setting | Value |
| --- | --- |
| Build command | `bun install --frozen-lockfile && bun run build` |
| Build output directory | `dist` |
| Environment variables | `SKIP_DEPENDENCY_INSTALL=1`, `BUN_VERSION=1.3.14` |

Canonical and `hreflang` links use `https://varin-web.pages.dev`; set `SITE_URL` (for example
`https://varin.example`) once the site has its own domain. Node.js comes from `.node-version`.

Download buttons link straight to the installer for the visitor's system (Windows x64 / ARM64, macOS Apple
silicon, Linux x64 / ARM64), falling back to the release page for phones and unknown systems. The build reads the
latest release from the GitHub API and bakes the links and version in, so they work without JavaScript; if that
request fails, the build still succeeds. After the page loads, the browser asks the same API for the latest release
(cached for ten minutes per tab) and updates the version and links if GitHub has something newer. Optional build
variable: `GITHUB_TOKEN` (any token with public read access) lifts the anonymous API limit on shared build machines. `public/_headers` sets long-lived caching for hashed assets and a few
security headers.

## Where things live

| Path | Contents |
| --- | --- |
| `src/i18n/` | All page copy. `zh-cn.ts` defines the shape and every other locale must match it, or type checking fails. `index.ts` lists the locales |
| `src/pages/` | `index.astro` (English, with language detection), `[locale]/index.astro` (the other four), `404.astro` |
| `src/components/home/` | One component per homepage section |
| `src/lib/scene/` | The hero scene: camera, adaptive tile field, WebGL2 / Canvas 2D floor renderer, scroll choreography |
| `src/lib/motion/` | Shared frame loop, smooth scrolling (Lenis), entry reveals, reduced-motion preferences |
| `src/styles/` | Design tokens (one `light-dark()` value per colour), base rules, the splash scene |
| `src/site.ts` | Repository, release and documentation links |
| `design/` | Approved sketches; not part of the build |

## Notes for changes

- The camera constants, cube geometry, brand mark and avatars come from Varin's own sources
  (`packages/ui/src/components/ui/varin-splash-*.ts`, `varin-mark.ts`, `agent-avatar-art.ts`). Keep them in step
  with the product rather than tuning them here.
- Every product claim on the homepage was checked against the Varin source. Check new claims the same way,
  and do not mention capabilities that are unreleased or broken in the current build.
- Motion: one easing curve (`--ease`), transform/opacity only, looping illustrations pause off screen,
  and `prefers-reduced-motion` gets a complete static page. Content must stay readable without JavaScript.

## License

[GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`), the same as Varin. The splash scene
(camera, tile field and floor renderer) is adapted from Varin's source.
