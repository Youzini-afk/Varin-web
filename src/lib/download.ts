import { LATEST_RELEASE_API_URL } from '~/site';
import { fileNameOf, parseRelease, type AssetKey, type DesktopArch, type DesktopOs, type ReleaseLinks } from './release-assets';

/**
 * Download links that fit the visitor's computer.
 *
 * The build bakes the latest release's files into the page (`#release-links`). Here the visitor's system and,
 * where the browser reports it, CPU architecture pick the matching installer:
 *   Windows x64 / ARM64 (.exe) · macOS Apple silicon (.dmg) · Linux x64 / ARM64 (.AppImage)
 * Phones, tablets and anything unrecognised keep the release page. Intel Macs, when positively identified,
 * also get the release page, since the current builds are Apple silicon only.
 *
 * After the page settles, the browser asks the GitHub API for the latest release (cached for ten minutes per
 * tab session), so the version and files follow GitHub even when the site was built before the last release.
 */
type Platform = DesktopOs | 'other';
interface Visitor { os: Platform; arch: DesktopArch | null }

interface UADataValues { architecture?: string; bitness?: string }
interface UAData { platform?: string; mobile?: boolean; getHighEntropyValues?: (hints: string[]) => Promise<UADataValues> }

const CACHE_KEY = 'varin-web-release';
const CACHE_MS = 10 * 60 * 1000;

const detectOs = (): Platform => {
  const data = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  if (data?.mobile) return 'other';
  const source = `${data?.platform ?? ''} ${navigator.userAgent}`.toLowerCase();
  if (/android|iphone|ipad|ipod|cros/.test(source)) return 'other';
  if (source.includes('win')) return 'windows';
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  if (source.includes('mac')) return navigator.maxTouchPoints > 1 ? 'other' : 'mac';
  if (source.includes('linux') || source.includes('x11')) return 'linux';
  return 'other';
};

/** Chromium reports the CPU architecture; other browsers only reveal ARM Linux in the user agent. */
const detectArch = async (): Promise<DesktopArch | null> => {
  const data = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  if (data?.getHighEntropyValues) {
    try {
      const values = await data.getHighEntropyValues(['architecture', 'bitness']);
      if (values.architecture === 'arm') return 'arm64';
      if (values.architecture === 'x86') return 'x64';
    } catch {
      // Permission policies can refuse high-entropy hints; fall through to the user agent.
    }
  }
  return /aarch64|arm64|armv8/i.test(navigator.userAgent) ? 'arm64' : null;
};

const readBaked = (): ReleaseLinks | null => {
  const node = document.getElementById('release-links');
  if (!node?.textContent) return null;
  try {
    return JSON.parse(node.textContent) as ReleaseLinks;
  } catch {
    return null;
  }
};

interface Choice { href: string; chip: string | null; os: Platform }

/** What the main download button should offer this visitor. */
const choose = (visitor: Visitor, links: ReleaseLinks, labels: DOMStringMap): Choice => {
  const file = (key: AssetKey): string | undefined => links.files[key];
  switch (visitor.os) {
    case 'windows': {
      const arm = visitor.arch === 'arm64' && file('windows-arm64');
      if (arm) return { href: arm, chip: 'ARM64', os: 'windows' };
      const x64 = file('windows-x64');
      return { href: x64 ?? links.page, chip: x64 ? 'x64' : null, os: 'windows' };
    }
    case 'mac': {
      if (visitor.arch === 'x64') {
        const intel = file('mac-x64');
        return intel ? { href: intel, chip: 'Intel', os: 'mac' } : { href: links.page, chip: labels.chipAppleOnly ?? null, os: 'mac' };
      }
      const apple = file('mac-arm64');
      return { href: apple ?? links.page, chip: apple ? labels.chipApple ?? null : null, os: 'mac' };
    }
    case 'linux': {
      const arm = visitor.arch === 'arm64' && file('linux-arm64');
      if (arm) return { href: arm, chip: 'ARM64', os: 'linux' };
      const x64 = file('linux-x64');
      return { href: x64 ?? links.page, chip: x64 ? 'x64' : null, os: 'linux' };
    }
    default:
      return { href: links.page, chip: null, os: 'other' };
  }
};

/** Each platform in the "all platforms" row links its own installer, in the visitor's architecture when it is theirs. */
const platformHref = (os: DesktopOs, visitor: Visitor, links: ReleaseLinks): string => {
  const own = visitor.os === os && visitor.arch ? links.files[`${os}-${visitor.arch}`] : undefined;
  const fallback = os === 'mac' ? links.files['mac-arm64'] : links.files[`${os}-x64`];
  return own ?? fallback ?? links.page;
};

const apply = (visitor: Visitor, links: ReleaseLinks): void => {
  document.querySelectorAll<HTMLAnchorElement>('a[data-download]').forEach((button) => {
    const choice = choose(visitor, links, button.dataset);
    button.href = choice.href;
    const name = fileNameOf(choice.href);
    if (name) button.title = name;
    else button.removeAttribute('title');
    if (button.dataset.download === 'short') return;
    const label = button.querySelector<HTMLElement>('[data-download-label]');
    const text = button.dataset[`label${choice.os[0]!.toUpperCase()}${choice.os.slice(1)}`];
    if (label && text) label.textContent = text;
    const chip = button.querySelector<HTMLElement>('[data-download-arch]');
    if (chip) {
      chip.textContent = choice.chip ?? '';
      chip.hidden = !choice.chip;
    }
  });
  document.querySelectorAll<HTMLAnchorElement>('a[data-platform]').forEach((link) => {
    const os = link.dataset.platform as DesktopOs;
    link.href = platformHref(os, visitor, links);
    const name = fileNameOf(link.href);
    if (name) link.title = name;
  });
  document.querySelectorAll<HTMLElement>('[data-release-version]').forEach((node) => {
    node.textContent = links.version ? `v${links.version}` : '';
    node.hidden = !links.version;
  });
};

const fetchLatest = async (fallbackPage: string): Promise<ReleaseLinks | null> => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null') as { at: number; links: ReleaseLinks } | null;
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.links;
  } catch {
    // Storage unavailable or malformed: ask the API.
  }
  try {
    const response = await fetch(LATEST_RELEASE_API_URL, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const links = parseRelease(await response.json(), fallbackPage);
    if (Object.keys(links.files).length === 0) return null;
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), links })); } catch { /* storage full or disabled */ }
    return links;
  } catch {
    return null;
  }
};

export const initDownloadButtons = async (): Promise<void> => {
  const targets = 'a[data-download], a[data-platform]';
  if (!document.querySelector(targets)) return;
  const baked = readBaked() ?? { version: null, page: document.querySelector<HTMLAnchorElement>('a[data-download]')?.href ?? '', files: {} };
  const visitor: Visitor = { os: detectOs(), arch: null };
  if (visitor.os !== 'other') visitor.arch = await detectArch();
  apply(visitor, baked);

  // Ask GitHub for the latest release once the page has settled, so the version and files are current
  // even when the site has not been rebuilt since the last release.
  const update = async (): Promise<void> => {
    const latest = await fetchLatest(baked.page);
    if (latest && latest.version !== baked.version) apply(visitor, latest);
  };
  const idle = (window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(() => void update(), { timeout: 2000 });
  else window.setTimeout(() => void update(), 800);
};
