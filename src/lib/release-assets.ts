import { RELEASES_URL } from '~/site';

/**
 * Desktop downloads of a Varin release, keyed by platform. Shared by the build, which bakes the links into the
 * HTML, and the browser, which refreshes them when a newer release is out.
 *
 * Asset names follow the product's electron-builder config (packages/electron/package.json):
 *   Varin-<version>-win-<arch>.exe · Varin-<version>-mac-<arch>.dmg · Varin-<version>-linux-<arch>.AppImage
 */
export type DesktopOs = 'windows' | 'mac' | 'linux';
export type DesktopArch = 'x64' | 'arm64';
export type AssetKey = `${DesktopOs}-${DesktopArch}`;

export interface ReleaseLinks {
  /** Release version without the leading "v", or null when the release could not be read. */
  version: string | null;
  /** Release page: the fallback for any platform without a direct file. */
  page: string;
  files: Partial<Record<AssetKey, string>>;
}

const PATTERNS: ReadonlyArray<readonly [RegExp, DesktopOs]> = [
  [/-win-(x64|arm64)\.exe$/i, 'windows'],
  [/-mac-(x64|arm64)\.dmg$/i, 'mac'],
  [/-linux-(x86_64|x64|arm64)\.AppImage$/i, 'linux'],
];

/** Only links into this repository's releases are used, whatever the API answers. */
const isReleaseUrl = (value: unknown): value is string => typeof value === 'string' && value.startsWith(`${RELEASES_URL}/`);

export const parseRelease = (release: unknown, fallbackPage: string): ReleaseLinks => {
  const record = (release ?? {}) as { tag_name?: unknown; html_url?: unknown; assets?: unknown };
  const files: Partial<Record<AssetKey, string>> = {};
  for (const asset of Array.isArray(record.assets) ? record.assets : []) {
    const { name, browser_download_url: url } = (asset ?? {}) as { name?: unknown; browser_download_url?: unknown };
    if (typeof name !== 'string' || !isReleaseUrl(url)) continue;
    for (const [pattern, os] of PATTERNS) {
      const match = pattern.exec(name);
      if (match) files[`${os}-${match[1]?.toLowerCase() === 'arm64' ? 'arm64' : 'x64'}`] = url;
    }
  }
  const tag = typeof record.tag_name === 'string' && /^v?\d[\w.+-]*$/.test(record.tag_name) ? record.tag_name.replace(/^v/, '') : null;
  return { version: tag, page: isReleaseUrl(record.html_url) ? record.html_url : fallbackPage, files };
};

/** The file a release link points at, e.g. "Varin-0.9.32-win-x64.exe"; empty for the release page. */
export const fileNameOf = (href: string): string => {
  if (!href.includes('/releases/download/')) return '';
  try {
    return decodeURIComponent(new URL(href).pathname.split('/').pop() ?? '');
  } catch {
    return '';
  }
};
