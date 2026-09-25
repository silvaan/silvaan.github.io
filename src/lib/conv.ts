// Small integer kernels and pictures for the convolution pages, chosen so a
// sum of products can be followed in your head and the output shows what the
// filter was looking for.

/** A deterministic integer hash, so a seed always gives the same numbers. */
export function hash(a: number, b: number, c: number, d = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177 + d * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export type Kind = 'random' | 'vedge' | 'hedge' | 'blur' | 'sharpen';

export const KIND_NAMES: Record<Kind, string> = {
  random: 'random',
  vedge: 'vertical edge',
  hedge: 'horizontal edge',
  blur: 'blur',
  sharpen: 'sharpen',
};

/**
 * Weight (i, j) of a k × k kernel. Random weights are whole numbers from −2
 * to 2 drawn from `seed`; `salt` separates kernels that share a seed.
 */
export function kernel(kind: Kind, k: number, i: number, j: number, seed: number, salt = 0) {
  const c = (k - 1) / 2;
  if (kind === 'random' || k === 1) {
    const w = (hash(i * 7 + j, salt, k, seed) % 5) - 2;
    // a 1 × 1 kernel of zero would hide everything, so it is never zero
    return k === 1 && w === 0 ? 1 : w;
  }
  if (kind === 'vedge') return Math.sign(j - c);
  if (kind === 'hedge') return Math.sign(i - c);
  if (kind === 'blur') return 1;
  // sharpen: the centre outweighs the ring around it, and the weights sum to one
  const m = Math.floor(c);
  return i === m && j === m ? k * k : -1;
}

/** Cell fill for an output value: teal above zero, pink below, stronger further out. */
export function tint(v: number, max: number) {
  if (!max || !v) return 'rgba(160,165,175,0.12)';
  const a = 0.12 + 0.55 * Math.min(1, Math.abs(v) / max);
  return v > 0 ? `rgba(94,234,212,${a.toFixed(3)})` : `rgba(244,114,182,${a.toFixed(3)})`;
}

type Box = { x: number; y: number; s: number };

/**
 * A shaded projection from one square to another: the hull around both,
 * with the squares themselves left clear, so it reads as the block of cells
 * on one side turning into the block on the other.
 */
export function beam(ctx: CanvasRenderingContext2D, a: Box, b: Box, colour: string) {
  const pts: [number, number][] = [];
  for (const q of [a, b])
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) pts.push([q.x + u * q.s, q.y + v * q.s]);
  // convex hull by the monotone chain
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: number[], p: number[], q: number[]) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const half = (list: [number, number][]) => {
    const h: [number, number][] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  const hull = [...half(pts), ...half([...pts].reverse())];
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  hull.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  for (const q of [a, b]) ctx.rect(q.x, q.y, q.s, q.s);
  ctx.fill('evenodd');
  ctx.restore();
}

/** How bright a pixel of value v is drawn, for values 0 to 9. */
export const shade = (v: number) => 0.04 + 0.66 * Math.min(1, Math.max(0, v) / 9);
