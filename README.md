# Varin website

The product site for [Varin](https://github.com/Youzini-afk/Varin): homepages and the user guides. Static Astro
build in the five languages of Varin's README:

| Homepage | User guides | Language |
| --- | --- | --- |
| `/` | `/docs/` | English |
| `/zh-cn/` | `/zh-cn/docs/` | 简体中文 |
| `/zh-tw/` | `/zh-tw/docs/` | 繁體中文 |
| `/fr/` | `/fr/docs/` | Français |
| `/ja/` | `/ja/docs/` | 日本語 |

Each URL always serves its own language, including English at `/`. Visitors choose a language through
ordinary links in the menu or footer. Browser settings and stored preferences never redirect a shared URL.
Every page lists the other languages as `hreflang` alternates.

## Commands

Use Node.js 22.23.4+ (the version Astro requires) and Bun 1.3.14.

```sh
bun install --frozen-lockfile
bun run dev        # sync the user guides, then the local development server
bun run build      # sync the user guides, astro check, then static output in dist/
bun run preview    # serve dist/ on http://localhost:4321
bun run sync:docs  # only copy the user guides from the product repository (see below)
bun run verify:seo # check built metadata, sitemap, internal links, agent documents and deployment headers
```

Search in the user guides (Pagefind) is built by `bun run build`; the development server shows a placeholder instead.

`bun run verify:screens` renders the running preview in a local Chromium-family browser and writes
screenshots to `.screens/` (light, dark, phone width, every hero stage). It needs `puppeteer-core`, which it
finds in this project or in a Varin checkout (`VARIN_SOURCE_DIR`, default `../Varin`). Set `BROWSER_PATH`
when the browser is not Microsoft Edge on Windows.

## User guides

The guides are written in the product repository, in
[`packages/docs`](https://github.com/Youzini-afk/Varin/tree/main/packages/docs): MDX pages in `content/docs/`
(English at the root, translations in `zh-cn/`, `zh-tw/`, `fr/`, `ja/`) and the navigation in
`sidebar.config.json`. Edit and validate them there (`bun run docs:validate`), never in this repository.
[Starlight](https://starlight.astro.build/) renders them here with the site's tokens, fonts, appearance switch,
language menu and Varin mark, plus Pagefind search.

`scripts/sync-docs.mjs` runs before `dev`, `check` and `build`. It rewrites `src/content/docs/` and
`src/generated/docs-sidebar.json` (both gitignored) from the first source it finds:

1. `VARIN_DOCS_DIR`: a `packages/docs` directory, or a Varin checkout that contains one;
2. the sibling checkout `../Varin/packages/docs`;
3. a shallow, blobless, sparse clone of `https://github.com/Youzini-afk/Varin` with only `packages/docs`, at
   `VARIN_DOCS_REF` (branch, tag or full commit hash; default `main`), cached in `node_modules/.cache/varin-docs`.

While copying it:

- moves English pages under `docs/` and each translation under `<locale>/docs/`, so `install.mdx` is served at
  `/docs/install/` and `zh-tw/install.mdx` at `/zh-tw/docs/install/`;
- rewrites root-relative links outside code: `/install/` → `/docs/install/`, `/zh-cn/install/` →
  `/zh-cn/docs/install/`, `/` → `/docs/`. External links, anchors and relative paths (images) are unchanged;
- drops a first `# Heading` that repeats the frontmatter title, since Starlight already shows the title;
- ignores top-level folders for languages the site does not serve, and logs them;
- maps each sidebar link to a Starlight slug and keeps the `zh-CN`, `zh-TW`, `fr` and `ja` labels.

A language without a translation folder still gets every page: Starlight shows the English text with a notice.
The locale list in the script follows `src/i18n/index.ts`; add a language to both.

## Deployment

Cloudflare Pages, production branch `main`, output directory `dist`. Pages does not recognise Bun's
text `bun.lock`, so its automatic `npm install` is turned off and the build installs from the lockfile itself:

| Setting | Value |
| --- | --- |
| Build command | `bun install --frozen-lockfile && bun run build` |
| Build output directory | `dist` |
| Environment variables | `SKIP_DEPENDENCY_INSTALL=1`, `BUN_VERSION=1.3.14`; optional `VARIN_DOCS_REF` |

Cloudflare has no sibling checkout, so each build clones the guides from the product repository's `main`
(about half a megabyte). A change to the guides therefore reaches the site only when Pages rebuilds: a Pages
deploy hook, to be triggered from the product repository when `packages/docs` changes, will start that rebuild.
Until then, retry the latest deployment in the Cloudflare dashboard after the guides change.

Canonical and `hreflang` links, the sitemap, structured data and agent documents use the production origin
`https://varin.dev`. Set `SITE_URL` only to build for a different public origin; the value must be that origin,
even when inspecting a preview build.
Node.js comes from `.node-version`.

Download buttons link straight to the installer for the visitor's system (Windows x64 / ARM64, macOS Apple
silicon, Linux x64 / ARM64), falling back to the release page for phones and unknown systems. The build reads the
latest release from the GitHub API and bakes the links and version in, so they work without JavaScript; if that
request fails, the build still succeeds. After the page loads, the browser asks the same API for the latest release
(cached for ten minutes per tab) and updates the version and links if GitHub has something newer. Optional build
variable: `GITHUB_TOKEN` (any token with public read access) lifts the anonymous API limit on shared build machines.
The build generates Cloudflare's `_headers` file with asset caching, security headers, Markdown content types
and canonical HTTP links. These headers are applied by Cloudflare Pages; Astro preview does not apply them.

## Search and agent discovery

- `/robots.txt` permits crawling and points to `/sitemap.xml`. The sitemap lists the five canonical HTML
  homepages and every user guide in the five languages, each with reciprocal language alternates; the 404 and
  text copies are excluded. Starlight's own sitemap is turned off so there is one sitemap.
- Guide pages carry canonical and `hreflang` links with the homepage's language codes (`zh-Hans`, `zh-Hant`),
  the same Open Graph image and the `describedby` link to `/llms.txt`.
- Homepages include localized titles and descriptions, canonical/hreflang links, WebSite/WebPage/SoftwareSourceCode
  JSON-LD and a 1200 × 630 PNG for Open Graph and Twitter previews. The source SVG is in `src/assets/`.
- `/llms.txt` is a short agent discovery guide following the [llms.txt proposal](https://llmstxt.org/).
  It links to five localized overviews, the user guides in each language, every English guide (grouped like the
  docs sidebar, with its description) and the guide sources in the product repository.
- `/index.md`, `/zh-cn/index.md`, `/zh-tw/index.md`, `/fr/index.md` and `/ja/index.md` contain product
  overviews generated from the same translation objects as the homepage. They include canonical URLs,
  source section links, feature descriptions and resources. Navigation, animation and illustrative demo
  conversations are omitted. `/llms-full.txt` offers the English overview followed by every English user guide
  as a single plain-text response.
- HTML heads advertise their Markdown counterpart with `rel="alternate" type="text/markdown"` and the
  discovery guide with `rel="describedby"`. Markdown responses use canonical HTTP links to their HTML page.
- The overview refers to the latest release page instead of duplicating a version that may become stale.
  New product copy should be edited in `src/i18n/`, then all representations regenerated by the build.

After deployment, submit the production `/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
Inspect a deployed homepage and `/zh-cn/index.md` to confirm that Cloudflare serves the intended status,
content type and canonical URL, and that any dashboard bot settings permit the desired crawlers.
Search indexing depends on the deployed site and search engine processing; `llms.txt` is an additional
reading entry point for agents, rather than a search ranking requirement.

## Where things live

| Path | Contents |
| --- | --- |
| `src/i18n/` | All page copy. `zh-cn.ts` defines the shape and every other locale must match it, or type checking fails. `index.ts` lists the locales |
| `src/pages/` | HTML homepages, 404, sitemap, robots, Markdown/llms endpoints and generated deployment headers |
| `scripts/sync-docs.mjs` | Copies the user guides from the product repository (see [User guides](#user-guides)) |
| `src/content/docs/`, `src/generated/` | Synced guides and sidebar; generated, gitignored |
| `src/components/docs/`, `src/styles/docs.css` | Starlight overrides: header brand, appearance switch, language menu, colours and type |
| `src/lib/docs.ts`, `src/lib/docs-route-data.ts` | Docs locale and path helpers, guide list for agents, guide metadata |
| `src/lib/agent-content.ts` | Agent discovery guide and localized product overviews, built from the existing translations |
| `src/lib/seo.ts` | Structured data and safe JSON/XML serialization |
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
- Starlight sets site-wide options; `astro.config.ts` puts back what the homepage needs: `class` style scoping
  (Starlight's `where` scoping changes how homepage component styles combine with `base.css`), no link prefetching,
  the site's own sitemap and 404. Check the homepage after upgrading Starlight.

## License

[GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`), the same as Varin. The splash scene
(camera, tile field and floor renderer) is adapted from Varin's source.
