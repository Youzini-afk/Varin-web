/**
 * Entry reveals and live illustrations.
 * - `[data-reveal]` gains `.is-in` once, the first time it enters the viewport.
 * - `[data-live]` toggles `.is-live` while on screen, so looping CSS animations pause off screen.
 */
export const initObservers = (): void => {
  if (typeof IntersectionObserver !== 'function') {
    document.querySelectorAll('[data-reveal]').forEach((element) => element.classList.add('is-in'));
    document.querySelectorAll('[data-live]').forEach((element) => element.classList.add('is-live'));
    return;
  }

  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      reveal.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  const live = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle('is-live', entry.isIntersecting);
  }, { rootMargin: '10% 0px 10% 0px' });

  document.querySelectorAll('[data-reveal]').forEach((element) => reveal.observe(element));
  document.querySelectorAll('[data-live]').forEach((element) => live.observe(element));
};
