import Lenis from 'lenis';
import { onReducedMotionChange, prefersReducedMotion } from './preferences';
import { onFrame } from './ticker';

/**
 * Smooth wheel scrolling on top of native scroll. Sticky positioning, find-in-page, keyboard and touch
 * scrolling keep their native behaviour; reduced-motion users get plain native scrolling.
 */
let lenis: Lenis | null = null;
let stopFrame: (() => void) | null = null;

const start = (): void => {
  if (lenis) return;
  lenis = new Lenis({
    autoRaf: false,
    lerp: 0.1,
    smoothWheel: true,
    wheelMultiplier: 1,
    anchors: { offset: -72 },
  });
  const instance = lenis;
  stopFrame = onFrame((time) => instance.raf(time), 'early');
};

const stop = (): void => {
  stopFrame?.();
  stopFrame = null;
  lenis?.destroy();
  lenis = null;
};

export const initSmoothScroll = (): void => {
  if (!prefersReducedMotion()) start();
  onReducedMotionChange((reduced) => (reduced ? stop() : start()));
};
