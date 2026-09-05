// The drawing and interaction code shared by the vector experiments: a small
// perspective camera, arrows and polygons projected through it, orbit / pan /
// zoom / drag-a-tip pointer handling, and the panel controls both pages use.

import { setupCanvas, makeText } from './sim';
import { type Vector3 as Vec, len, mul, AXIS } from './vector-geometry';

export const COLOR = {
  a: '#f59e0b',
  b: '#a78bfa',
  result: '#34d399',
  negative: '#f9736a',
  axis: ['#f472b6', '#22d3ee', '#94a3b8'], // anything that belongs to x, y, z
};

/** "#rrggbb" to "r,g,b", so the same colour can be used at any opacity. */
export function hexRGB(hex: string) {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
}
export const rgba = (hex: string, alpha: number) => `rgba(${hexRGB(hex)},${alpha})`;

/** Vector components are set in tenths, and every view goes out to this far. */
export const LIMIT = 3;

export type Camera = { yaw: number; pitch: number; zoom: number; pan: { x: number; y: number } };
/** Looking straight down z: x right, y up, nothing foreshortened. */
export const FLAT_VIEW = { yaw: 0, pitch: -Math.PI / 2 };

export function createScene(
  canvas: HTMLCanvasElement,
  cam: Camera,
  opts: { origin: () => { x: number; y: number }; scale: () => number; redraw: () => void }
) {
  const { ctx, W, H } = setupCanvas(canvas, opts.redraw);
  const cssVar = (n: string) => getComputedStyle(canvas).getPropertyValue(n).trim();
  const inkA = (al: number) => `rgba(${cssVar('--stage-ink') || '232,233,236'},${al})`;
  const bg = () => cssVar('--stage-bg') || '#0d0e12';
  const { label } = makeText(ctx, inkA);

  const CAM = 15, FOCAL = 11.5;

  function project(p: Vec) {
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const xr = p.x * cy + p.y * sy;
    const yr = -p.x * sy + p.y * cy;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const depth = p.z * sp + yr * cp + CAM;
    const k = (FOCAL * cam.zoom * opts.scale()) / Math.max(0.4, depth);
    const o = opts.origin();
    return { x: o.x + cam.pan.x + xr * k, y: o.y + cam.pan.y + (-p.z * cp + yr * sp) * k, d: depth };
  }
  /** Only meaningful in the flat view, where projection is a plain scaling. */
  function unproject(sx: number, sy: number): Vec {
    const K = ((FOCAL * cam.zoom) / CAM) * opts.scale();
    const o = opts.origin();
    return { x: (sx - o.x - cam.pan.x) / K, y: (o.y + cam.pan.y - sy) / K, z: 0 };
  }

  function line(p: Vec, q: Vec, col: string, lw = 1, dash: number[] = []) {
    const u = project(p), v = project(q);
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(v.x, v.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  /** Shaft stops short of a solid head, outlined in the background colour. */
  function arrow(p: Vec, q: Vec, col: string, lw = 3.2, head = 16) {
    const u = project(p), v = project(q);
    const an = Math.atan2(v.y - u.y, v.x - u.x);
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(v.x - head * 0.82 * Math.cos(an), v.y - head * 0.82 * Math.sin(an));
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.lineTo(v.x - head * Math.cos(an - 0.34), v.y - head * Math.sin(an - 0.34));
    ctx.lineTo(v.x - head * Math.cos(an + 0.34), v.y - head * Math.sin(an + 0.34));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = bg();
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  function poly(pts: Vec[], fill: string, stroke?: string, lw = 1.2) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const q = project(p);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }
  /** Unit grid on the xy plane, and the z axis when the view is spatial. */
  function grid(threeD: boolean, axisColours?: string[]) {
    const R = LIMIT;
    for (let i = -R; i <= R; i++) {
      line({ x: i, y: -R, z: 0 }, { x: i, y: R, z: 0 }, inkA(i === 0 ? 0.14 : 0.055));
      line({ x: -R, y: i, z: 0 }, { x: R, y: i, z: 0 }, inkA(i === 0 ? 0.14 : 0.055));
    }
    if (threeD) line({ x: 0, y: 0, z: -R }, { x: 0, y: 0, z: R }, inkA(0.14));
    for (let i = 0; i < (threeD ? 3 : 2); i++) {
      const e = mul({ x: i === 0 ? 1 : 0, y: i === 1 ? 1 : 0, z: i === 2 ? 1 : 0 }, R + 0.25);
      const t = project(e);
      label(AXIS[i], t.x, t.y + 4, 0.4, 'center', 11, axisColours?.[i]);
    }
  }
  /** Text placed at a world position, offset in screen pixels. */
  function tag(text: string, at: Vec, dx: number, dy: number, col: string, size = 14, align: CanvasTextAlign = 'left') {
    const p = project(at);
    label(text, p.x + dx, p.y + dy, 0.95, align, size, col);
  }

  const mouse = (e: PointerEvent | WheelEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  /**
   * Orbit in a spatial view, drag arrowheads in a flat one; drag empty space
   * (or shift-drag) to pan, scroll to zoom about the pointer.
   */
  function pointer(o: { flat: () => boolean; hit?: (m: { x: number; y: number }) => string | null; drag?: (id: string, world: Vec) => void }) {
    let action: 'orbit' | 'pan' | 'drag' | null = null;
    let target = '';
    let lx = 0, ly = 0;
    const idleCursor = (m?: { x: number; y: number }) =>
      (canvas.style.cursor = !o.flat() ? 'grab' : m && o.hit?.(m) ? 'grab' : 'default');

    canvas.addEventListener('pointerdown', (e) => {
      const m = mouse(e);
      const hit = o.flat() ? o.hit?.(m) ?? null : null;
      if (hit) { action = 'drag'; target = hit; }
      else if (o.flat() || e.shiftKey || e.button === 1) action = 'pan';
      else action = 'orbit';
      lx = e.clientX; ly = e.clientY;
      canvas.style.cursor = 'grabbing';
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const m = mouse(e);
      const r = canvas.getBoundingClientRect();
      const dx = ((e.clientX - lx) * W) / r.width, dy = ((e.clientY - ly) * H) / r.height;
      lx = e.clientX; ly = e.clientY;
      if (action === 'orbit') {
        cam.yaw += (dx / W) * 10;
        cam.pitch = Math.max(-1.3, Math.min(1.3, cam.pitch + (dy / H) * 5));
      } else if (action === 'pan') {
        cam.pan.x = Math.max(-W * 0.9, Math.min(W * 0.9, cam.pan.x + dx));
        cam.pan.y = Math.max(-H * 0.9, Math.min(H * 0.9, cam.pan.y + dy));
      } else if (action === 'drag') {
        const w = unproject(m.x, m.y);
        const snap = (t: number) => Math.max(-LIMIT, Math.min(LIMIT, Math.round(t * 10) / 10));
        o.drag?.(target, { x: snap(w.x), y: snap(w.y), z: 0 });
      } else idleCursor(m);
    });
    const stop = () => { action = null; idleCursor(); };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const m = mouse(e);
      const under = o.flat() ? unproject(m.x, m.y) : null;
      cam.zoom = Math.max(0.4, Math.min(4, cam.zoom * Math.exp(-e.deltaY * 0.0016)));
      if (under) { // keep whatever was under the pointer where it was
        const now = project(under);
        cam.pan.x += m.x - now.x;
        cam.pan.y += m.y - now.y;
      }
    }, { passive: false });
    idleCursor();
    return { refreshCursor: () => idleCursor() };
  }

  return { ctx, W, H, inkA, bg, label, project, unproject, line, arrow, poly, grid, tag, pointer, near: (m: { x: number; y: number }, p: Vec, r = 20) => { const q = project(p); return Math.hypot(m.x - q.x, m.y - q.y) < r; } };
}

// --- panel controls ---------------------------------------------------------

export { el, segmented } from './panel';
import { el } from './panel';

type Which = 'a' | 'b';
type Axis = 'x' | 'y' | 'z';
const SLIDERS: [string, Which, Axis][] = [
  ['ax', 'a', 'x'], ['ay', 'a', 'y'], ['az', 'a', 'z'],
  ['bx', 'b', 'x'], ['by', 'b', 'y'], ['bz', 'b', 'z'],
];

/** The six component sliders, in tenths. Returns a sync from state to inputs. */
export function vectorSliders(state: { a: Vec; b: Vec }, onInput: (which: Which, axis: Axis) => void) {
  for (const [id, v, c] of SLIDERS) {
    const inp = el(id) as HTMLInputElement;
    inp.min = String(-LIMIT * 10);
    inp.max = String(LIMIT * 10);
    inp.addEventListener('input', () => {
      state[v][c] = +inp.value / 10;
      el(id + 'val').textContent = state[v][c].toFixed(1);
      onInput(v, c);
    });
  }
  const sync = () => {
    for (const [id, v, c] of SLIDERS) {
      (el(id) as HTMLInputElement).value = String(Math.round(state[v][c] * 10));
      el(id + 'val').textContent = state[v][c].toFixed(1);
    }
  };
  sync();
  return sync;
}

/** Degrees with one decimal, but exactly "90" when it is exactly ninety. */
export const degrees = (deg: number | null) =>
  deg === null ? 'undefined' : `${Math.abs(deg - 90) < 1e-9 ? '90' : deg.toFixed(1)}°`;

export const lenLabel = (v: Vec) => len(v).toFixed(2);
