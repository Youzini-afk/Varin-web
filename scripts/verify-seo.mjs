// Checks published build artifacts without a browser, network access or optional dependencies.
// Run after `bun run build`; an optional argument selects another Astro output directory.
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.argv[2] ?? 'dist');
const read = (file) => readFile(path.join(out, file), 'utf8');
const decode = (text) => text.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => ({
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'",
})[entity]);
const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map(([text]) =>
  Object.fromEntries([...text.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])));
const fileFor = (url) => {
  const pathname = new URL(url).pathname;
  return pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : pathname.slice(1);
};

const sitemap = await read('sitemap.xml');
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body]) => ({
  loc: decode(body.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? ''),
  alternates: Object.fromEntries([...body.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => [lang, decode(href)])),
}));
const allUrls = entries.map((entry) => entry.loc);
assert.equal(new Set(allUrls).size, allUrls.length, 'Sitemap URLs must be unique');
const isHome = (url) => /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?$/.test(new URL(url).pathname);
const urls = allUrls.filter(isHome);
const guideEntries = entries.filter((entry) => !isHome(entry.loc));
assert.equal(urls.length, 5, 'Sitemap must contain the five HTML homepages');
assert.ok(guideEntries.length >= 5 && guideEntries.length % 5 === 0, 'Sitemap must list every user guide in five languages');
const home = urls.find((url) => new URL(url).pathname === '/');
assert.ok(home, 'English homepage must be in the sitemap');
const origin = new URL(home).origin;
if (process.env.SITE_URL) assert.equal(origin, new URL(process.env.SITE_URL).origin, 'Build must use SITE_URL');
const robots = await read('robots.txt');
assert.match(robots, /User-agent: \*\s+Allow: \//);
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert.doesNotMatch(robots, /Disallow:\s*\/\s*(?:\n|$)/);
const headers = await read('_headers');
assert.match(headers, /X-Content-Type-Options: nosniff/);
assert.match(headers, /Cache-Control: public, max-age=31536000, immutable/);
const guide = await read('llms.txt');
assert.match(guide, /^# Varin\s+> /);
const titles = new Set();

for (const url of urls) {
  assert.equal(new URL(url).origin, origin);
  const html = await read(fileFor(url));
  const links = tags(html, 'link');
  const metas = tags(html, 'meta');
  const meta = (name) => metas.find((tag) => tag.name === name || tag.property === name)?.content;
  assert.deepEqual(links.filter((tag) => tag.rel === 'canonical').map((tag) => tag.href), [url]);
  assert.equal(meta('og:url'), url);
  assert.match(meta('robots'), /^index, follow/);
  assert.ok(meta('description')?.length > 30, `Missing description: ${url}`);
  const title = decode(html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '');
  assert.ok(title.includes('Varin'));
  titles.add(title);
  assert.equal(meta('twitter:title'), title);
  assert.equal(meta('twitter:description'), meta('description'));
  assert.equal(meta('twitter:card'), 'summary_large_image');
  assert.equal(meta('twitter:image'), meta('og:image'));
  assert.match(meta('og:locale'), /^[a-z]{2}_[A-Z]{2}$/);
  const alternates = links.filter((tag) => tag.rel === 'alternate' && tag.hreflang);
  assert.equal(alternates.length, 6);
  assert.deepEqual(alternates.filter((tag) => tag.hreflang !== 'x-default').map((tag) => tag.href).sort(), [...urls].sort());
  assert.equal(alternates.find((tag) => tag.hreflang === 'x-default')?.href, home);
  for (const tag of alternates) assert.ok(sitemap.includes(`hreflang="${tag.hreflang}" href="${tag.href}"`));
  assert.equal(links.find((tag) => tag.rel === 'describedby')?.href, `${origin}/llms.txt`);
  const mdUrl = links.find((tag) => tag.type === 'text/markdown')?.href;
  assert.ok(mdUrl, `Missing Markdown alternate: ${url}`);
  assert.ok(guide.includes(`](${mdUrl})`), `Discovery guide must link to ${mdUrl}`);
  const markdown = await read(fileFor(mdUrl));
  assert.ok(markdown.startsWith(`# ${title}\n`));
  assert.ok(markdown.includes(`Canonical: ${url}\n`));
  assert.ok(markdown.includes(`> ${meta('description')}`));
  assert.doesNotMatch(markdown, /<(?:script|style|canvas)\b/i);
  for (const [, target] of markdown.matchAll(/\]\((https?:[^)]+)\)/g)) {
    const parsed = new URL(target);
    if (parsed.origin === origin && parsed.hash) {
      assert.equal(`${parsed.origin}${parsed.pathname}`, url);
      assert.ok(html.includes(`id="${parsed.hash.slice(1)}"`), `Missing section target: ${target}`);
    }
  }
  const block = headers.split('\n\n').find((part) => part.startsWith(`${new URL(mdUrl).pathname}\n`));
  assert.ok(block?.includes('Content-Type: text/markdown; charset=utf-8'));
  assert.ok(block.includes(`<${url}>; rel="canonical"`));
  const structured = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? 'null');
  assert.equal(structured?.['@context'], 'https://schema.org');
  const page = structured['@graph'].find((node) => node['@type'] === 'WebPage');
  assert.equal(page.url, url);
  assert.equal(page.name, title);
  assert.equal(page.description, meta('description'));
  assert.equal(page.inLanguage, html.match(/<html lang="([^"]+)"/)?.[1]);
  const source = structured['@graph'].find((node) => node['@id'] === page.mainEntity['@id']);
  assert.equal(source['@type'], 'SoftwareSourceCode');
  assert.equal(source.codeRepository, 'https://github.com/Youzini-afk/Varin');
  const image = new URL(meta('og:image'));
  assert.equal(image.origin, origin);
  const png = await readFile(path.join(out, fileFor(image)));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.doesNotMatch(html, /location\.replace|navigator\.languages/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
}
assert.equal(titles.size, urls.length, 'Each language must have its own title');

// User guides: canonical, alternates matching the sitemap, search indexing and the shared preview image.
for (const { loc: url, alternates } of guideEntries) {
  assert.equal(new URL(url).origin, origin);
  assert.match(new URL(url).pathname, /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?docs\//, `Guide outside /docs/: ${url}`);
  const html = await read(fileFor(url));
  const links = tags(html, 'link');
  const metas = tags(html, 'meta');
  const meta = (name) => metas.find((tag) => tag.name === name || tag.property === name)?.content;
  assert.deepEqual(links.filter((tag) => tag.rel === 'canonical').map((tag) => tag.href), [url]);
  assert.equal(meta('og:url'), url);
  assert.match(meta('robots') ?? '', /^index, follow/);
  assert.ok(meta('description')?.length > 5, `Missing description: ${url}`);
  assert.ok(decode(html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '').includes('Varin'), `Title without Varin: ${url}`);
  const found = Object.fromEntries(links.filter((tag) => tag.rel === 'alternate' && tag.hreflang).map((tag) => [tag.hreflang, tag.href]));
  assert.deepEqual(found, alternates, `Alternates differ from the sitemap: ${url}`);
  assert.equal(links.find((tag) => tag.rel === 'describedby')?.href, `${origin}/llms.txt`);
  assert.equal(new URL(meta('og:image')).origin, origin);
  assert.match(meta('og:locale') ?? '', /^[a-z]{2}_[A-Z]{2}$/);
  assert.ok(html.includes('data-pagefind-body'), `Guide not indexed for search: ${url}`);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `One h1 per guide: ${url}`);
}

// Every same-site link in the built HTML resolves to a built file.
const builtFile = async (pathname) => {
  for (const candidate of [pathname.endsWith('/') ? `${pathname}index.html` : pathname, `${pathname}/index.html`]) {
    try { if ((await stat(path.join(out, decodeURIComponent(candidate)))).isFile()) return true; } catch { /* try the next form */ }
  }
  return false;
};
const htmlFiles = (await readdir(out, { recursive: true })).filter((file) => file.endsWith('.html'));
let checkedLinks = 0;
for (const file of htmlFiles) {
  const html = await read(file);
  for (const { href } of tags(html, 'a')) {
    if (!href || href.startsWith('//') || !(href.startsWith('/') || href.startsWith(origin))) continue;
    const pathname = new URL(href, origin).pathname;
    assert.ok(await builtFile(pathname), `${file} links to a missing page: ${href}`);
    checkedLinks += 1;
  }
}

const full = await read('llms-full.txt');
assert.ok(full.startsWith((await read('index.md')).trimEnd()), 'llms-full.txt must start with the English overview');
for (const { loc } of guideEntries.filter((entry) => new URL(entry.loc).pathname.startsWith('/docs/'))) {
  assert.ok(full.includes(`Canonical: ${loc}\n`), `llms-full.txt is missing ${loc}`);
  assert.ok(guide.includes(`](${loc})`), `llms.txt is missing ${loc}`);
}
const notFound = await read('404.html');
assert.equal(tags(notFound, 'meta').find((tag) => tag.name === 'robots')?.content, 'noindex, follow');
assert.ok(!tags(notFound, 'link').some((tag) => tag.rel === 'canonical'));
assert.ok(!sitemap.includes('404') && !sitemap.includes('.md') && !sitemap.includes('llms'));
console.log(`SEO artifacts verified: ${urls.length} languages, ${guideEntries.length} guide pages, ${checkedLinks} internal links, sitemap/robots, JSON-LD, PNG previews, Markdown/llms links and Cloudflare headers (${origin}).`);
