/**
 * Language negotiation for the English entry pages (`/` and `/docs/`), as an inline script that runs before
 * first paint. Dependency-free, because astro.config.ts also imports it for the Starlight head.
 *
 * - Only the listed entry paths redirect. Localized URLs and every other page always serve their own language.
 * - A language picked in the menu or footer (stored under LOCALE_STORAGE_KEY) wins over the browser's languages.
 * - Arriving from another page of this site never redirects, so choosing English works even without storage.
 * - Crawlers and link previews stay on the English page, which is also the `x-default` alternate.
 * - The first browser language that the site serves decides; an unsupported list keeps English.
 */
export const LOCALE_STORAGE_KEY = 'varin-web-locale';

const negotiate = function (prefixes: Record<string, string>, entries: string[], key: string): void {
  try {
    var path = location.pathname;
    if (entries.indexOf(path) < 0) return;
    if (/bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse|headless/i.test(navigator.userAgent)) return;
    if (document.referrer) {
      try { if (new URL(document.referrer).origin === location.origin) return; } catch (error) { /* unreadable referrer */ }
    }
    var has = function (code: string): boolean { return Object.prototype.hasOwnProperty.call(prefixes, code); };
    var target: string | null = null;
    try {
      var saved = localStorage.getItem(key);
      if (saved && has(saved)) target = saved;
    } catch (error) { /* storage unavailable: use the browser's languages */ }
    if (!target) {
      var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
      for (var index = 0; index < list.length && !target; index += 1) {
        var tag = String(list[index]).toLowerCase().replace(/_/g, '-');
        var base = tag.split('-')[0] as string;
        // Traditional Chinese by script or region; every other Chinese tag reads Simplified.
        if (base === 'zh') target = /-(hant|tw|hk|mo)(-|$)/.test(tag) ? 'zh-tw' : 'zh-cn';
        else if (has(base)) target = base;
      }
    }
    // English lives at the entry path itself (empty prefix), so it never redirects.
    if (target && prefixes[target]) location.replace(prefixes[target] + path + location.search + location.hash);
  } catch (error) { /* never block the page */ }
};

/** Inline script source; `prefixes` maps locale codes to their URL prefix (empty for English). */
export const localeRedirectScript = (prefixes: Record<string, string>, entries: readonly string[]): string =>
  `(${negotiate.toString()})(${JSON.stringify(prefixes)},${JSON.stringify(entries)},${JSON.stringify(LOCALE_STORAGE_KEY)});`;
