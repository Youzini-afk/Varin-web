/**
 * One animation-frame loop for the whole page. Smooth scrolling runs first, then every scene reads the
 * scroll position, so nothing samples a value from a different point in the frame.
 */
export type FrameCallback = (time: number) => void;

const early = new Set<FrameCallback>();
const callbacks = new Set<FrameCallback>();
let frame = 0;

const loop = (time: number): void => {
  for (const callback of early) callback(time);
  for (const callback of callbacks) callback(time);
  frame = early.size + callbacks.size > 0 && !document.hidden ? requestAnimationFrame(loop) : 0;
};

const wake = (): void => {
  if (!frame && !document.hidden && early.size + callbacks.size > 0) frame = requestAnimationFrame(loop);
};

document.addEventListener('visibilitychange', wake);

/** Runs every frame until the returned function is called. `stage: 'early'` runs before ordinary subscribers. */
export const onFrame = (callback: FrameCallback, stage: 'early' | 'normal' = 'normal'): (() => void) => {
  (stage === 'early' ? early : callbacks).add(callback);
  wake();
  return () => {
    early.delete(callback);
    callbacks.delete(callback);
  };
};
