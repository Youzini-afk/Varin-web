// Renders the built site in a local Chromium-family browser and saves screenshots to .screens/.
// Start `bun run preview` first. Needs puppeteer-core: resolved from this project, or from a Varin
// checkout (VARIN_SOURCE_DIR, default ../Varin) where the desktop package already depends on it.
//   BROWSER_PATH  browser executable (default: Microsoft Edge on Windows)
//   SITE_URL      site origin (default: http://localhost:4321)
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const varin = path.resolve(process.env.VARIN_SOURCE_DIR ?? path.join(root, '..', 'Varin'));
const load = () => {
  for (const base of [path.join(root, 'package.json'), path.join(varin, 'packages', 'electron', 'package.json')]) {
    try { return createRequire(base)('puppeteer-core'); } catch { /* try the next location */ }
  }
  throw new Error('puppeteer-core not found; install it or set VARIN_SOURCE_DIR');
};
const puppeteer = load();
const site = process.env.SITE_URL ?? 'http://localhost:4321';
const executablePath = process.env.BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const out = path.join(root, '.screens');
await mkdir(out, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
const page = await browser.newPage();
const problems = [];
page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) problems.push(message.text()); });
page.on('pageerror', (error) => problems.push(String(error)));

const shot = (name, options = {}) => page.screenshot({ path: path.join(out, `${name}.png`), ...options });
const setTheme = (theme) => page.evaluate((value) => document.querySelector(`[data-theme-choice="${value}"]`)?.click(), theme);

const hero = async (prefix, url, width, height) => {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await setTheme(prefix.includes('dark') ? 'dark' : 'light');
  await sleep(2400);
  const travel = await page.evaluate(() => {
    const track = document.querySelector('[data-hero-track]');
    return track ? track.offsetHeight - window.innerHeight : 0;
  });
  for (const progress of [0, 0.3, 0.55, 0.8, 1]) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(travel * progress));
    await sleep(900);
    await shot(`${prefix}-hero-${Math.round(progress * 100)}`);
  }
};

const sections = async (prefix, url, width) => {
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await setTheme(prefix.includes('dark') ? 'dark' : 'light');
  await page.addStyleTag({ content: '.js [data-reveal]{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}' });
  await sleep(600);
  for (const id of ['team', 'modes', 'bot', 'harness', 'extensions']) {
    const box = await page.evaluate((selector) => {
      const element = document.getElementById(selector);
      if (!element) return null;
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
      const rect = element.getBoundingClientRect();
      return { y: rect.top + window.scrollY, height: rect.height };
    }, id);
    if (!box) continue;
    await sleep(700);
    await shot(`${prefix}-${id}`, { clip: { x: 0, y: box.y, width, height: box.height }, captureBeyondViewport: true });
  }
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await sleep(900);
  await shot(`${prefix}-end`);
};

await hero('light', `${site}/zh-cn/`, 1366, 860);
await hero('dark', `${site}/`, 1366, 860);
await sections('light', `${site}/zh-cn/`, 1366);
await sections('dark', `${site}/`, 1366);
await hero('mobile-light', `${site}/zh-cn/`, 390, 844);
await sections('mobile-light', `${site}/zh-cn/`, 390);

console.log(JSON.stringify({ out, problems }, null, 2));
await browser.close();
