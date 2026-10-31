// Copies Varin's user guides from the product repository into the Starlight content folder.
//
// The guides are written in the product repository (packages/docs) and never edited here. Source, in order:
//   1. VARIN_DOCS_DIR: a packages/docs directory (or a Varin checkout containing one).
//   2. The sibling checkout ../Varin/packages/docs, when it exists.
//   3. A shallow, blobless, sparse clone of the product repository containing only packages/docs,
//      at VARIN_DOCS_REF (a branch, tag or commit; default main).
//
// Output (both gitignored, rewritten on every run):
//   src/content/docs/         English under docs/, translations under <locale>/docs/, so pages are served at
//                             /docs/… and /<locale>/docs/… next to the homepages at / and /<locale>/.
//   src/generated/docs-sidebar.json   sidebar.config.json in Starlight's sidebar format.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentOut = path.join(root, 'src', 'content', 'docs');
const sidebarOut = path.join(root, 'src', 'generated', 'docs-sidebar.json');
const cloneDir = path.join(root, 'node_modules', '.cache', 'varin-docs');
const REPOSITORY = 'https://github.com/Youzini-afk/Varin.git';

/** URL prefixes of the site's translated homepages (src/i18n/index.ts); English is the root. */
const LOCALES = ['zh-cn', 'zh-tw', 'fr', 'ja'];
/** Sidebar translation keys are BCP-47 tags (zh-CN), the same tags Starlight uses for its locales. */
const SIDEBAR_LANGS = new Set(LOCALES.map((locale) => Intl.getCanonicalLocales(locale)[0]));
const MARKDOWN = /\.(?:md|mdx)$/i;

const log = (message) => console.log(`[sync-docs] ${message}`);
const isDocsPackage = (dir) => existsSync(path.join(dir, 'sidebar.config.json')) && existsSync(path.join(dir, 'content', 'docs'));

/** Runs git quietly; its progress output only appears when a command fails. */
const git = (args, cwd) => {
  try {
    return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error(`git ${args.join(' ')} failed:\n${error.stderr || error.message}`);
  }
};

/** Fetches only packages/docs at one commit: no history, no blobs outside the sparse path. */
const cloneDocs = () => {
  const ref = process.env.VARIN_DOCS_REF || 'main';
  if (!/^[\w][\w./-]*$/.test(ref)) throw new Error(`VARIN_DOCS_REF is not a branch, tag or commit name: ${ref}`);
  if (!existsSync(path.join(cloneDir, '.git'))) {
    git(['init', '--quiet', cloneDir], root);
    git(['remote', 'add', 'origin', REPOSITORY], cloneDir);
  }
  git(['sparse-checkout', 'set', '--no-cone', '/packages/docs/'], cloneDir);
  git(['fetch', '--quiet', '--depth=1', '--filter=blob:none', '--no-tags', 'origin', ref], cloneDir);
  git(['checkout', '--quiet', '--force', '--detach', 'FETCH_HEAD'], cloneDir);
  const commit = git(['rev-parse', '--short', 'HEAD'], cloneDir);
  return { dir: path.join(cloneDir, 'packages', 'docs'), label: `${REPOSITORY} ${ref} (${commit}), sparse clone` };
};

const resolveSource = () => {
  const configured = process.env.VARIN_DOCS_DIR;
  if (configured) {
    const dir = path.resolve(root, configured);
    const candidates = [dir, path.join(dir, 'packages', 'docs')];
    const found = candidates.find(isDocsPackage);
    if (!found) throw new Error(`VARIN_DOCS_DIR does not contain sidebar.config.json and content/docs/: ${dir}`);
    return { dir: found, label: `VARIN_DOCS_DIR ${found}` };
  }
  const sibling = path.resolve(root, '..', 'Varin', 'packages', 'docs');
  if (isDocsPackage(sibling)) return { dir: sibling, label: `sibling checkout ${sibling}` };
  return cloneDocs();
};

// ---------- Link rewriting ----------

/** /install/ → /docs/install/, /zh-cn/install/ → /zh-cn/docs/install/. External links, anchors and relative paths stay. */
const docsHref = (target) => {
  if (!target.startsWith('/') || target.startsWith('//')) return target;
  const first = /^\/([^/?#]*)/.exec(target)?.[1] ?? '';
  if (LOCALES.includes(first)) return `/${first}/docs${target.slice(first.length + 1) || '/'}`;
  return `/docs${target}`;
};

const rewriteProse = (text) => text
  // Inline links, not images: [label](/path/ "title") or [label](</path/>)
  .replace(/(?<!!)(\[[^\]]*\]\(\s*<?)([^)\s>]+)/g, (_, lead, target) => lead + docsHref(target))
  // Reference definitions: [id]: /path/
  .replace(/^( {0,3}\[[^\]]+\]:\s*<?)(\S+?)(?=>|\s|$)/gm, (_, lead, target) => lead + docsHref(target))
  // Raw HTML anchors
  .replace(/(<a\b[^>]*?\bhref=)(["'])(.*?)\2/g, (_, lead, quote, target) => `${lead}${quote}${docsHref(target)}${quote}`);

/** Rewrites links outside fenced code blocks and inline code spans. */
const rewriteLinks = (markdown) => {
  const out = [];
  let fence = null;
  let prose = [];
  const flush = () => {
    if (!prose.length) return;
    // Inline code spans (any backtick run length) are kept verbatim.
    const text = prose.join('\n');
    out.push(text.split(/(`+[^`]*?`+)/g).map((part, index) => (index % 2 ? part : rewriteProse(part))).join(''));
    prose = [];
  };
  for (const line of markdown.split('\n')) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      out.push(line);
      if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = null;
    } else if (marker) {
      flush();
      fence = marker;
      out.push(line);
    } else {
      prose.push(line);
    }
  }
  flush();
  return out.join('\n');
};

/** Starlight renders the frontmatter title as the page heading, so a leading `# Title` would repeat it. */
const dropTitleHeading = (markdown) => {
  const match = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/.exec(markdown);
  if (!match) return markdown;
  const [, frontmatter, body] = match;
  const title = /^title:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim().replace(/^(['"])(.*)\1$/, '$2');
  const heading = /^\s*#\s+(.+?)\s*(?:\r?\n|$)/.exec(body);
  if (!title || !heading || heading[1] !== title) return markdown;
  return frontmatter + body.slice(heading[0].length).replace(/^\s*\n/, '\n');
};

// ---------- Copying ----------

/** Copies one file or folder and returns the number of pages written. */
const copyEntry = async (entry, from, to) => {
  if (entry.isDirectory()) return copyTree(from, to);
  if (!entry.isFile()) return 0;
  if (!MARKDOWN.test(entry.name)) {
    await copyFile(from, to); // images and other assets referenced with relative paths
    return 0;
  }
  const text = (await readFile(from, 'utf8')).replace(/\r\n/g, '\n');
  await writeFile(to, rewriteLinks(dropTitleHeading(text)));
  return 1;
};

const copyTree = async (from, to) => {
  await mkdir(to, { recursive: true });
  let pages = 0;
  for (const entry of await readdir(from, { withFileTypes: true })) {
    pages += await copyEntry(entry, path.join(from, entry.name), path.join(to, entry.name));
  }
  return pages;
};

/** Top-level folders that look like a language tag and are not an English section are other locales. */
const looksLikeLocale = (name) => {
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(name)) return false;
  try { return Intl.getCanonicalLocales(name).length === 1; } catch { return false; }
};

// ---------- Sidebar ----------

const slugFor = (link) => `docs/${link.replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');

const translationsFor = (translations = {}) => Object.fromEntries(
  Object.entries(translations).filter(([lang, label]) => SIDEBAR_LANGS.has(lang) && typeof label === 'string' && label),
);

const sidebarItem = (item) => {
  const base = { label: item.label, translations: translationsFor(item.translations) };
  if (Array.isArray(item.items)) return { ...base, items: item.items.map(sidebarItem) };
  if (typeof item.link !== 'string') throw new Error(`Sidebar item "${item.label}" has neither link nor items`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(item.link)) return { ...base, link: item.link };
  return { ...base, slug: slugFor(item.link) };
};

const collectLinks = (items) => items.flatMap((item) => (Array.isArray(item.items) ? collectLinks(item.items) : [item.link]));

// ---------- Run ----------

const source = resolveSource();
const content = path.join(source.dir, 'content', 'docs');
const config = JSON.parse(await readFile(path.join(source.dir, 'sidebar.config.json'), 'utf8'));
const sections = config.sections ?? [];
const englishSections = new Set(collectLinks(sections).map((link) => /^\/([^/]+)\//.exec(link ?? '')?.[1]).filter(Boolean));

await rm(contentOut, { recursive: true, force: true });
await mkdir(path.join(contentOut, 'docs'), { recursive: true });
const counts = { en: 0 };
const ignored = [];
for (const entry of await readdir(content, { withFileTypes: true })) {
  const from = path.join(content, entry.name);
  if (entry.isDirectory() && LOCALES.includes(entry.name)) {
    counts[entry.name] = await copyTree(from, path.join(contentOut, entry.name, 'docs'));
  } else if (entry.isDirectory() && looksLikeLocale(entry.name) && !englishSections.has(entry.name)) {
    ignored.push(entry.name);
  } else {
    counts.en += await copyEntry(entry, from, path.join(contentOut, 'docs', entry.name));
  }
}
const missing = LOCALES.filter((locale) => !counts[locale]);
if (!counts.en) throw new Error(`No English pages found in ${content}`);

await mkdir(path.dirname(sidebarOut), { recursive: true });
await writeFile(sidebarOut, `${JSON.stringify(sections.map(sidebarItem), null, 2)}\n`);

log(`source: ${source.label}`);
log(`pages: ${Object.entries(counts).map(([locale, n]) => `${locale} ${n}`).join(', ')}`);
if (missing.length) log(`no translation folder for ${missing.join(', ')}; Starlight shows the English pages there`);
if (ignored.length) log(`ignored folders for locales the site does not serve: ${ignored.join(', ')}`);
