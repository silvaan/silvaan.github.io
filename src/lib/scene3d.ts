// A small 3D toolkit for canvas sims: an orbiting perspective camera, the
// pointer wiring for orbit / zoom / picking, a wireframe box, an axis gizmo,
// arrows that read as 3D, and a plane shaded in true perspective from a field
// sampled on a grid. Pages bring their own physics; this only draws.

export type Vec = { x: number; y: number; z: number };
export type RGB = [number, number, number];
export type PlaneAxis = 'xy' | 'xz' | 'yz';

export const V = {
  add: (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  mul: (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  dot: (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (a: Vec, b: Vec): Vec => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  norm: (a: Vec) => Math.hypot(a.x, a.y, a.z),
  unit: (a: Vec): Vec => {
    const m = Math.hypot(a.x, a.y, a.z) || 1;
    return { x: a.x / m, y: a.y / m, z: a.z / m };
  },
  mix: (a: Vec, b: Vec, f: number): Vec => ({
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    z: a.z + (b.z - a.z) * f,
  }),
  zero: (): Vec => ({ x: 0, y: 0, z: 0 }),
};

export type Projected = { sx: number; sy: number; s: number; zc: number };

/**
 * A camera orbiting the origin at distance `dist`. Yaw turns about the world
 * y axis, pitch tilts; screen y is world y when pitch is zero.
 */
export class Camera3D {
  yaw: number;
  pitch: number;
  zoom: number;
  readonly dist: number;
  readonly focal = 2.8;
  readonly scale = 300;
  readonly cx: number;
  readonly cy: number;

  constructor(W: number, H: number, o: { dist: number; yaw?: number; pitch?: number; zoom?: number }) {
    this.cx = W / 2;
    this.cy = H / 2;
    this.dist = o.dist;
    this.yaw = o.yaw ?? 0.72;
    this.pitch = o.pitch ?? -0.42;
    this.zoom = o.zoom ?? 0.9;
  }

  toCam(p: Vec) {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const x1 = p.x * cy + p.z * sy;
    const z1 = -p.x * sy + p.z * cy;
    const y2 = p.y * cp - z1 * sp;
    const z2 = p.y * sp + z1 * cp;
    return { x: x1, y: y2, z: z2, zc: z2 + this.dist };
  }

  toWorld(p: Vec): Vec {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const y = p.y * cp + p.z * sp;
    const z1 = -p.y * sp + p.z * cp;
    return { x: p.x * cy - z1 * sy, y, z: p.x * sy + z1 * cy };
  }

  forward() { return this.toWorld({ x: 0, y: 0, z: 1 }); }
  right() { return this.toWorld({ x: 1, y: 0, z: 0 }); }
  up() { return this.toWorld({ x: 0, y: 1, z: 0 }); }
  eye() { return this.toWorld({ x: 0, y: 0, z: -this.dist }); }

  /** Pixels per world unit at unit camera depth. */
  get k() { return this.focal * this.scale * this.zoom; }

  project(p: Vec): Projected {
    const c = this.toCam(p);
    const s = this.focal / Math.max(0.05, c.zc);
    const k = s * this.scale * this.zoom;
    return { sx: this.cx + c.x * k, sy: this.cy - c.y * k, s: s * this.zoom, zc: c.zc };
  }

  ray(sx: number, sy: number) {
    const k = this.k;
    const d = V.unit({ x: (sx - this.cx) / k, y: -(sy - this.cy) / k, z: 1 });
    return { o: this.eye(), d: this.toWorld(d) };
  }

  /** Where the pointer ray meets the plane through `q` with normal `n`. */
  hitPlane(sx: number, sy: number, q: Vec, n: Vec): Vec | null {
    const r = this.ray(sx, sy);
    const den = V.dot(r.d, n);
    if (Math.abs(den) < 1e-4) return null;
    const t = V.dot(V.sub(q, r.o), n) / den;
    if (t < 0) return null;
    return V.add(r.o, V.mul(r.d, t));
  }

  /** Depth cue for a scene of half-size `half`: near things full, far side dimmer. */
  fog(zc: number, half: number) {
    return 0.4 + 0.6 * Math.max(0, Math.min(1, (this.dist + half * 1.3 - zc) / (half * 2.6)));
  }
}

/**
 * Pointer wiring: drag empty space (or right / shift / alt drag) to orbit,
 * scroll to zoom. `grab` is offered every left press first, in canvas logical
 * coordinates; return true to take the drag, and `drag` then gets the moves.
 */
export function orbitControls(
  canvas: HTMLCanvasElement,
  cam: Camera3D,
  W: number,
  H: number,
  h: {
    changed: () => void;
    grab?: (x: number, y: number) => boolean;
    drag?: (x: number, y: number) => void;
    release?: () => void;
    click?: (x: number, y: number) => void;
  }
) {
  let mode: 'none' | 'orbit' | 'drag' = 'none';
  let lastX = 0, lastY = 0, downX = 0, downY = 0;
  const local = (e: PointerEvent | MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    lastX = downX = e.clientX;
    lastY = downY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    const p = local(e);
    if (e.button === 0 && !e.altKey && !e.shiftKey && h.grab?.(p.x, p.y)) mode = 'drag';
    else mode = 'orbit';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (mode === 'orbit') {
      cam.yaw += (e.clientX - lastX) * 0.01;
      cam.pitch = Math.max(-1.45, Math.min(1.45, cam.pitch + (e.clientY - lastY) * 0.01));
      lastX = e.clientX;
      lastY = e.clientY;
      h.changed();
    } else if (mode === 'drag') {
      const p = local(e);
      h.drag?.(p.x, p.y);
    }
  });
  const up = (e: PointerEvent) => {
    if (mode === 'drag') h.release?.();
    else if (mode === 'orbit' && Math.hypot(e.clientX - downX, e.clientY - downY) < 4 && h.click) {
      const p = local(e);
      h.click(p.x, p.y);
    }
    mode = 'none';
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => { mode = 'none'; });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      cam.zoom = Math.max(0.35, Math.min(5.5, cam.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      h.changed();
    },
    { passive: false }
  );
}

export function line3(ctx: CanvasRenderingContext2D, cam: Camera3D, a: Vec, b: Vec, color: string, width = 1.2) {
  const pa = cam.project(a), pb = cam.project(b);
  if (pa.zc <= 0.1 || pb.zc <= 0.1) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pa.sx, pa.sy);
  ctx.lineTo(pb.sx, pb.sy);
  ctx.stroke();
}

/** The wireframe box of half-size `half`, its far edges dimmer. */
export function drawBox(ctx: CanvasRenderingContext2D, cam: Camera3D, half: number, ink: string, light: boolean) {
  const s = half;
  const c = [
    { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s }, { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
    { x: -s, y: -s, z: s }, { x: s, y: -s, z: s }, { x: s, y: s, z: s }, { x: -s, y: s, z: s },
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (const [i, j] of edges) {
    const z = (cam.toCam(c[i]).zc + cam.toCam(c[j]).zc) / 2;
    line3(ctx, cam, c[i], c[j], `rgba(${ink},${(light ? 0.26 : 0.2) * cam.fog(z, half)})`, 1);
  }
}

/** A soft glow behind the scene. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, W: number, H: number, light: boolean) {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, light ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.12)');
  g.addColorStop(1, light ? 'rgba(99,102,241,0)' : 'rgba(13,14,18,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawGizmo(ctx: CanvasRenderingContext2D, cam: Camera3D, H: number) {
  const ox = 50, oy = H - 50, len = 28;
  const axes = [
    { v: { x: 1, y: 0, z: 0 }, c: '#f87171', l: 'x' },
    { v: { x: 0, y: 1, z: 0 }, c: '#4ade80', l: 'y' },
    { v: { x: 0, y: 0, z: 1 }, c: '#60a5fa', l: 'z' },
  ];
  const pr = axes
    .map((a) => {
      const c = cam.toCam(a.v);
      return { ex: ox + c.x * len, ey: oy - c.y * len, depth: c.z, c: a.c, l: a.l };
    })
    .sort((a, b) => b.depth - a.depth);
  ctx.lineWidth = 2;
  ctx.font = "600 11px 'JetBrains Mono', monospace";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const a of pr) {
    ctx.strokeStyle = a.c;
    ctx.fillStyle = a.c;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(a.ex, a.ey);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(a.ex, a.ey, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(a.l, a.ex + 4, a.ey - 4);
  }
}

/**
 * A 3D arrow centred on `p`. Its length grows smoothly with the field and
 * shrinks smoothly to nothing at a node, so an arrow passing through zero
 * fades out and back instead of flipping in a blink. The head is a flat cone
 * turned to face the camera, so an arrow pointing at you foreshortens.
 */
export function drawArrow3D(
  ctx: CanvasRenderingContext2D,
  cam: Camera3D,
  p: Vec,
  f: Vec,
  mag: number,
  rgb: RGB,
  o: { spacing: number; gain: number; half: number; light: boolean }
) {
  const strength = 1 - Math.exp(-mag * o.gain);
  if (strength < 0.015) return;
  const u = V.mul(f, 1 / mag);
  const len = o.spacing * 0.88 * strength;
  const tail = V.sub(p, V.mul(u, len / 2));
  const tip = V.add(p, V.mul(u, len / 2));
  const h = Math.min(len * 0.4, o.spacing * 0.24);
  let w = V.cross(u, cam.forward());
  if (V.norm(w) < 1e-3) w = cam.right();
  w = V.mul(V.unit(w), h * 0.32);
  const base = V.sub(tip, V.mul(u, h));

  const a = cam.project(tail), b = cam.project(tip), m = cam.project(base);
  const l = cam.project(V.add(base, w)), r = cam.project(V.sub(base, w));
  if (a.zc < 0.3 || b.zc < 0.3) return;

  const depth = cam.fog((a.zc + b.zc) / 2, o.half);
  const fade = strength < 0.12 ? strength / 0.12 : 1;
  const alpha = (0.3 + 0.7 * strength) * depth * fade;
  const lift = o.light ? 0 : 0.3 * strength;
  const col = `rgba(${Math.round(rgb[0] + (255 - rgb[0]) * lift)},${Math.round(rgb[1] + (255 - rgb[1]) * lift)},${Math.round(rgb[2] + (255 - rgb[2]) * lift)},${alpha})`;

  const px = Math.max(0.6, Math.min(2, a.s / 0.25));
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineWidth = (1 + 1.8 * strength) * px;
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(m.sx, m.sy);
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(b.sx, b.sy);
  ctx.lineTo(l.sx, l.sy);
  ctx.lineTo(r.sx, r.sy);
  ctx.closePath();
  ctx.fill();
}

/** A point on an axis-aligned plane: (u, v) in the plane, `offset` along its normal. */
export function planePoint(plane: PlaneAxis, offset: number, u: number, v: number): Vec {
  if (plane === 'xy') return { x: u, y: v, z: offset };
  if (plane === 'xz') return { x: u, y: offset, z: v };
  return { x: offset, y: u, z: v };
}

export function planeNormal(plane: PlaneAxis): Vec {
  return plane === 'xy' ? { x: 0, y: 0, z: 1 } : plane === 'xz' ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
}

const PACK = new Uint8ClampedArray(4);
const PACK32 = new Uint32Array(PACK.buffer);
/** Four bytes as one pixel of an ImageData's Uint32 view, on any endianness. */
export function rgba32(r: number, g: number, b: number, a: number) {
  PACK[0] = r; PACK[1] = g; PACK[2] = b; PACK[3] = a;
  return PACK32[0];
}

/** A 256-entry colour ramp from stops [t, r, g, b, alpha 0..1]. */
export function ramp32(stops: number[][]) {
  const out = new Uint32Array(256);
  for (let k = 0; k < 256; k++) {
    const t = k / 255;
    let i = 1;
    while (i < stops.length - 1 && t > stops[i][0]) i++;
    const a = stops[i - 1], b = stops[i];
    const u = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
    out[k] = rgba32(
      a[1] + (b[1] - a[1]) * u,
      a[2] + (b[2] - a[2]) * u,
      a[3] + (b[3] - a[3]) * u,
      255 * (a[4] + (b[4] - a[4]) * u)
    );
  }
  return out;
}

/** The violet ramp of the field shading, for the dark or the light stage. */
export function fieldRamp(light: boolean) {
  return ramp32(
    light
      ? [[0, 199, 210, 254, 0], [0.3, 165, 180, 252, 0.35], [0.65, 99, 102, 241, 0.5], [1, 49, 46, 129, 0.68]]
      : [[0, 49, 46, 129, 0], [0.3, 79, 70, 229, 0.32], [0.65, 139, 92, 246, 0.5], [1, 233, 213, 255, 0.72]]
  );
}

/**
 * A plane shaded in true perspective. The page fills one or two channels on a
 * grid × grid lattice over [-half, half]² (`a`, and `b` if it asked for two),
 * then `render` casts every screen pixel's ray onto the plane, interpolates
 * the channels there and asks `colour(a, b)` for the pixel.
 */
export class PlaneShade {
  readonly grid: number;
  readonly half: number;
  readonly a: Float32Array;
  readonly b: Float32Array;
  private tmp: Float32Array;
  private step: number;
  private w: number;
  private h: number;
  private scr: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  private img: ImageData;
  private pix: Uint32Array;

  constructor(W: number, H: number, o: { half: number; grid?: number; step?: number }) {
    this.grid = o.grid ?? 112;
    this.half = o.half;
    this.step = o.step ?? 1.5;
    const n = this.grid * this.grid;
    this.a = new Float32Array(n);
    this.b = new Float32Array(n);
    this.tmp = new Float32Array(n);
    this.w = Math.ceil(W / this.step);
    this.h = Math.ceil(H / this.step);
    this.scr = document.createElement('canvas');
    this.scr.width = this.w;
    this.scr.height = this.h;
    this.sctx = this.scr.getContext('2d')!;
    this.img = this.sctx.createImageData(this.w, this.h);
    this.pix = new Uint32Array(this.img.data.buffer);
  }

  /** World coordinate of grid index i (cell centres). */
  coord(i: number) {
    return -this.half + ((i + 0.5) / this.grid) * 2 * this.half;
  }

  /** Call `f(x, y, z, index)` at every grid point of the plane. */
  sample(plane: PlaneAxis, offset: number, f: (x: number, y: number, z: number, i: number) => void) {
    const G = this.grid;
    for (let j = 0; j < G; j++) {
      const v = this.coord(j);
      for (let i = 0; i < G; i++) {
        const u = this.coord(i);
        if (plane === 'xy') f(u, v, offset, j * G + i);
        else if (plane === 'xz') f(u, offset, v, j * G + i);
        else f(offset, u, v, j * G + i);
      }
    }
  }

  /** A light [1 2 1] blur each way on a channel, so a feature thinner than a cell reads smooth. */
  blur(ch: Float32Array = this.a) {
    const G = this.grid, t = this.tmp;
    for (const [di, dj] of [[1, 0], [0, 1]]) {
      t.set(ch);
      for (let j = 0; j < G; j++)
        for (let i = 0; i < G; i++) {
          const i0 = Math.max(0, i - di), i1 = Math.min(G - 1, i + di);
          const j0 = Math.max(0, j - dj), j1 = Math.min(G - 1, j + dj);
          ch[j * G + i] = 0.25 * t[j0 * G + i0] + 0.5 * t[j * G + i] + 0.25 * t[j1 * G + i1];
        }
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    cam: Camera3D,
    plane: PlaneAxis,
    offset: number,
    colour: (a: number, b: number) => number
  ) {
    const G = this.grid, H2 = this.half, S = this.step;
    const k = cam.k;
    const pick = (q: Vec): [number, number, number] =>
      plane === 'xy' ? [q.x, q.y, q.z] : plane === 'xz' ? [q.x, q.z, q.y] : [q.y, q.z, q.x];
    const [ou, ov, on] = pick(cam.eye()), [fu, fv, fn] = pick(cam.forward());
    const [ru, rv, rn] = pick(cam.right()), [uu, uv, un] = pick(cam.up());

    // only the rectangle the plane covers on screen needs work
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [a, b] of [[-H2, -H2], [H2, -H2], [-H2, H2], [H2, H2]]) {
      const pr = cam.project(planePoint(plane, offset, a, b));
      if (pr.zc < 0.3) { x0 = 0; y0 = 0; x1 = this.w * S; y1 = this.h * S; break; }
      x0 = Math.min(x0, pr.sx); x1 = Math.max(x1, pr.sx);
      y0 = Math.min(y0, pr.sy); y1 = Math.max(y1, pr.sy);
    }
    const px0 = Math.max(0, Math.floor(x0 / S)), px1 = Math.min(this.w, Math.ceil(x1 / S) + 1);
    const py0 = Math.max(0, Math.floor(y0 / S)), py1 = Math.min(this.h, Math.ceil(y1 / S) + 1);
    if (px1 <= px0 || py1 <= py0) return;

    const A = this.a, B = this.b, pix = this.pix;
    const gs = G / (2 * H2);
    pix.fill(0);
    for (let py = py0; py < py1; py++) {
      const bb = -((py + 0.5) * S - cam.cy) / k;
      const row = py * this.w;
      for (let px = px0; px < px1; px++) {
        const aa = ((px + 0.5) * S - cam.cx) / k;
        const dn = fn + rn * aa + un * bb;
        if (dn > -1e-6 && dn < 1e-6) continue;
        const t = (offset - on) / dn;
        if (t <= 0) continue;
        const gu = (ou + (fu + ru * aa + uu * bb) * t + H2) * gs - 0.5;
        const gv = (ov + (fv + rv * aa + uv * bb) * t + H2) * gs - 0.5;
        if (gu < -0.5 || gv < -0.5 || gu > G - 0.5 || gv > G - 0.5) continue;
        let i0 = gu | 0, j0 = gv | 0;
        if (i0 > G - 2) i0 = G - 2;
        if (j0 > G - 2) j0 = G - 2;
        if (gu < 0) i0 = 0;
        if (gv < 0) j0 = 0;
        let fu2 = gu - i0, fv2 = gv - j0;
        fu2 = fu2 < 0 ? 0 : fu2 > 1 ? 1 : fu2;
        fv2 = fv2 < 0 ? 0 : fv2 > 1 ? 1 : fv2;
        const r0 = j0 * G + i0;
        const va =
          (A[r0] + (A[r0 + 1] - A[r0]) * fu2) * (1 - fv2) +
          (A[r0 + G] + (A[r0 + G + 1] - A[r0 + G]) * fu2) * fv2;
        const vb =
          (B[r0] + (B[r0 + 1] - B[r0]) * fu2) * (1 - fv2) +
          (B[r0 + G] + (B[r0 + G + 1] - B[r0 + G]) * fu2) * fv2;
        pix[row + px] = colour(va, vb);
      }
    }
    this.sctx.putImageData(this.img, 0, 0, px0, py0, px1 - px0, py1 - py0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.scr, px0, py0, px1 - px0, py1 - py0, px0 * S, py0 * S, (px1 - px0) * S, (py1 - py0) * S);
    ctx.restore();
  }
}
