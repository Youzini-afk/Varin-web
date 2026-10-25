import { LATEST_RELEASE_API_URL, LATEST_RELEASE_URL } from '~/site';
import { parseRelease, type ReleaseLinks } from './release-assets';

/**
 * Build time only: the latest release's download links, read once per build and shared by every page.
 * A failed request never fails the build; the buttons then open the release page, and the browser
 * script fills in the files later. Set GITHUB_TOKEN to lift the anonymous API rate limit on shared builders.
 */
let latest: Promise<ReleaseLinks> | null = null;

const load = async (): Promise<ReleaseLinks> => {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'varin-web-build' };
    const token = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(LATEST_RELEASE_API_URL, { headers, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    const links = parseRelease(await response.json(), LATEST_RELEASE_URL);
    if (Object.keys(links.files).length === 0) throw new Error('the release has no desktop installers');
    return links;
  } catch (error) {
    console.warn(`[release] Latest Varin release unavailable (${error instanceof Error ? error.message : String(error)}); download links point to the release page.`);
    return { version: null, page: LATEST_RELEASE_URL, files: {} };
  }
};

export const getLatestRelease = (): Promise<ReleaseLinks> => (latest ??= load());
