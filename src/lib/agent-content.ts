import { copyFor, LOCALES, localeInfo, localePath, type Locale } from '~/i18n';
import { CHANGELOG_URL, DOCKER_GUIDE_URL, DOCS_URL, EXTENSION_EXAMPLES_URL, EXTENSION_GUIDE_URL, ISSUES_URL, LATEST_RELEASE_URL, LICENSE_URL, REPO_URL } from '~/site';

const bullets = (items: readonly string[]): string => items.map((item) => `- ${item}`).join('\n');
const link = (label: string, url: string): string => `[${label}](${url})`;
const section = (title: string, body: string): string => `## ${title}\n\n${body}`;

/** A textual view of the same localized copy as the homepage, regenerated on every build. */
export const homeMarkdown = (locale: Locale, site: URL): string => {
  const t = copyFor(locale);
  const info = localeInfo(locale);
  const absolute = (path: string): string => new URL(path, site).href;
  const heading = (id: string, title: string): string => link(title, absolute(`${localePath(locale)}#${id}`));
  const resources = [
    link(t.footer.links.docs, DOCS_URL[locale]),
    link(t.footer.links.releases, LATEST_RELEASE_URL),
    link(t.footer.links.changelog, CHANGELOG_URL),
    link(t.footer.links.docker, DOCKER_GUIDE_URL),
    link(t.footer.links.extensions, EXTENSION_GUIDE_URL),
    link(t.ext.foot.examples, EXTENSION_EXAMPLES_URL),
    link(t.footer.links.github, REPO_URL),
    link(t.footer.links.issues, ISSUES_URL),
    link('AGPL-3.0-only', LICENSE_URL),
  ];
  return [
    `# ${t.meta.title}`,
    `> ${t.meta.description}`,
    `Canonical: ${absolute(localePath(locale))}\nLanguage: ${info.htmlLang}\nSource repository: ${REPO_URL}\nLicense: AGPL-3.0-only`,
    t.hero.lede,
    section(heading('harness', t.harness.title), [
      t.harness.desc,
      bullets(Object.values(t.harness.cells).map((cell) => `**${cell.title}**: ${cell.body}`)),
    ].join('\n\n')),
    section(heading('ready', t.ready.title), [
      `### ${t.ready.box.title}\n\n${t.ready.box.body}`,
      bullets(t.ready.box.stats.map((stat) => `${stat.value} ${stat.label}`)),
      `### ${t.ready.custom.title}\n\n${t.ready.custom.body}`,
      bullets(t.ready.custom.items),
      `### ${t.ready.byok.title}\n\n${t.ready.byok.body}`,
      [...t.ready.byok.protocols, ...t.ready.byok.local, t.ready.byok.any].join(' · '),
    ].join('\n\n')),
    section(heading('modes', t.modes.title), [
      t.modes.subtitle,
      ...t.modes.items.map((mode) => `### ${mode.name}\n\n${mode.tagline}\n\n${mode.body}\n\n${mode.quote}`),
    ].join('\n\n')),
    section(heading('team', t.team.title), [t.team.desc, bullets(t.team.feats)].join('\n\n')),
    section(heading('bot', t.bot.title), [t.bot.desc, bullets(t.bot.feats)].join('\n\n')),
    section(heading('extensions', t.ext.title), [
      t.ext.desc,
      bullets(t.ext.catalog.map((item) => `${item.name} (${item.kind})`)),
      `### ${t.ext.anatomy.title}`,
      bullets(Object.entries(t.ext.anatomy.files).map(([name, body]) => `**${name}**: ${body}`)),
      `### ${t.ext.layers.title}\n\n${t.ext.layers.hint}`,
      bullets(t.ext.layers.realms.map((realm) => `**${realm.name}**: ${realm.body} (${realm.chips.join(' · ')})`)),
      `**${t.ext.layers.ui.title} (${t.ext.layers.ui.note})**: ${t.ext.layers.ui.items.join(' · ')}`,
      `**${t.ext.layers.workspace.title}**: ${t.ext.layers.workspace.items.join(' · ')}`,
      `### ${t.ext.why.title}\n\n${t.ext.why.hint}`,
      bullets(t.ext.why.items.map((item) => `**${item.title}**: ${item.body}`)),
      t.ext.foot.items.join(' · '),
      t.ext.foot.note,
    ].join('\n\n')),
    section(heading('control', t.control.title), t.control.body),
    section(heading('anywhere', t.anywhere.title), t.anywhere.body),
    section(t.footer.columns.resources, bullets(resources)),
    section(t.footer.languages, bullets(LOCALES.map((language) => link(language.name, absolute(localePath(language.code, '/index.md')))))),
    '',
  ].join('\n\n');
};

/** Discovery stays short. Details live behind links, including native Markdown sources on GitHub. */
export const agentIndex = (site: URL): string => {
  const absolute = (path: string): string => new URL(path, site).href;
  const raw = `${REPO_URL.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/main`;
  return [
    '# Varin',
    `> ${copyFor('en').meta.description}`,
    'This is the Varin product website. The localized Markdown overviews are generated from the same copy as the HTML homepages. Each overview identifies its canonical HTML URL and links to source sections. Release assets and technical instructions are maintained in the linked repository.',
    'Desktop downloads cover Windows, macOS and Linux. Docker self-hosting is documented separately. Varin uses your own API keys; the source code is licensed under AGPL-3.0-only.',
    '## Product overviews',
    bullets(LOCALES.map((info) => `${link(info.name, absolute(localePath(info.code, '/index.md')))}: Product overview in ${info.name}.`)),
    '## Documentation',
    bullets([
      `${link('User guide', `${raw}/packages/docs/README.md`)}: Setup and usage; Markdown source.`,
      `${link('简体中文使用文档', `${raw}/packages/docs/README.zh-CN.md`)}: Chinese setup and usage; Markdown source.`,
      `${link('Documentation française', `${raw}/packages/docs/content/docs/fr/index.mdx`)}: French user guide; MDX source.`,
      `${link('日本語ドキュメント', `${raw}/packages/docs/content/docs/ja/index.mdx`)}: Japanese user guide; MDX source.`,
      `${link('Docker deployment', `${raw}/docs/ops/cloud-deployment.md`)}: Self-hosting instructions.`,
      `${link('Extension authoring', `${raw}/docs/ops/varin-extension-authoring.md`)}: Extension contracts, SDK and CLI.`,
    ]),
    '## Project',
    bullets([
      `${link('Source repository', REPO_URL)}: Source code and README.`,
      `${link('Latest release', LATEST_RELEASE_URL)}: Current version, platform support and download assets.`,
      `${link('Changelog', `${raw}/CHANGELOG.md`)}: Version history.`,
      `${link('License', `${raw}/LICENSE`)}: AGPL-3.0-only license text.`,
    ]),
    '## Optional',
    bullets([
      `${link('Full English overview', absolute('/llms-full.txt'))}: All product overview sections in a single plain-text response.`,
      `${link('Extension examples', EXTENSION_EXAMPLES_URL)}: Example extension source tree.`,
      `${link('Issue tracker', ISSUES_URL)}: Bug reports and feature requests.`,
      `${link('Sitemap', absolute('/sitemap.xml'))}: Canonical HTML pages and their language alternates.`,
    ]),
    '',
  ].join('\n\n');
};
