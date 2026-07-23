// Shared helpers for the interactive simulations.
//
// Every simulator draws to a <canvas> with a fixed logical size given by its
// width/height attributes. These helpers keep that logical coordinate system
// intact while making rendering crisp on HiDPI screens and projectors, and add
// the common "chrome" (fullscreen, keyboard shortcuts, shareable links) once so
// each sim page stays focused on its own maths.

export interface CanvasSetup {
  ctx: CanvasRenderingContext2D;
  /** Logical drawing width, unchanged by device pixel ratio. */
  W: number;
  /** Logical drawing height, unchanged by device pixel ratio. */
  H: number;
}

/**
 * Prepare a canvas for crisp rendering. The returned `W`/`H` are the logical
 * dimensions the drawing code should use; the backing store is scaled by the
 * device pixel ratio behind the scenes. Pass `redraw` for sims that only paint
 * on demand so they repaint after a fullscreen change.
 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  redraw?: () => void
): CanvasSetup {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d')!;

  function applyDPR() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  applyDPR();

  const repaint = () => {
    applyDPR();
    redraw?.();
  };
  document.addEventListener('fullscreenchange', repaint);
  window.addEventListener('themechange', () => redraw?.());

  return { ctx, W, H };
}

/**
 * Read a CSS custom property. Sims read their palette from inside `.sim-stage`
 * (which pins a fixed dark scale) so the drawing looks identical whether the
 * surrounding page is in light or dark mode.
 */
export function palette(el: Element) {
  const cs = getComputedStyle(el);
  return (name: string, fallback = '') =>
    cs.getPropertyValue(name).trim() || fallback;
}

/**
 * Canvas text with real subscripts: `"V_CE 2.5 V"` draws V, a small lowered
 * CE, then the rest. Everything after an underscore up to the next
 * non-alphanumeric goes down and small, so sims can write `I_C` in a string
 * and never show a stray underscore.
 *
 * `ink(alpha)` supplies the default fill, normally the theme-aware stage ink.
 */
export function makeText(
  ctx: CanvasRenderingContext2D,
  ink: (alpha: number) => string,
  scale = 1.22,
  font = 'ui-monospace, SFMono-Regular, Menlo, monospace'
) {
  type Part = { t: string; sub: boolean };

  function parts(text: string): Part[] {
    const out: Part[] = [];
    let i = 0,
      plain = '';
    while (i < text.length) {
      if (text[i] === '_' && i + 1 < text.length && /[A-Za-z0-9]/.test(text[i + 1])) {
        if (plain) out.push({ t: plain, sub: false });
        plain = '';
        let j = i + 1;
        while (j < text.length && /[A-Za-z0-9]/.test(text[j])) j++;
        out.push({ t: text.slice(i + 1, j), sub: true });
        i = j;
      } else plain += text[i++];
    }
    if (plain) out.push({ t: plain, sub: false });
    return out;
  }

  /** Width the same text would occupy, for laying out legends by hand. */
  function textWidth(text: string, size: number) {
    const px = Math.round(size * scale);
    const sp = Math.round(px * 0.74);
    let w = 0;
    for (const p of parts(text)) {
      ctx.font = `${p.sub ? sp : px}px ${font}`;
      w += ctx.measureText(p.t).width;
    }
    return w;
  }

  function label(
    text: string,
    x: number,
    y: number,
    alpha = 0.55,
    align: CanvasTextAlign = 'left',
    size = 11,
    colour?: string
  ) {
    const px = Math.round(size * scale);
    const sp = Math.round(px * 0.74);
    const ps = parts(text);
    ctx.fillStyle = colour ?? ink(alpha);
    ctx.textAlign = 'left';
    if (ps.length === 1 && !ps[0].sub) {
      ctx.font = `${px}px ${font}`;
      const w = align === 'left' ? 0 : ctx.measureText(text).width;
      ctx.fillText(text, align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y);
      return;
    }
    let total = 0;
    for (const p of ps) {
      ctx.font = `${p.sub ? sp : px}px ${font}`;
      total += ctx.measureText(p.t).width;
    }
    let cx = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
    for (const p of ps) {
      ctx.font = `${p.sub ? sp : px}px ${font}`;
      ctx.fillText(p.t, cx, p.sub ? y + Math.round(px * 0.2) : y);
      cx += ctx.measureText(p.t).width;
    }
  }

  return { label, textWidth };
}

/** Same subscript convention as `makeText`, for HTML panel labels. */
export function subHtml(text: string) {
  return text.replace(/([A-Za-zΩβμ])_([A-Za-z0-9]+)/g, '$1<sub>$2</sub>');
}

// ---------------------------------------------------------------------------
// Stage chrome: fullscreen, keyboard shortcuts, shareable URL state.
// Called once per sim page from SimLayout.
// ---------------------------------------------------------------------------

function toggleFullscreen(stage: Element) {
  if (document.fullscreenElement) document.exitFullscreen();
  else (stage as HTMLElement).requestFullscreen?.();
}

function clickIfPresent(id: string): boolean {
  const el = document.getElementById(id);
  if (el) {
    (el as HTMLElement).click();
    return true;
  }
  return false;
}

/** space = run/pause, s = step, r = reset, f = fullscreen. */
function installKeyboard(stage: Element) {
  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.tagName === 'SELECT' ||
        t.isContentEditable)
    )
      return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === ' ' || e.key === 'Spacebar') {
      if (clickIfPresent('run') || clickIfPresent('play')) e.preventDefault();
    } else if (e.key === 's' || e.key === 'S') {
      clickIfPresent('step');
    } else if (e.key === 'r' || e.key === 'R') {
      clickIfPresent('reset');
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen(stage);
    }
  });
}

// --- shareable state -------------------------------------------------------
// Best-effort: serialise the standard panel controls (ranges, segmented
// buttons, selects, checkboxes) into the URL so a prepared setup can be shared
// as a link. Camera angle and other bespoke state are not captured.

function panelControls() {
  const panel = document.querySelector('.sim-panel');
  return {
    ranges: Array.from(
      panel?.querySelectorAll<HTMLInputElement>('input[type=range][id]') ?? []
    ),
    checks: Array.from(
      panel?.querySelectorAll<HTMLInputElement>('input[type=checkbox][id]') ?? []
    ),
    selects: Array.from(
      panel?.querySelectorAll<HTMLSelectElement>('select[id]') ?? []
    ),
    segs: Array.from(panel?.querySelectorAll<HTMLElement>('.seg[id]') ?? []),
  };
}

function encodeState(): string {
  const p = new URLSearchParams();
  try {
    const { ranges, checks, selects, segs } = panelControls();
    for (const r of ranges) p.set(r.id, r.value);
    for (const c of checks) p.set(c.id, c.checked ? '1' : '0');
    for (const s of selects) p.set(s.id, s.value);
    for (const seg of segs) {
      const btns = Array.from(seg.querySelectorAll('button'));
      const active = btns.findIndex((b) => b.classList.contains('active'));
      if (active >= 0) p.set('seg_' + seg.id, String(active));
    }
  } catch {
    /* never let sharing break the page */
  }
  return p.toString();
}

function applyState(search: string) {
  try {
    const p = new URLSearchParams(search);
    if ([...p.keys()].length === 0) return;
    const { ranges, checks, selects, segs } = panelControls();
    for (const r of ranges) {
      const v = p.get(r.id);
      if (v !== null) {
        r.value = v;
        r.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    for (const c of checks) {
      const v = p.get(c.id);
      if (v !== null) {
        const want = v === '1';
        if (c.checked !== want) {
          c.checked = want;
          c.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
    for (const s of selects) {
      const v = p.get(s.id);
      if (v !== null) {
        s.value = v;
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    for (const seg of segs) {
      const v = p.get('seg_' + seg.id);
      if (v !== null) {
        const btns = Array.from(seg.querySelectorAll('button'));
        const btn = btns[+v];
        if (btn && !btn.classList.contains('active'))
          (btn as HTMLElement).click();
      }
    }
  } catch {
    /* ignore malformed links */
  }
}

function installShareButton(stage: Element) {
  const btn = stage.querySelector('[data-share]') as HTMLButtonElement | null;
  if (!btn) return;
  const label = btn.querySelector('.share-label');
  btn.addEventListener('click', async () => {
    const qs = encodeState();
    const url =
      location.origin + location.pathname + (qs ? '?' + qs : '');
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback: put it in the address bar so it can be copied manually.
      history.replaceState(null, '', url);
    }
    if (label) {
      const prev = label.textContent;
      label.textContent = 'Copied!';
      setTimeout(() => (label.textContent = prev), 1400);
    }
  });
}

const FULLSCREEN_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V5a1 1 0 0 1 1-1h4 M20 9V5a1 1 0 0 0-1-1h-4 M4 15v4a1 1 0 0 0 1 1h4 M20 15v4a1 1 0 0 0-1 1h-4"/></svg>';
const SHARE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15l6-6 M11 6l.5-.5a3.5 3.5 0 0 1 5 5l-1.5 1.5 M13 18l-.5.5a3.5 3.5 0 0 1-5-5L9 12"/></svg>';

function buildToolbar(stage: Element) {
  const bar = document.createElement('div');
  bar.className = 'stage-tools';
  bar.innerHTML =
    `<button type="button" data-share aria-label="Copy shareable link" title="Copy link to this setup">${SHARE_ICON}<span class="share-label">Link</span></button>` +
    `<button type="button" data-fullscreen aria-label="Toggle fullscreen" title="Fullscreen (f)">${FULLSCREEN_ICON}</button>`;
  stage.appendChild(bar);
}

/** Wire up fullscreen button, keyboard shortcuts and link sharing. */
export function initStageChrome() {
  const stage = document.querySelector('.sim-stage');
  if (!stage) return;

  buildToolbar(stage);

  const fsBtn = stage.querySelector('[data-fullscreen]') as HTMLButtonElement | null;
  fsBtn?.addEventListener('click', () => toggleFullscreen(stage));

  installKeyboard(stage);
  installShareButton(stage);

  // Restore shared state after the sim's own script has initialised.
  requestAnimationFrame(() => requestAnimationFrame(() => applyState(location.search)));
}
