import { onFrame } from '../motion/ticker';
import { prefersLightweightScene, prefersReducedMotion } from '../motion/preferences';
import { onThemeChange } from '../theme';
import { CAMERA_TILT_DEG, clamp, cubicEase, mix, smoothstep } from './camera';
import { breathesInCycle, buildField, type Tile } from './field';
import { TILE_STRIDE, createFloorRenderer, resolveColor, type FloorRenderer } from './floor-renderer';

/**
 * The hero: the product's startup scene, driven by scroll instead of time.
 *
 *   0.00 – 0.40  the camera lifts from 58° to straight overhead while the origin rises to mid-screen
 *   0.00 – 0.26  the headline block drifts up and out
 *   0.36 – 0.58  the cube presses into its own cell; its faces go just before the cell lights
 *   0.56 – 0.95  tiles leave from the cube outward, scattering and shrinking like the product reveal
 * The next section starts sliding over the hero at 0.5 (see Team.astro), so the floor dissolves under
 * arriving content rather than leaving an empty screen.
 *
 * The Canvas floor and the DOM cube are written from the same frame, so they never disagree.
 */
const ORIGIN_START = 0.74;
const ORIGIN_END = 0.52;
const BREATHE_SHARE = 0.1;
const BREATHE_CYCLE_MS = 2800;
const BREATHE_START_MS = 1200;
/** How far the resting cube reaches above and below its cell centre on screen, before `--scene-scale`. */
const CUBE_ABOVE = 118;
const CUBE_BELOW = 38;
/** Air between the last line of the headline block and the top of the cube. */
const COPY_GAP = 30;
/**
 * The bottom 16% of the hero fades into the page (Hero.astro `.hero::after`). The cube's lowest corner may dip
 * into the top of that fade, never below 88% of the hero.
 */
const CUBE_LOWEST_SHARE = 0.88;

interface Layout { width: number; height: number; scale: number; start: number; trackTop: number; scrollable: number; hintRoom: boolean }

export const mountHeroScene = (track: HTMLElement): void => {
  const hero = track.querySelector<HTMLElement>('[data-hero]');
  const scene = track.querySelector<HTMLElement>('.scene');
  const canvas = track.querySelector<HTMLCanvasElement>('canvas.scene-floor');
  const copy = track.querySelector<HTMLElement>('[data-hero-copy]');
  const hint = track.querySelector<HTMLElement>('[data-hero-hint]');
  if (!hero || !scene || !canvas) return;

  const renderer: FloorRenderer | null = createFloorRenderer(canvas);
  if (!renderer) return;
  scene.dataset.floor = 'canvas';

  const reduced = prefersReducedMotion();
  const lightweight = prefersLightweightScene();
  const seed = (() => {
    try { return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0x02f6e2b1; } catch { return 0x02f6e2b1; }
  })();

  let layout: Layout = { width: 1, height: 1, scale: 1, start: ORIGIN_START, trackTop: 0, scrollable: 0, hintRoom: true };
  let tiles: Tile[] = [];
  let data = new Float32Array(0);
  const startedAt = performance.now();
  let lastProgress = -1;
  let visible = true;
  let stopFrames: (() => void) | null = null;

  const recolor = (): void => {
    renderer.setColors({
      background: resolveColor(scene, 'var(--paper)'),
      line: resolveColor(scene, 'var(--scene-line)'),
      pulse: resolveColor(scene, 'var(--scene-pulse)'),
    });
    lastProgress = -1;
  };

  const measure = (): void => {
    const rect = track.getBoundingClientRect();
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    const scale = Number.parseFloat(getComputedStyle(scene).getPropertyValue('--scene-scale')) || 1;
    // The headline block's height depends on language, fonts and width. The cube's cell starts at the
    // product's 74% and moves down only as far as needed to stay clear of it, never into the bottom fade.
    // offsetTop/offsetHeight ignore the scroll transforms applied to the copy below.
    const copyBottom = copy ? copy.offsetTop + copy.offsetHeight : 0;
    const lowest = height * CUBE_LOWEST_SHARE - CUBE_BELOW * scale;
    const wanted = copyBottom + CUBE_ABOVE * scale + COPY_GAP;
    const originPx = Math.max(height * ORIGIN_START, Math.min(wanted, lowest));
    const start = originPx / height;
    const hintRoom = !hint || originPx + CUBE_BELOW * scale + 16 <= hint.offsetTop;
    layout = { width, height, scale, start, trackTop: rect.top + window.scrollY, scrollable: Math.max(0, track.offsetHeight - height), hintRoom };
    scene.style.setProperty('--origin-y', `${originPx.toFixed(1)}px`);
    renderer.resize(width, height, Math.min(window.devicePixelRatio || 1, 2));
    tiles = buildField({ width, height, originYs: [originPx, height * ORIGIN_END], scale, seed });
    data = new Float32Array(tiles.length * TILE_STRIDE);
    lastProgress = -1;
  };

  const progress = (): number => (layout.scrollable > 0 ? clamp((window.scrollY - layout.trackTop) / layout.scrollable) : 0);

  const written = new Map<string, string>();
  const setVar = (name: string, value: string): void => {
    if (written.get(name) === value) return;
    written.set(name, value);
    scene.style.setProperty(name, value);
  };

  const render = (now: number): void => {
    const p = progress();
    const breathing = !reduced && !lightweight && p < 0.6;
    if (p === lastProgress && !breathing) return;
    lastProgress = p;

    const lift = cubicEase(clamp(p / 0.4), 0.4, 0.2);
    const tilt = CAMERA_TILT_DEG * (1 - lift);
    const originY = layout.height * mix(layout.start, ORIGIN_END, lift);
    const pressK = cubicEase(clamp((p - 0.36) / 0.22), 0.3, 0.2);
    const reveal = clamp((p - 0.56) / 0.39);

    setVar('--tilt', `${tilt.toFixed(3)}deg`);
    setVar('--lift', `${(originY - layout.height * layout.start).toFixed(2)}px`);
    setVar('--mask-y', `${originY.toFixed(1)}px`);
    setVar('--press', `${mix(48, -54, pressK).toFixed(2)}px`);
    setVar('--faces', (1 - smoothstep(0.72, 0.86, pressK)).toFixed(3));
    setVar('--contact', mix(0.3, 0.95, smoothstep(0.4, 0.9, pressK)).toFixed(3));
    setVar('--contact-lit', smoothstep(0.5, 0.9, pressK).toFixed(3));
    setVar('--contact-alive', (1 - smoothstep(0, 0.12, reveal)).toFixed(3));
    scene.classList.toggle('is-idle', p < 0.01 && !reduced);

    if (copy) {
      const k = clamp(p / 0.26);
      copy.style.opacity = (1 - k).toFixed(3);
      copy.style.transform = k > 0 ? `translateY(${(-56 * k).toFixed(1)}px)` : '';
      copy.style.filter = k > 0.01 ? `blur(${(8 * k).toFixed(2)}px)` : '';
      copy.style.visibility = k >= 1 ? 'hidden' : '';
    }
    // On short screens the cube can sit where the scroll hint would be; the hint then steps aside.
    if (hint) hint.style.opacity = layout.hintRoom ? (1 - clamp(p / 0.06)).toFixed(3) : '0';

    const elapsed = now - startedAt;
    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index] as Tile;
      const local = clamp((reveal - 0.5 * tile.order) / 0.5);
      const eased = local <= 0 ? 0 : local >= 1 ? 1 : cubicEase(local, 0.32, 0.24);
      let fillMix = smoothstep(0, 0.32, local);
      if (breathing) {
        const breathed = elapsed - BREATHE_START_MS - tile.breatheDelayMs;
        if (breathed >= 0) {
          const cycle = Math.floor(breathed / BREATHE_CYCLE_MS);
          if (breathesInCycle(tile.row, tile.col, cycle, BREATHE_SHARE, seed)) {
            const phase = (breathed % BREATHE_CYCLE_MS) / BREATHE_CYCLE_MS;
            fillMix = Math.max(fillMix, (1 - Math.cos(phase * Math.PI * 2)) / 2);
          }
        }
      }
      const offset = index * TILE_STRIDE;
      data[offset] = tile.x + tile.scatterX * eased;
      data[offset + 1] = tile.y + tile.scatterY * eased;
      data[offset + 2] = mix(1, 0.56, eased);
      data[offset + 3] = local <= 0.55 ? 1 : 1 - smoothstep(0.55, 1, local);
      data[offset + 4] = fillMix;
    }
    renderer.draw({ data, count: tiles.length, tiltDeg: tilt, originX: layout.width / 2, originY, scale: layout.scale });
  };

  const run = (): void => {
    if (stopFrames || !visible) return;
    stopFrames = onFrame(render);
  };
  const pause = (): void => {
    stopFrames?.();
    stopFrames = null;
  };

  measure();
  recolor();
  render(performance.now());
  run();

  // The copy reflows when web fonts arrive or the width changes; the cube's resting cell follows it.
  const resized = new ResizeObserver(() => { measure(); render(performance.now()); });
  resized.observe(hero);
  if (copy) resized.observe(copy);
  window.addEventListener('resize', measure, { passive: true });
  onThemeChange(() => requestAnimationFrame(() => { recolor(); render(performance.now()); }));
  new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) run();
    else pause();
  }).observe(track);
};

/** The closing scene: the cube lands back on its cell as the section scrolls into view. */
export const mountLanding = (element: HTMLElement): void => {
  const wrap = element.querySelector<HTMLElement>('.markwrap');
  if (!wrap) return;
  if (prefersReducedMotion()) return;
  let stop: (() => void) | null = null;
  let last = -1;
  const update = (): void => {
    const rect = element.getBoundingClientRect();
    const viewport = window.innerHeight;
    const k = clamp((viewport - rect.top - viewport * 0.08) / (viewport * 0.5));
    if (k === last) return;
    last = k;
    wrap.style.setProperty('--drop', `${(260 * (1 - cubicEase(k, 0.22, 0.36))).toFixed(1)}px`);
  };
  update();
  new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) stop ??= onFrame(update);
    else { stop?.(); stop = null; }
  }).observe(element);
};
