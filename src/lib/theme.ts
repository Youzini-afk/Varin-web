/**
 * Appearance: system, light or dark. The choice is stored locally and applied before first paint by the
 * inline script in Base.astro; this module handles changes after load.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'varin-web-theme';
const listeners = new Set<() => void>();

export const readThemeChoice = (): ThemeChoice => {
  const value = document.documentElement.dataset.theme;
  return value === 'light' || value === 'dark' ? value : 'system';
};

export const applyThemeChoice = (choice: ThemeChoice): void => {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the choice still applies to this page.
  }
  for (const listener of listeners) listener();
};

/** Called after the effective colours may have changed: an explicit choice or a system scheme change. */
export const onThemeChange = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

if (typeof matchMedia === 'function') {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readThemeChoice() === 'system') for (const listener of listeners) listener();
  });
}
