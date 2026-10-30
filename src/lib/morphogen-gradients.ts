// A morphogen made at one end of an embryo, spreading and decaying:
// ∂C/∂t = D ∂²C/∂x² − kC. The source pins C = C0 at its node, the far end
// lets nothing out, so the steady state is C0 cosh((L − x)/λ) / cosh(L/λ),
// which is C0 e^{−x/λ} away from the far end, with λ = √(D/k).
// Lengths in µm, times in seconds.

export const L = 500;
export const NX = 200;
export const DX = L / NX;

export const lambda = (D: number, k: number) => Math.sqrt(D / k);

export class Gradient {
  /** Concentration at the nodes x = i·DX, i = 0..NX. */
  c = new Float64Array(NX + 1);
  private t2 = new Float64Array(NX + 1);
  D = 7;
  k = 7e-4;
  C0 = 1;
  /** Node of a grafted second source, or -1. */
  graft = -1;
  time = 0;
  /** Mass each source has put in since the last take(), in C·µm. */
  injA = 0;
  injG = 0;

  reset() {
    this.c.fill(0);
    this.time = 0;
    this.injA = this.injG = 0;
    this.pin();
  }

  /** Control volume of a node: half a cell at the two ends. */
  static w(i: number) {
    return i === 0 || i === NX ? DX / 2 : DX;
  }

  private pin() {
    this.injA += (this.C0 - this.c[0]) * Gradient.w(0);
    this.c[0] = this.C0;
    const g = this.graft;
    if (g >= 0) {
      this.injG += (this.C0 - this.c[g]) * Gradient.w(g);
      this.c[g] = this.C0;
    }
  }

  /** Explicit Euler, in substeps well inside the stability limit DX²/2D. */
  step(dt: number) {
    const n = Math.max(1, Math.ceil(dt / ((0.4 * DX * DX) / this.D)));
    const h = dt / n, a = (this.D * h) / (DX * DX), kh = this.k * h;
    for (let s = 0; s < n; s++) {
      const c = this.c, o = this.t2;
      o[0] = c[0] + a * 2 * (c[1] - c[0]) - kh * c[0];
      for (let i = 1; i < NX; i++) o[i] = c[i] + a * (c[i - 1] - 2 * c[i] + c[i + 1]) - kh * c[i];
      o[NX] = c[NX] + a * 2 * (c[NX - 1] - c[NX]) - kh * c[NX];
      this.t2 = c;
      this.c = o;
      this.pin();
    }
    this.time += dt;
  }

  take() {
    const r = { a: this.injA, g: this.injG };
    this.injA = this.injG = 0;
    return r;
  }

  /** The steady state of the same discrete equations (a tridiagonal solve). */
  steady(C0 = this.C0, D = this.D, k = this.k, graft = this.graft) {
    const m = NX + 1, e = D / (DX * DX);
    const a = new Float64Array(m), b = new Float64Array(m), cc = new Float64Array(m), d = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      if (i === 0 || i === graft) { b[i] = 1; d[i] = C0; continue; }
      b[i] = 2 * e + k;
      if (i === NX) a[i] = -2 * e;
      else { a[i] = -e; cc[i] = -e; }
    }
    for (let i = 1; i < m; i++) {
      const f = a[i] / b[i - 1];
      b[i] -= f * cc[i - 1];
      d[i] -= f * d[i - 1];
    }
    const x = new Float64Array(m);
    x[m - 1] = d[m - 1] / b[m - 1];
    for (let i = m - 2; i >= 0; i--) x[i] = (d[i] - cc[i] * x[i + 1]) / b[i];
    return x;
  }
}

/** Where a profile crosses a threshold, in µm, interpolating between nodes. */
export function crossings(c: ArrayLike<number>, T: number) {
  const out: number[] = [];
  for (let i = 0; i < NX; i++) {
    const p = c[i] - T, q = c[i + 1] - T;
    if (p === 0 && i > 0) out.push(i * DX);
    else if (p * q < 0) out.push((i + p / (p - q)) * DX);
  }
  return out;
}

/** Linear interpolation of a profile at x µm. */
export function at(c: ArrayLike<number>, x: number) {
  const u = Math.min(NX, Math.max(0, x / DX)), i = Math.min(NX - 1, Math.floor(u)), f = u - i;
  return c[i] * (1 - f) + c[i + 1] * f;
}

const gauss = () => {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};

/**
 * The same molecules one by one: put in where the field says the sources
 * added mass, random walk with the same D, each removed with rate k. `per` is
 * molecules per unit of C·µm, so their density follows the field.
 * `v` is a height across the embryo in -1..1, only for the picture.
 */
export class Molecules {
  x: Float64Array;
  v: Float64Array;
  /** Born this frame, so it walks only part of it. */
  private nb: Uint8Array;
  n = 0;
  private debt = { a: 0, g: 0 };
  per: number;
  max: number;
  constructor(per: number, max: number) {
    this.per = per;
    this.max = max;
    this.x = new Float64Array(max);
    this.v = new Float64Array(max);
    this.nb = new Uint8Array(max);
  }

  clear() {
    this.n = 0;
    this.debt = { a: 0, g: 0 };
  }

  private add(x: number, v = Math.random() * 2 - 1) {
    if (this.n >= this.max) return;
    this.x[this.n] = x;
    this.v[this.n] = v;
    this.nb[this.n] = 1;
    this.n++;
  }

  /** Drop molecules nearest to x0. */
  private remove(x0: number, count: number) {
    for (let r = 0; r < count && this.n; r++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < this.n; j++) {
        const d = Math.abs(this.x[j] - x0);
        if (d < bd) { bd = d; best = j; }
      }
      this.kill(best);
    }
  }

  private kill(j: number) {
    this.n--;
    this.x[j] = this.x[this.n];
    this.v[j] = this.v[this.n];
    this.nb[j] = this.nb[this.n];
  }

  /** A fresh sample of a whole profile. */
  fill(c: ArrayLike<number>) {
    this.clear();
    for (let i = 0; i <= NX; i++) {
      const w = Gradient.w(i), x0 = i === 0 ? 0 : i * DX - DX / 2;
      let m = c[i] * w * this.per;
      while (m > 0) {
        if (Math.random() < m) this.add(x0 + Math.random() * w);
        m -= 1;
      }
    }
    this.nb.fill(0);
  }

  /**
   * One frame: emit what the sources put in, then walk everyone for dt.
   * New molecules walk for a random part of the frame, as if born during it.
   */
  advance(inj: { a: number; g: number }, graftX: number, D: number, k: number, dt: number, halfHeight: number) {
    const put = (key: 'a' | 'g', mass: number, x0: number, x1: number, centre: number) => {
      const m = this.debt[key] + mass * this.per;
      const whole = m > 0 ? Math.floor(m) : Math.ceil(m);
      this.debt[key] = m - whole;
      if (whole > 0) for (let j = 0; j < whole; j++) this.add(x0 + Math.random() * (x1 - x0));
      else if (whole < 0) this.remove(centre, -whole);
    };
    put('a', inj.a, 0, DX / 2, 0);
    if (graftX >= 0) put('g', inj.g, Math.max(0, graftX - DX / 2), Math.min(L, graftX + DX / 2), graftX);
    else this.debt.g = 0;
    const s = Math.sqrt(2 * D * dt), die = 1 - Math.exp(-k * dt);
    for (let j = 0; j < this.n; j++) {
      const part = this.nb[j] ? Math.random() : 1;
      this.nb[j] = 0;
      if (Math.random() < die * part) {
        this.kill(j);
        j--;
        continue;
      }
      const sp = s * Math.sqrt(part);
      let x = this.x[j] + sp * gauss();
      // reflect at both ends
      for (let r = 0; r < 4 && (x < 0 || x > L); r++) x = x < 0 ? -x : 2 * L - x;
      this.x[j] = Math.min(L, Math.max(0, x));
      let v = this.v[j] + (sp / halfHeight) * gauss();
      for (let r = 0; r < 4 && (v < -1 || v > 1); r++) v = v < -1 ? -2 - v : 2 - v;
      this.v[j] = Math.min(1, Math.max(-1, v));
    }
  }
}
