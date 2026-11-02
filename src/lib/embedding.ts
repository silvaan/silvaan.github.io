// How an embedding looks on this site, so a reader knows one on sight from sim
// to sim. A vector is a strip of cells, one per dimension, coloured by value:
// blue for positive, orange for negative, the stage itself for zero, and the
// size of the number as intensity. A few fading dots after the last cell say
// that a real model has hundreds more. The colour of a word (its meaning, its
// group) lives on the chip above the strip, never in the cells.

import { withAlpha } from './story';

const SANS = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** The value palette, reserved for the cells of a strip. */
export const EMB = {
  pos: '#60a5fa',
  neg: '#fb923c',
  posLight: '#2563eb',
  negLight: '#ea580c',
};

/** Colour of one value; `scale` is the value drawn at full strength. */
export function cellColour(v: number, light: boolean, scale = 1, alpha = 1) {
  const t = Math.min(1, Math.abs(v) / scale);
  const base = v >= 0 ? (light ? EMB.posLight : EMB.pos) : light ? EMB.negLight : EMB.neg;
  return withAlpha(base, alpha * (0.06 + 0.94 * Math.pow(t, 0.8)));
}

export type StripStyle = {
  light: boolean;
  /** Theme-aware foreground, for the empty cell outlines and the dots. */
  ink: (a: number) => string;
  cell?: number;
  gap?: number;
  /** Height of a cell; square when left out. */
  h?: number;
  scale?: number;
  alpha?: number;
  /** The fading dots for the dimensions not shown. */
  more?: boolean;
};

/** Width a strip of n cells takes, dots included. */
export function stripWidth(n: number, o: Pick<StripStyle, 'cell' | 'gap' | 'more'> = {}) {
  const cell = o.cell ?? 8, gap = o.gap ?? 1.5;
  return n * cell + (n - 1) * gap + ((o.more ?? true) ? 16 : 0);
}

/** A vector as a row of cells, left edge at x, top at y. Returns its width. */
export function strip(ctx: CanvasRenderingContext2D, v: ArrayLike<number>, x: number, y: number, o: StripStyle) {
  const cell = o.cell ?? 8, gap = o.gap ?? 1.5, h = o.h ?? cell, scale = o.scale ?? 1, alpha = o.alpha ?? 1;
  const r = Math.min(2, cell / 4);
  ctx.save();
  for (let i = 0; i < v.length; i++) {
    const cx = x + i * (cell + gap);
    ctx.beginPath();
    ctx.roundRect(cx, y, cell, h, r);
    ctx.fillStyle = o.ink(0.05 * alpha);
    ctx.fill();
    ctx.fillStyle = cellColour(v[i], o.light, scale, alpha);
    ctx.fill();
  }
  let w = v.length * cell + (v.length - 1) * gap;
  if (o.more ?? true) {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = o.ink(0.4 * alpha * (1 - k / 3));
      ctx.beginPath();
      ctx.arc(x + w + 5 + k * 5, y + h / 2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    w += 16;
  }
  ctx.restore();
  return w;
}

export type TokenStyle = StripStyle & {
  /** Colour of the word: its meaning or group. */
  colour?: string;
  size?: number;
  /** Draw the chip outlined and brighter: the word the sim is about. */
  focus?: boolean;
  /** Fill behind the chip, so lines passing under it stay under it. */
  bg?: string;
};

/**
 * A word and its embedding: a chip with the word, the strip under it, both
 * centred on cx. Returns the chip's box, for lines that start or end on it.
 */
export function token(ctx: CanvasRenderingContext2D, word: string, v: ArrayLike<number>, cx: number, y: number, o: TokenStyle) {
  const size = o.size ?? 17, alpha = o.alpha ?? 1;
  ctx.save();
  ctx.font = `${o.focus ? 700 : 600} ${size}px ${SANS}`;
  const tw = ctx.measureText(word).width;
  const sw = stripWidth(v.length, { cell: o.cell, gap: o.gap, more: false });
  const w = Math.max(tw + 22, sw + 12), h = size + 14;
  const x = cx - w / 2;
  const col = o.colour ?? o.ink(0.9);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  if (o.bg) { ctx.fillStyle = o.bg; ctx.fill(); }
  ctx.fillStyle = withAlpha(col.startsWith('#') ? col : '#888888', o.focus ? 0.2 : 0.1);
  ctx.fill();
  ctx.strokeStyle = o.focus ? col : o.ink(0.12);
  ctx.lineWidth = o.focus ? 1.6 : 1;
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(word, cx, y + h / 2 + 0.5);
  ctx.restore();
  strip(ctx, v, cx - sw / 2, y + h + 7, { ...o, more: false });
  return { x, y, w, h, bottom: y + h + 7 + (o.h ?? o.cell ?? 8) };
}
