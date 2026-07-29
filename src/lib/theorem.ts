// Shared machinery for the three "sum of tiny pieces" theorems: Green, Stokes
// and Gauss. All three tell one story, so they share one visual language:
// an irregular region tiled with little elements, each element carrying its own
// spin or leak, and every interior edge walked twice in opposite directions.

export type V2 = { x: number; y: number };
export type V3 = { x: number; y: number; z: number };

export const v2 = (x: number, y: number): V2 => ({ x, y });
export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });

export const add = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const mul = (a: V3, s: number): V3 => v3(a.x * s, a.y * s, a.z * s);
export const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: V3, b: V3): V3 =>
  v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const len = (a: V3) => Math.hypot(a.x, a.y, a.z);
export const unit = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
export const mid3 = (a: V3, b: V3): V3 => mul(add(a, b), 0.5);

/** One shared palette, so the three pages read as a family. */
export const HUE = {
  with: '#34d399', // the field pushes you along this edge
  against: '#ff7a5c', // it holds you back
  out: '#ff7a5c', // flow leaving
  in: '#60a5fa', // flow entering
  pick: '#f59e0b', // the element you selected
};

// ---------------------------------------------------------------------------
// An irregular boundary. r(θ) = 1 + Σ aₖ cos(kθ + φₖ), kept safely positive so
// the region never folds through itself.
// ---------------------------------------------------------------------------
export function wobble(harmonics: [number, number, number][]) {
  return (t: number) => {
    let r = 1;
    for (const [k, a, ph] of harmonics) r += a * Math.cos(k * t + ph);
    return r;
  };
}

// ---------------------------------------------------------------------------
// Numerical calculus. Every quantity a page reports is measured from the field
// itself; the theorems are never assumed, only checked.
// ---------------------------------------------------------------------------
export function curl2(F: (p: V2) => V2, p: V2, h = 1e-3) {
  const dQdx = F(v2(p.x + h, p.y)).y - F(v2(p.x - h, p.y)).y;
  const dPdy = F(v2(p.x, p.y + h)).x - F(v2(p.x, p.y - h)).x;
  return (dQdx - dPdy) / (2 * h);
}

export function div2(F: (p: V2) => V2, p: V2, h = 1e-3) {
  const dPdx = F(v2(p.x + h, p.y)).x - F(v2(p.x - h, p.y)).x;
  const dQdy = F(v2(p.x, p.y + h)).y - F(v2(p.x, p.y - h)).y;
  return (dPdx + dQdy) / (2 * h);
}

export function curl3(F: (p: V3) => V3, p: V3, h = 1e-3): V3 {
  const dx = (f: (q: V3) => number) =>
    (f(v3(p.x + h, p.y, p.z)) - f(v3(p.x - h, p.y, p.z))) / (2 * h);
  const dy = (f: (q: V3) => number) =>
    (f(v3(p.x, p.y + h, p.z)) - f(v3(p.x, p.y - h, p.z))) / (2 * h);
  const dz = (f: (q: V3) => number) =>
    (f(v3(p.x, p.y, p.z + h)) - f(v3(p.x, p.y, p.z - h))) / (2 * h);
  return v3(
    dy((q) => F(q).z) - dz((q) => F(q).y),
    dz((q) => F(q).x) - dx((q) => F(q).z),
    dx((q) => F(q).y) - dy((q) => F(q).x)
  );
}

export function div3(F: (p: V3) => V3, p: V3, h = 1e-3) {
  return (
    (F(v3(p.x + h, p.y, p.z)).x - F(v3(p.x - h, p.y, p.z)).x +
      F(v3(p.x, p.y + h, p.z)).y - F(v3(p.x, p.y - h, p.z)).y +
      F(v3(p.x, p.y, p.z + h)).z - F(v3(p.x, p.y, p.z - h)).z) /
    (2 * h)
  );
}

/** ∫ F·dr along one straight step, midpoint rule with m samples. */
export function work2(F: (p: V2) => V2, a: V2, b: V2, m = 3) {
  const dx = (b.x - a.x) / m,
    dy = (b.y - a.y) / m;
  let s = 0;
  for (let i = 0; i < m; i++) {
    const f = F(v2(a.x + dx * (i + 0.5), a.y + dy * (i + 0.5)));
    s += f.x * dx + f.y * dy;
  }
  return s;
}

export function work3(F: (p: V3) => V3, a: V3, b: V3, m = 3) {
  const d = mul(sub(b, a), 1 / m);
  let s = 0;
  for (let i = 0; i < m; i++)
    s += dot(F(add(a, mul(d, i + 0.5))), d);
  return s;
}

/** ∮ F·dr round a closed polyline. */
export function circulation2(F: (p: V2) => V2, pts: V2[], m = 3) {
  let s = 0;
  for (let i = 0; i < pts.length; i++)
    s += work2(F, pts[i], pts[(i + 1) % pts.length], m);
  return s;
}

export function circulation3(F: (p: V3) => V3, pts: V3[], m = 3) {
  let s = 0;
  for (let i = 0; i < pts.length; i++)
    s += work3(F, pts[i], pts[(i + 1) % pts.length], m);
  return s;
}

/** Outward flux ∮ F·n ds through one step of an anticlockwise polyline. */
export function leak2(F: (p: V2) => V2, a: V2, b: V2, m = 3) {
  const dx = (b.x - a.x) / m,
    dy = (b.y - a.y) / m;
  let s = 0;
  for (let i = 0; i < m; i++) {
    const f = F(v2(a.x + dx * (i + 0.5), a.y + dy * (i + 0.5)));
    s += f.x * dy - f.y * dx; // n ds = (dy, −dx)
  }
  return s;
}

export function flux2(F: (p: V2) => V2, pts: V2[], m = 3) {
  let s = 0;
  for (let i = 0; i < pts.length; i++)
    s += leak2(F, pts[i], pts[(i + 1) % pts.length], m);
  return s;
}

/** Signed area of an anticlockwise polygon. */
export function area2(pts: V2[]) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export function centroid2(pts: V2[]): V2 {
  let x = 0,
    y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return v2(x / pts.length, y / pts.length);
}

export function centroid3(pts: V3[]): V3 {
  let s = v3(0, 0, 0);
  for (const p of pts) s = add(s, p);
  return mul(s, 1 / pts.length);
}

/** Vector area of a planar quad or triangle, so |A| is the area and Â the normal. */
export function vectorArea(pts: V3[]): V3 {
  let s = v3(0, 0, 0);
  const c = centroid3(pts);
  for (let i = 0; i < pts.length; i++) {
    const a = sub(pts[i], c),
      b = sub(pts[(i + 1) % pts.length], c);
    s = add(s, mul(cross(a, b), 0.5));
  }
  return s;
}

/** Flux of F through a planar patch, using its own vector area as orientation. */
export function fluxPatch(F: (p: V3) => V3, pts: V3[]) {
  const A = vectorArea(pts);
  return dot(F(centroid3(pts)), A);
}

/**
 * Chain the boundary pieces of a clipped grid into closed loops, so the rim can
 * be stroked as one curve and walked at an even pace. Neighbouring cells cut the
 * boundary at bit-identical points, so the endpoints match exactly.
 */
export function chainRim(edges: { a: V2; b: V2 }[]): V2[][] {
  const key = (p: V2) => `${p.x},${p.y}`;
  const byStart = new Map<string, { a: V2; b: V2 }[]>();
  for (const e of edges) {
    const k = key(e.a);
    const list = byStart.get(k);
    if (list) list.push(e);
    else byStart.set(k, [e]);
  }
  const used = new Set<{ a: V2; b: V2 }>();
  const loops: V2[][] = [];
  for (const start of edges) {
    if (used.has(start)) continue;
    const loop: V2[] = [];
    let cur: { a: V2; b: V2 } | undefined = start;
    while (cur && !used.has(cur)) {
      used.add(cur);
      loop.push(cur.a);
      cur = byStart.get(key(cur.b))?.find((n) => !used.has(n));
    }
    if (loop.length > 2) loops.push(loop);
  }
  return loops;
}

// ---------------------------------------------------------------------------
// Camera. z points up on screen, the eye looks along +y, and everything is
// projected with a mild perspective so depth reads without distorting the maths.
// ---------------------------------------------------------------------------
export interface Cam {
  yaw: number;
  pitch: number;
  dist: number;
  f: number;
  cx: number;
  cy: number;
}

export function rotate(cam: Cam, p: V3): V3 {
  const cy = Math.cos(cam.yaw),
    sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch),
    sp = Math.sin(cam.pitch);
  const x = p.x * cy - p.y * sy;
  const y0 = p.x * sy + p.y * cy;
  return v3(x, y0 * cp - p.z * sp, y0 * sp + p.z * cp);
}

export interface Proj {
  x: number;
  y: number;
  d: number;
}

export function project(cam: Cam, p: V3): Proj {
  const r = rotate(cam, p);
  const d = Math.max(0.35, cam.dist - r.y);
  const s = cam.f / d;
  return { x: cam.cx + r.x * s, y: cam.cy - r.z * s, d };
}

/** Drag to orbit, wheel to zoom. Returns a teardown function. */
export function orbit(
  canvas: HTMLCanvasElement,
  cam: Cam,
  redraw: () => void,
  opts: { enabled?: () => boolean; onTap?: (x: number, y: number) => void } = {}
) {
  let dragging = false;
  let moved = 0;
  let last = { x: 0, y: 0 };
  const local = (e: PointerEvent) => {
    const b = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - b.left) / b.width) * canvas.width * (canvas.clientWidth ? 1 : 1),
      y: ((e.clientY - b.top) / b.height) * canvas.height,
    };
  };
  const down = (e: PointerEvent) => {
    dragging = true;
    moved = 0;
    last = { x: e.clientX, y: e.clientY };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-released pointers are fine to ignore */
    }
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - last.x,
      dy = e.clientY - last.y;
    moved += Math.abs(dx) + Math.abs(dy);
    last = { x: e.clientX, y: e.clientY };
    if (opts.enabled && !opts.enabled()) return;
    cam.yaw += dx * 0.008;
    cam.pitch = Math.max(-1.35, Math.min(1.35, cam.pitch + dy * 0.008));
    redraw();
  };
  const up = (e: PointerEvent) => {
    if (dragging && moved < 6 && opts.onTap) {
      const b = canvas.getBoundingClientRect();
      opts.onTap(
        ((e.clientX - b.left) / b.width) * canvas.width,
        ((e.clientY - b.top) / b.height) * canvas.height
      );
    }
    dragging = false;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => (dragging = false));
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (opts.enabled && !opts.enabled()) return;
      e.preventDefault();
      cam.dist = Math.max(2.4, Math.min(14, cam.dist + e.deltaY * 0.006));
      redraw();
    },
    { passive: false }
  );
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
  };
}

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------
export function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  colour: string,
  lw = 2,
  head = 7
) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - head * 0.6 * Math.cos(a), y2 - head * 0.6 * Math.sin(a));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - 0.42), y2 - head * Math.sin(a - 0.42));
  ctx.lineTo(x2 - head * Math.cos(a + 0.42), y2 - head * Math.sin(a + 0.42));
  ctx.closePath();
  ctx.fill();
}

/** A short arrow centred on (x, y) pointing along (dx, dy). */
export function tick(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  length: number,
  colour: string,
  lw = 2
) {
  const l = Math.hypot(dx, dy) || 1;
  const ux = (dx / l) * length * 0.5,
    uy = (dy / l) * length * 0.5;
  arrow(ctx, x - ux, y - uy, x + ux, y + uy, colour, lw, Math.max(4, lw * 3));
}

/**
 * A circular arrow: the spin of one element, drawn anticlockwise on screen when
 * sign > 0 and clockwise when it is negative. Canvas angles run clockwise
 * because y points down, so the sweep direction and the arrowhead tangent are
 * both mirrored together, which is what the two cases have in common.
 */
export function spin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sign: number,
  colour: string,
  lw = 2
) {
  if (r < 2) return;
  const ccw = sign >= 0;
  const dir = ccw ? -1 : 1; // which way canvas angles must run
  const turn = Math.PI * 1.55;
  const a0 = ccw ? 0.45 : -0.45;
  const a1 = a0 + dir * turn;

  ctx.strokeStyle = colour;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1, ccw);
  ctx.stroke();

  // head sits on the end of the arc, pointing along the way it was drawn
  const tip = { x: x + r * Math.cos(a1), y: y + r * Math.sin(a1) };
  const t = a1 + (dir * Math.PI) / 2;
  const h = Math.max(5.5, lw * 3.2);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(tip.x + h * 0.6 * Math.cos(t), tip.y + h * 0.6 * Math.sin(t));
  ctx.lineTo(tip.x + h * Math.cos(t - 2.5), tip.y + h * Math.sin(t - 2.5));
  ctx.lineTo(tip.x + h * Math.cos(t + 2.5), tip.y + h * Math.sin(t + 2.5));
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// A square grid clipped to a region. Cells well inside are honest squares;
// cells straddling the boundary are cut by the curve itself. Two neighbours
// always agree on the cut, so their shared edge cancels exactly.
// ---------------------------------------------------------------------------
export interface GridCell {
  poly: V2[];
  edges: { a: V2; b: V2; rim: boolean }[];
  c: V2;
  area: number;
  /** true when the cell is an untouched square */
  full: boolean;
}

export function gridCells(
  phi: (p: V2) => number,
  n: number,
  half: number
): GridCell[] {
  const h = (2 * half) / n;
  const out: GridCell[] = [];

  // Both neighbours must land on bit-identical crossing points, so the two
  // endpoints are put in a fixed order before the search starts.
  const crossing = (a: V2, b: V2): V2 => {
    const flip = a.x > b.x || (a.x === b.x && a.y > b.y);
    const p = flip ? b : a,
      q = flip ? a : b;
    const at = (t: number) => v2(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t);
    const negAtStart = phi(p) < 0;
    let lo = 0,
      hi = 1;
    for (let i = 0; i < 28; i++) {
      const m = (lo + hi) / 2;
      if (phi(at(m)) < 0 === negAtStart) lo = m;
      else hi = m;
    }
    return at((lo + hi) / 2);
  };

  // Corners are built from their indices alone. Writing the far side as
  // x0 + h instead would give a number one ulp away from the neighbour's own
  // x0, and the two cells would no longer share an edge exactly.
  const at = (i: number) => -half + i * h;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const corners = [
        v2(at(i), at(j)),
        v2(at(i + 1), at(j)),
        v2(at(i + 1), at(j + 1)),
        v2(at(i), at(j + 1)),
      ];
      const ph = corners.map(phi);
      const inCount = ph.filter((v) => v < 0).length;
      if (inCount === 0) continue;

      let poly: V2[] = [];
      let cut: boolean[] = [];
      if (inCount === 4) {
        poly = corners;
        cut = [false, false, false, false];
      } else {
        for (let k = 0; k < 4; k++) {
          const k2 = (k + 1) % 4;
          if (ph[k] < 0) {
            poly.push(corners[k]);
            cut.push(false);
          }
          if (ph[k] < 0 !== ph[k2] < 0) {
            poly.push(crossing(corners[k], corners[k2]));
            cut.push(true);
          }
        }
      }
      if (poly.length < 3) continue;

      const edges = poly.map((p, k) => {
        const k2 = (k + 1) % poly.length;
        // an edge running from one cut to the next crosses the cell, so it is
        // a piece of the region's own boundary
        return { a: p, b: poly[k2], rim: cut[k] && cut[k2] };
      });
      const area = area2(poly);
      if (area < 1e-7) continue;
      out.push({
        poly,
        edges,
        c: centroid2(poly),
        area,
        full: inCount === 4,
      });
    }
  return out;
}

export function polyPath(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[]
) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Is a point inside a polygon? Used for click hit-testing. */
export function inside(pts: { x: number; y: number }[], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i],
      b = pts[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      hit = !hit;
  }
  return hit;
}

/** Smoothstep, for the cancelling animation. */
export const ease = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/** Colour for a signed quantity: teal one way, warm orange the other. */
export function signColour(v: number, alpha: number) {
  return v >= 0
    ? `rgba(52,211,153,${alpha})`
    : `rgba(255,122,92,${alpha})`;
}
