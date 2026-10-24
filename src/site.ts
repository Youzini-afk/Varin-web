/** Facts about the product the site links to. One place, so a release or move changes one file. */
export const REPO_URL = 'https://github.com/Youzini-afk/Varin';
export const RELEASES_URL = `${REPO_URL}/releases`;
export const LATEST_RELEASE_URL = `${REPO_URL}/releases/latest`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const DOCKER_GUIDE_URL = `${REPO_URL}/blob/main/docs/ops/cloud-deployment.md`;
export const EXTENSION_GUIDE_URL = `${REPO_URL}/blob/main/docs/ops/varin-extension-authoring.md`;
export const EXTENSION_EXAMPLES_URL = `${REPO_URL}/tree/main/examples/extensions`;
export const LINUXDO_URL = 'https://linux.do';

/** Until the documentation renderer ships, docs links open the guides in the repository. */
export const DOCS_URL = {
  en: `${REPO_URL}/blob/main/packages/docs/README.md`,
  'zh-cn': `${REPO_URL}/blob/main/packages/docs/README.zh-CN.md`,
} as const;
