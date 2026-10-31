import { copyFor, LOCALES, localeInfo, localePath, type Locale } from '~/i18n';
import type { GuideSection } from '~/lib/docs';
import {
  CHANGELOG_URL, DOCKER_GUIDE_URL, DOCS_SOURCE_URL, DOCS_URL, EXTENSION_EXAMPLES_URL, EXTENSION_GUIDE_URL, ISSUES_URL, LATEST_RELEASE_URL,
  LICENSE_URL, REPO_URL,
} from '~/site';

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
    link(t.footer.links.docs, absolute(DOCS_URL[locale])),
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

/** Root-relative links in the guides (/docs/install/) made absolute for documents read outside the site. */
const absoluteLinks = (markdown: string, site: URL): string =>
  markdown.replace(/\]\((\/[^)\s]*)/g, (_, target: string) => `](${new URL(target, site).href}`);

/** Discovery stays short. Details live behind links: the localized overviews and the user guides. */
export const agentIndex = (site: URL, guides: readonly GuideSection[]): string => {
  const absolute = (path: string): string => new URL(path, site).href;
  const raw = `${REPO_URL.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/main`;
  return [
    '# Varin',
    `> ${copyFor('en').meta.description}`,
    'This is the Varin product website. The localized Markdown overviews are generated from the same copy as the HTML homepages. Each overview identifies its canonical HTML URL and links to source sections. The user guides are HTML pages rendered from the Markdown sources in the product repository. Release assets and technical instructions are maintained in the linked repository.',
    'Desktop downloads cover Windows, macOS and Linux. Docker self-hosting is documented separately. Varin uses your own API keys; the source code is licensed under AGPL-3.0-only.',
    '## Product overviews',
    bullets(LOCALES.map((info) => `${link(info.name, absolute(localePath(info.code, '/index.md')))}: Product overview in ${info.name}.`)),
    '## Documentation',
    bullets([
      ...LOCALES.map((info) => `${link(copyFor(info.code).footer.links.docs, absolute(DOCS_URL[info.code]))}: User guides in ${info.name}.`),
      `${link('Guide sources', DOCS_SOURCE_URL)}: Markdown/MDX sources of the user guides in every language.`,
      `${link('Docker deployment', `${raw}/docs/ops/cloud-deployment.md`)}: Self-hosting instructions.`,
      `${link('Extension authoring', `${raw}/docs/ops/varin-extension-authoring.md`)}: Extension contracts, SDK and CLI.`,
    ]),
    '## User guides',
    guides.map((section) => [
      `### ${section.label}`,
      bullets(section.guides.map((guide) => `${link(guide.title, absolute(guide.path))}: ${guide.description}`)),
    ].join('\n\n')).join('\n\n'),
    '## Project',
    bullets([
      `${link('Source repository', REPO_URL)}: Source code and README.`,
      `${link('Latest release', LATEST_RELEASE_URL)}: Current version, platform support and download assets.`,
      `${link('Changelog', `${raw}/CHANGELOG.md`)}: Version history.`,
      `${link('License', `${raw}/LICENSE`)}: AGPL-3.0-only license text.`,
    ]),
    '## Optional',
    bullets([
      `${link('Full English text', absolute('/llms-full.txt'))}: The product overview and every English user guide in a single plain-text response.`,
      `${link('Extension examples', EXTENSION_EXAMPLES_URL)}: Example extension source tree.`,
      `${link('Issue tracker', ISSUES_URL)}: Bug reports and feature requests.`,
      `${link('Sitemap', absolute('/sitemap.xml'))}: Canonical HTML pages and their language alternates.`,
    ]),
    '',
  ].join('\n\n');
};

/** The English overview followed by every English user guide, for agents that read one document. */
export const fullText = (site: URL, guides: readonly GuideSection[]): string => [
  homeMarkdown('en', site).trimEnd(),
  ...guides.flatMap((section) => section.guides.map((guide) => [
    '---',
    `# ${guide.title}`,
    `> ${guide.description}`,
    `Canonical: ${new URL(guide.path, site).href}\nSection: ${section.label}`,
    absoluteLinks(guide.body.trim(), site),
  ].join('\n\n'))),
  '',
].join('\n\n');
