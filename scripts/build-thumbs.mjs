// Screenshots every simulator's stage for the gallery cards and link previews.
//
//   1. start the site (astro dev or preview)
//   2. PLAYWRIGHT=/path/to/node_modules/playwright-core [CHROME=/path/to/chrome] \
//        node scripts/build-thumbs.mjs [http://localhost:4321] [area/slug ...]
//
// Writes, for each sim:
//   public/thumbs/<area>/<slug>.webp        640×400, dark theme
//   public/thumbs/<area>/<slug>-light.webp  640×400, light theme
//   public/og/<area>/<slug>.jpg             1200×630, dark theme, for og:image
// plus public/og/default.jpg from the home page. Pass slugs to redo only those.
// Images are encoded by the browser itself, so nothing else is needed.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith('http')) ?? 'http://localhost:4321').replace(/\/$/, '');
const ONLY = args.filter((a) => !a.startsWith('http'));
const SETTLE_MS = 3500;
const PARALLEL = 4;

const pwPath = process.env.PLAYWRIGHT;
if (!pwPath) {
  console.error('Set PLAYWRIGHT to a playwright or playwright-core package folder.');
  process.exit(1);
}
const pw = await import(pathToFileURL(join(pwPath, 'index.mjs')).href).catch(() =>
  import(pathToFileURL(join(pwPath, 'index.js')).href)
);
const { chromium } = pw.default ?? pw;

const items = await (await fetch(`${BASE}/search.json`)).json();
const sims = items
  .filter((i) => i.kind === 'sim')
  .map((i) => i.href.replace('/simulations/', ''))
  .filter((k) => !ONLY.length || ONLY.includes(k));

const browser = await chromium.launch({
  // CHROME: a Chromium binary to use instead of the one Playwright expects
  executablePath: process.env.CHROME || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

/** Fit a PNG into w×h (cropping the overflow, centred) and encode it. */
async function encode(page, png, w, h, type, quality) {
  const data = await page.evaluate(
    async ({ b64, w, h, type, quality }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      const s = Math.max(w / img.width, h / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      return c.toDataURL(type, quality).split(',')[1];
    },
    { b64: png.toString('base64'), w, h, type, quality }
  );
  return Buffer.from(data, 'base64');
}

async function save(rel, buf) {
  const file = join(ROOT, 'public', rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buf);
}

async function contextFor(theme) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1.5 });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
    } catch {}
  }, theme);
  return ctx;
}

// the stage without its equation row and toolbar: just the picture
const CLEAN = `
  .stage-head, .stage-tools, .sim-eq { display: none !important; }
  .sim-stage { border: 0 !important; border-radius: 0 !important; padding: 0 !important; }
  .sim-stage canvas { border-radius: 0 !important; }
`;

async function shoot(ctx, encoder, key, theme) {
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/simulations/${key}`, { waitUntil: 'load', timeout: 90000 });
    await page.addStyleTag({ content: CLEAN });
    await page.waitForTimeout(SETTLE_MS);
    const stage = page.locator('.sim-stage').first();
    const png = await stage.screenshot({ type: 'png', timeout: 30000 });
    const suffix = theme === 'light' ? '-light' : '';
    await save(`thumbs/${key}${suffix}.webp`, await encode(encoder, png, 640, 400, 'image/webp', 0.78));
    if (theme === 'dark') await save(`og/${key}.jpg`, await encode(encoder, png, 1200, 630, 'image/jpeg', 0.84));
    console.log('ok  ', theme, key);
  } catch (e) {
    console.log('FAIL', theme, key, String(e.message).split('\n')[0]);
  } finally {
    await page.close();
  }
}

for (const theme of ['dark', 'light']) {
  const ctx = await contextFor(theme);
  const encoder = await ctx.newPage();
  const queue = [...sims];
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      for (let key; (key = queue.shift()); ) await shoot(ctx, encoder, key, theme);
    })
  );

  if (theme === 'dark' && !ONLY.length) {
    // the site-wide preview: the home page hero
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForTimeout(SETTLE_MS);
    const png = await page.screenshot({ type: 'png' });
    await save('og/default.jpg', await encode(encoder, png, 1200, 630, 'image/jpeg', 0.84));
    await page.close();
    console.log('ok   default');
  }
  await ctx.close();
}

await browser.close();
