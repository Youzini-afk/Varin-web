import { initDownloadButtons } from '~/lib/download';
import { initSmoothScroll } from '~/lib/motion/smooth-scroll';
import { initObservers } from '~/lib/motion/observe';
import { mountHeroScene, mountLanding } from '~/lib/scene/hero-scene';
import { applyThemeChoice, onThemeChange, readThemeChoice, type ThemeChoice } from '~/lib/theme';

const syncThemeButtons = (): void => {
  const current = readThemeChoice();
  document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === current));
  });
};

document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((button) => {
  button.addEventListener('click', () => {
    const choice = button.dataset.themeChoice as ThemeChoice;
    // Cross-fade the whole page where the browser supports view transitions.
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
    if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(() => applyThemeChoice(choice));
    else applyThemeChoice(choice);
  });
});
onThemeChange(syncThemeButtons);
syncThemeButtons();

initSmoothScroll();
initObservers();
void initDownloadButtons();
document.querySelectorAll<HTMLElement>('[data-hero-track]').forEach(mountHeroScene);
document.querySelectorAll<HTMLElement>('[data-landing]').forEach(mountLanding);
