/**
 * Download buttons name the visitor's platform. Desktop builds exist for Windows x64, macOS arm64/x64 and
 * Linux x64/arm64; the button links to the latest release, where the matching asset is listed.
 */
type Platform = 'windows' | 'mac' | 'linux' | 'other';

interface UADataValues { architecture?: string; bitness?: string; platform?: string }
interface UAData { platform?: string; getHighEntropyValues?: (hints: string[]) => Promise<UADataValues> }

const detectPlatform = (): Platform => {
  const data = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  const source = `${data?.platform ?? ''} ${navigator.userAgent}`.toLowerCase();
  if (/android|iphone|ipad|ipod/.test(source)) return 'other';
  if (source.includes('win')) return 'windows';
  if (source.includes('mac')) return 'mac';
  if (source.includes('linux') || source.includes('x11')) return 'linux';
  return 'other';
};

/** Chromium can report the CPU architecture; elsewhere the label stays without one rather than guessing. */
const detectArchitecture = async (platform: Platform): Promise<string | null> => {
  if (platform === 'windows') return 'x64';
  const data = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  if (!data?.getHighEntropyValues) return null;
  try {
    const values = await data.getHighEntropyValues(['architecture', 'bitness']);
    if (values.architecture === 'arm') return 'arm64';
    if (values.architecture === 'x86' && values.bitness === '64') return 'x64';
  } catch {
    // Permission policies can refuse high-entropy hints; keep the plain label.
  }
  return null;
};

export const initDownloadButtons = async (): Promise<void> => {
  const buttons = document.querySelectorAll<HTMLElement>('[data-download]');
  if (buttons.length === 0) return;
  const platform = detectPlatform();
  const architecture = await detectArchitecture(platform);
  for (const button of buttons) {
    const label = button.dataset[`label${platform[0]!.toUpperCase()}${platform.slice(1)}`];
    const text = button.querySelector<HTMLElement>('[data-download-label]');
    const arch = button.querySelector<HTMLElement>('[data-download-arch]');
    if (label && text) text.textContent = label;
    if (arch) {
      arch.textContent = architecture ?? '';
      arch.hidden = !architecture;
    }
  }
};
