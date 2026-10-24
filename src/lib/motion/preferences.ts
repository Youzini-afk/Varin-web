const query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export const prefersReducedMotion = (): boolean => query?.matches ?? false;

/** Calls back whenever the reduced-motion preference changes. */
export const onReducedMotionChange = (callback: (reduced: boolean) => void): (() => void) => {
  if (!query) return () => undefined;
  const listener = (event: MediaQueryListEvent): void => callback(event.matches);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};

/** Data saver and very low memory devices get the static composition. */
export const prefersLightweightScene = (): boolean => {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return Boolean(nav.connection?.saveData) || (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 2);
};
