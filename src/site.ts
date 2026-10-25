import type { Locale } from './i18n/types';

/** Facts about the product the site links to. One place, so a release or move changes one file. */
export const REPO_URL = 'https://github.com/Youzini-afk/Varin';
export const RELEASES_URL = `${REPO_URL}/releases`;
export const LATEST_RELEASE_URL = `${REPO_URL}/releases/latest`;
/** GitHub's public API for the latest release; read at build time and, lazily, in the browser. */
export const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/Youzini-afk/Varin/releases/latest';
export const ISSUES_URL = `${REPO_URL}/issues`;
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const DOCKER_GUIDE_URL = `${REPO_URL}/blob/main/docs/ops/cloud-deployment.md`;
export const EXTENSION_GUIDE_URL = `${REPO_URL}/blob/main/docs/ops/varin-extension-authoring.md`;
export const EXTENSION_EXAMPLES_URL = `${REPO_URL}/tree/main/examples/extensions`;
export const LINUXDO_URL = 'https://linux.do';

/**
 * Until the documentation renderer ships, docs links open the user guides in the repository.
 * The guides have English, Simplified Chinese, French and Japanese pages; Traditional Chinese readers get
 * the Simplified Chinese guide, which is closer for them than the English one.
 */
const DOCS = `${REPO_URL}/blob/main/packages/docs`;
export const DOCS_URL: Record<Locale, string> = {
  en: `${DOCS}/README.md`,
  'zh-cn': `${DOCS}/README.zh-CN.md`,
  'zh-tw': `${DOCS}/README.zh-CN.md`,
  fr: `${DOCS}/content/docs/fr/index.mdx`,
  ja: `${DOCS}/content/docs/ja/index.mdx`,
};
