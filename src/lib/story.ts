// A simulation told as a short story: a few chapters that play one after the
// other, each with a headline drawn on the stage. The chapter buttons, Run /
// Pause and "Next" drive it; the page draws every frame from the chapter and
// the time spent in it, so jumping to any chapter is just a new start time.

import { segmented, transport } from './panel';

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Smooth start and stop. */
export const ease = (t: number) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
export const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
/** 0 before `a`, 1 after `b`, eased in between: the progress of one beat. */
export const beat = (t: number, a: number, b: number) => ease((t - a) / (b - a));

export type Chapter = {
  /** Seconds before moving on by itself; Infinity holds until the reader moves on. */
  dur: number;
  title: string;
  body: string;
};

/**
 * Plays chapters on a requestAnimationFrame loop. `frame(i, t, dt)` gets the
 * chapter, the seconds into it and the step since the last frame (0 while
 * paused, so a paused stage still redraws when the reader drags something).
 * `done(i)` may end a chapter early or late: return true when it is finished.
 */
export function story(o: {
  chapters: Chapter[];
  /** `live` is the real frame step, also while paused: for a chapter the reader has taken over. */
  frame: (i: number, t: number, dt: number, live: number) => void;
  enter?: (i: number) => void;
  done?: (i: number, t: number) => boolean;
  segId?: string;
  nextId?: string;
  /**
   * Ids of the controls that matter in chapter i (or null for all). The
   * others are dimmed, never hidden, so the panel keeps its shape.
   */
  relevant?: (i: number) => string[] | null;
}) {
  const n = o.chapters.length;
  let i = 0, t = 0, last = 0, dirty = true;
  /** The reader took over: the tour is paused and the chapter follows the controls. */
  let manual = false;
  const seg = segmented(o.segId ?? 'ch', (v) => go(+v));
  const tp = transport({
    onRun: (on) => {
      if (on) manual = false;
      if (on && i === n - 1 && finished()) go(0);
    },
    onReset: () => { go(0); tp.setRunning(true); },
  });

  // touching any control in the panel (other than the tour's own) hands it over
  const panel = document.querySelector('.sim-panel');
  const own = ['#' + (o.segId ?? 'ch'), '#run', '#next', '#reset'];
  const ours = (e: Event) => own.some((sel) => (e.target as HTMLElement).closest(sel));
  panel?.addEventListener('input', (e) => { if (!ours(e)) touch(); });
  panel?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button') && !ours(e)) touch();
  });
  function touch() {
    manual = true;
    if (tp.running()) tp.setRunning(false);
  }
  function dim(k: number) {
    const keep = o.relevant?.(k) ?? null;
    panel?.querySelectorAll<HTMLElement>(':scope > .control, :scope > div > .control').forEach((c) => {
      if (c.querySelector('#' + (o.segId ?? 'ch'))) return;
      const on = !keep || keep.some((id) => c.querySelector('#' + id));
      c.style.opacity = on ? '' : '0.45';
      c.style.transition = 'opacity 0.3s';
    });
  }
  const finished = () => (o.done ? o.done(i, t) : t >= o.chapters[i].dur);
  document.getElementById(o.nextId ?? 'next')?.addEventListener('click', () => go(Math.min(n - 1, i + 1)));

  function go(k: number) {
    i = k;
    t = 0;
    manual = false;
    seg.select(String(k));
    dim(k);
    o.enter?.(k);
    dirty = true;
  }

  // start playing the first time the stage comes into view
  const stage = document.querySelector('.sim-stage');
  let seen = false;
  if (stage && 'IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      if (seen || !es.some((e) => e.isIntersecting)) return;
      seen = true;
      tp.setRunning(true);
    }, { threshold: 0.4 }).observe(stage);
  }

  function loop(now: number) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    const run = tp.running();
    if (run) {
      t += dt;
      if (finished() && i < n - 1) go(i + 1);
    }
    o.frame(i, t, run ? dt : 0, run || manual ? dt : 0);
    dirty = false;
    requestAnimationFrame(loop);
  }

  return {
    start() {
      o.enter?.(0);
      seg.select('0');
      dim(0);
      requestAnimationFrame(loop);
    },
    go,
    chapter: () => i,
    time: () => t,
    /** Jump to a time inside the current chapter. */
    seek: (s: number) => { t = s; },
    playing: () => tp.running(),
    play: (on: boolean) => { if (on) manual = false; tp.setRunning(on); },
    /** Hand the chapter to the reader: pause, and let the controls drive it. */
    touch,
    manual: () => manual,
    get dirty() { return dirty; },
  };
}

/** Light pages draw on white: glows become plain dots and additive blending goes. */
export const isLight = (canvas: HTMLElement) =>
  getComputedStyle(canvas).getPropertyValue('--stage-light').trim() === '1';

/**
 * Pre-rendered soft dots, one per colour and size, so a few hundred glowing
 * points cost a drawImage each.
 */
export function glows() {
  const cache = new Map<string, HTMLCanvasElement>();
  return (colour: string, r: number, light: boolean) => {
    const key = `${colour}|${r}|${light}`;
    let c = cache.get(key);
    if (!c) {
      const R = Math.ceil(r * 4), dpr = 2;
      c = document.createElement('canvas');
      c.width = c.height = 2 * R * dpr;
      const g = c.getContext('2d')!;
      g.scale(dpr, dpr);
      if (!light) {
        const halo = g.createRadialGradient(R, R, 0, R, R, R);
        halo.addColorStop(0, withAlpha(colour, 0.55));
        halo.addColorStop(0.25, withAlpha(colour, 0.22));
        halo.addColorStop(1, withAlpha(colour, 0));
        g.fillStyle = halo;
        g.fillRect(0, 0, 2 * R, 2 * R);
      }
      g.beginPath();
      g.arc(R, R, r, 0, Math.PI * 2);
      g.fillStyle = colour;
      g.fill();
      if (!light) {
        g.beginPath();
        g.arc(R - r * 0.3, R - r * 0.3, r * 0.45, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.fill();
      }
      cache.set(key, c);
    }
    return c;
  };
}

/** "#5eead4" or "rgb(…)" at an opacity. */
export function withAlpha(colour: string, a: number) {
  if (colour.startsWith('#')) {
    const h = colour.slice(1);
    const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return `rgba(${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)},${a})`;
  }
  const m = colour.match(/[\d.]+/g) ?? ['0', '0', '0'];
  return `rgba(${m[0]},${m[1]},${m[2]},${a})`;
}

/** Mix two "#rrggbb" colours. */
export function mix(a: string, b: string, t: number) {
  const p = (c: string, k: number) => parseInt(c.slice(1 + 2 * k, 3 + 2 * k), 16);
  const ch = (k: number) => Math.round(lerp(p(a, k), p(b, k), t)).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

const SANS = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Words broken into lines no wider than `max`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const next = line ? line + ' ' + w : w;
      if (ctx.measureText(next).width > max && line) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * The chapter's headline in the top-left corner: a small "2 / 5", the title
 * and a sentence or two, fading and sliding in as the chapter starts.
 * Returns the height it took.
 */
export function headline(
  ctx: CanvasRenderingContext2D,
  ink: (a: number) => string,
  o: {
    index: number; count: number; title: string; body: string; t: number;
    x?: number; y?: number; width?: number; accent?: string;
    /** Show that the reader has the controls, next to the chapter number. */
    manual?: boolean;
  }
) {
  const x = o.x ?? 28, y = o.y ?? 30, width = o.width ?? 560;
  const a = easeOut(o.t / 0.6), dy = (1 - a) * 8;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `600 13px ${SANS}`;
  ctx.fillStyle = withAlpha(o.accent ?? '#7c8cff', 0.95 * a);
  ctx.fillText(`${o.index + 1} / ${o.count}`, x, y + dy);
  if (o.manual) {
    const w0 = ctx.measureText(`${o.index + 1} / ${o.count}`).width + 12;
    ctx.font = `500 12px ${SANS}`;
    const label = 'you are in control · Run resumes the tour';
    const lw = ctx.measureText(label).width + 16;
    ctx.fillStyle = withAlpha(o.accent ?? '#7c8cff', 0.16);
    ctx.beginPath();
    ctx.roundRect(x + w0, y + dy - 13, lw, 19, 9.5);
    ctx.fill();
    ctx.fillStyle = withAlpha(o.accent ?? '#7c8cff', 0.95);
    ctx.fillText(label, x + w0 + 8, y + dy + 1);
  }
  ctx.font = `650 26px ${SANS}`;
  ctx.fillStyle = ink(0.95 * a);
  ctx.fillText(o.title, x, y + 32 + dy);
  const b = easeOut((o.t - 0.25) / 0.7);
  ctx.font = `400 16px ${SANS}`;
  ctx.fillStyle = ink(0.72 * b);
  const lines = wrap(ctx, o.body, width);
  lines.forEach((l, k) => ctx.fillText(l, x, y + 60 + k * 22 + (1 - b) * 6));
  ctx.restore();
  return 60 + lines.length * 22;
}

/** A short label in the site's sans font, for the bits of prose inside the picture. */
export function say(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  o: { colour?: string; size?: number; weight?: number; align?: CanvasTextAlign; alpha?: number; halo?: string } = {}
) {
  ctx.save();
  ctx.font = `${o.weight ?? 500} ${o.size ?? 14}px ${SANS}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = o.alpha ?? 1;
  if (o.halo) {
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = o.halo;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = o.colour ?? '#e8e9ec';
  ctx.fillText(text, x, y);
  ctx.restore();
}
