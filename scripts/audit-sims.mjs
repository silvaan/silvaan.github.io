// Checks every simulator for the things that make a page feel broken:
// layout that jumps while it runs, a page whose height keeps changing (the
// scrollbar flickers), canvas labels too small to read, and script errors.
//
//   1. start the site (astro dev or preview)
//   2. PLAYWRIGHT=/path/to/node_modules/playwright-core [CHROME=/path/to/chrome] \
//        node scripts/audit-sims.mjs [http://localhost:4321] [--mobile] [--json out.json] [area/slug ...]
//
// For each page it loads the sim, lets it settle, presses space (run/pause),
// clicks up to five "Show me" buttons, and watches what moves. Exits 1 when a
// page fails a limit, so it can gate a commit.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith('http')) ?? 'http://localhost:4321').replace(/\/$/, '');
const MOBILE = args.includes('--mobile');
const jsonAt = args.indexOf('--json');
const JSON_OUT = jsonAt >= 0 ? args[jsonAt + 1] : null;
const ONLY = args.filter((a, i) => !a.startsWith('http') && !a.startsWith('--') && i !== jsonAt + 1);

/** What a page must meet. Text sizes are what a label shows as on screen. */
const LIMITS = MOBILE
  ? { shift: 0.02, heights: 2, minText: 9, smallShare: 0.25, viewport: [390, 844] }
  : { shift: 0.01, heights: 2, minText: 11, smallShare: 0.1, viewport: [1440, 900] };

const pwPath = process.env.PLAYWRIGHT;
if (!pwPath) {
  console.error('Set PLAYWRIGHT to a playwright or playwright-core package folder.');
  process.exit(2);
}
const pw = await import(pathToFileURL(join(pwPath, 'index.mjs')).href).catch(() =>
  import(pathToFileURL(join(pwPath, 'index.js')).href)
);
const { chromium } = pw.default ?? pw;

// Runs in the page before any of its scripts.
function instrument() {
  const A = (window.__audit = { shifts: [], fonts: {}, heights: new Set(), started: 0 });
  const where = (n) => {
    if (n && n.nodeType !== 1) n = n.parentElement;
    if (!n) return '?';
    const zone = n.closest('.result-strip, .stage-head, .sim-panel, .scene-caption, .observe, .sim-stage, .sim-head, .sim-next, .sim-side');
    const id = n.id ? '#' + n.id : typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/)[0] : '';
    return `${zone ? zone.className.split(/\s+/)[0] : 'page'} > ${n.tagName.toLowerCase()}${id}`;
  };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        A.shifts.push({ t: e.startTime, v: e.value, src: (e.sources || []).slice(0, 3).map((s) => where(s.node)) });
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  // every label drawn on a 2D canvas, by the size it shows at on screen
  const fill = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
    try {
      const c = this.canvas;
      if (c && c.clientWidth && String(text).trim()) {
        const px = parseFloat((this.font.match(/([\d.]+)px/) || [])[1] || '10');
        const shown = px * Math.hypot(this.getTransform().a, this.getTransform().b) * (c.clientWidth / c.width);
        const k = Math.round(shown * 2) / 2;
        A.fonts[k] = (A.fonts[k] || 0) + 1;
      }
    } catch {}
    return fill.call(this, text, ...rest);
  };
  window.__sample = () => A.heights.add(document.documentElement.scrollHeight);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const sims = (await (await fetch(`${BASE}/search.json`)).json())
  .filter((i) => i.kind === 'sim')
  .map((i) => i.href)
  .filter((h) => !ONLY.length || ONLY.some((o) => h.endsWith(o)));

const [vw, vh] = LIMITS.viewport;
const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, isMobile: MOBILE, hasTouch: MOBILE });
await ctx.addInitScript(instrument);

const results = [];
const queue = [...sims];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let href; (href = queue.shift()); ) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)));
      try {
        await page.goto(BASE + href, { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(1800);
        await page.evaluate(() => {
          window.__audit.started = performance.now();
          setInterval(window.__sample, 80);
        });
        const stage = await page.evaluate(() => {
          const r = document.querySelector('.sim-stage')?.getBoundingClientRect();
          return r ? { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) } : null;
        });
        await page.keyboard.press('Space');
        await page.waitForTimeout(1500);
        const tries = await page.evaluate(() => document.querySelectorAll('button[data-try]:not([hidden])').length);
        for (let i = 0; i < Math.min(tries, 5); i++) {
          await page.evaluate((i) => document.querySelectorAll('button[data-try]:not([hidden])')[i]?.click(), i);
          await page.waitForTimeout(1200);
        }
        const A = await page.evaluate(() => {
          const A = window.__audit;
          const after = A.shifts.filter((s) => s.t > A.started);
          return {
            load: A.shifts.filter((s) => s.t <= A.started).reduce((a, s) => a + s.v, 0),
            shift: after.reduce((a, s) => a + s.v, 0),
            movers: [...new Set(after.flatMap((s) => s.src))].slice(0, 4),
            heights: [...A.heights],
            fonts: A.fonts,
          };
        });
        const total = Object.values(A.fonts).reduce((a, b) => a + b, 0);
        const small = Object.entries(A.fonts).reduce((a, [k, v]) => a + (+k < LIMITS.minText ? v : 0), 0);
        const smallest = total ? Math.min(...Object.keys(A.fonts).map(Number)) : null;
        results.push({ href, stage, errors, ...A, smallShare: total ? small / total : 0, smallest });
      } catch (e) {
        results.push({ href, errors: [...errors, 'audit: ' + e.message.split('\n')[0]], fail: true });
      }
      await page.close();
    }
  })
);
await browser.close();

/* ---------- report ---------- */
const problems = (r) => {
  const p = [];
  if (r.fail || r.errors.length) p.push(`errors: ${r.errors[0]}`);
  if (r.shift > LIMITS.shift) p.push(`moves while running (${r.shift.toFixed(3)}: ${r.movers.join(', ')})`);
  if (r.heights?.length > LIMITS.heights) p.push(`page height changes ${r.heights.length - 1}×`);
  if (r.smallShare > LIMITS.smallShare)
    p.push(`${Math.round(r.smallShare * 100)}% of canvas labels under ${LIMITS.minText}px (smallest ${r.smallest}px)`);
  if (!MOBILE && r.stage && r.stage.bottom - r.stage.top > vh - 60) p.push(`stage taller than the window`);
  return p;
};

results.sort((a, b) => a.href.localeCompare(b.href));
let failed = 0;
for (const r of results) {
  const p = problems(r);
  if (!p.length) continue;
  failed++;
  console.log(`✗ ${r.href.replace('/simulations/', '')}`);
  for (const line of p) console.log(`    ${line}`);
}
const loadShift = results.filter((r) => r.load > 0.05).length;
console.log(
  `\n${results.length - failed}/${results.length} pass (${MOBILE ? 'phone 390×844' : 'desktop 1440×900'})` +
    (loadShift ? ` · ${loadShift} still shift while loading` : '')
);
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));
process.exit(failed ? 1 : 0);
