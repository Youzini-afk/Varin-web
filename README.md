# Varin website

The product site for [Varin](https://github.com/Youzini-afk/Varin). Static Astro build, English at `/`,
Simplified Chinese at `/zh-cn/`.

## Commands

Use Node.js 22.12+ and Bun 1.3.14.

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

## Where things live

| Path | Contents |
| --- | --- |
| `src/i18n/` | All page copy. `zh-cn.ts` defines the shape; `en.ts` must match it or type checking fails |
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
