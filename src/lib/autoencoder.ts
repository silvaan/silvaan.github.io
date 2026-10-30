// A small autoencoder, trained in the page.
//
// picture (D) → H tanh → L numbers → H tanh → picture (D, sigmoid)
//
// Every weight lives in one Float32Array so Adam is a single loop.

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class AE {
  readonly D: number;
  readonly H: number;
  readonly L: number;
  steps = 0;
  private p: Float32Array;
  private g: Float32Array;
  private m: Float32Array;
  private v: Float32Array;
  private t = 0;
  private o: { W1: number; b1: number; W2: number; b2: number; W3: number; b3: number; W4: number; b4: number };
  private rnd: () => number;
  // scratch for one sample
  private h1: Float32Array;
  private h2: Float32Array;
  private z: Float32Array;
  private xh: Float32Array;
  private dh1: Float32Array;
  private dh2: Float32Array;
  private dz: Float32Array;

  constructor(D: number, L: number, seed = 1, H = 64) {
    this.D = D; this.H = H; this.L = L;
    this.rnd = rng(seed);
    let n = 0;
    const take = (k: number) => { const at = n; n += k; return at; };
    this.o = {
      W1: take(H * D), b1: take(H),
      W2: take(L * H), b2: take(L),
      W3: take(H * L), b3: take(H),
      W4: take(D * H), b4: take(D),
    };
    this.p = new Float32Array(n);
    this.g = new Float32Array(n);
    this.m = new Float32Array(n);
    this.v = new Float32Array(n);
    const fill = (at: number, k: number, s: number) => { for (let i = 0; i < k; i++) this.p[at + i] = this.gauss() * s; };
    fill(this.o.W1, H * D, Math.sqrt(1 / D) * 1.5);
    fill(this.o.W2, L * H, Math.sqrt(1 / H));
    fill(this.o.W3, H * L, Math.sqrt(1 / L));
    fill(this.o.W4, D * H, Math.sqrt(1 / H));
    this.h1 = new Float32Array(H); this.h2 = new Float32Array(H);
    this.z = new Float32Array(L); this.xh = new Float32Array(D);
    this.dh1 = new Float32Array(H); this.dh2 = new Float32Array(H); this.dz = new Float32Array(L);
  }

  private gauss() {
    const u = Math.max(1e-9, this.rnd());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.rnd());
  }

  /** The code of a picture, into `out`. */
  encode(x: ArrayLike<number>, out: Float32Array | number[] = this.z) {
    const { D, H, L, p, o, h1 } = this;
    for (let j = 0; j < H; j++) {
      let s = p[o.b1 + j];
      const off = o.W1 + j * D;
      for (let i = 0; i < D; i++) s += p[off + i] * x[i];
      h1[j] = Math.tanh(s);
    }
    for (let j = 0; j < L; j++) {
      let s = p[o.b2 + j];
      const off = o.W2 + j * H;
      for (let i = 0; i < H; i++) s += p[off + i] * h1[i];
      out[j] = s;
    }
    return out;
  }

  /** The picture rebuilt from a code, into `out`. */
  decode(z: ArrayLike<number>, out: Float32Array | Float64Array = this.xh) {
    const { D, H, L, p, o, h2 } = this;
    for (let j = 0; j < H; j++) {
      let s = p[o.b3 + j];
      const off = o.W3 + j * L;
      for (let i = 0; i < L; i++) s += p[off + i] * z[i];
      h2[j] = Math.tanh(s);
    }
    for (let j = 0; j < D; j++) {
      let s = p[o.b4 + j];
      const off = o.W4 + j * H;
      for (let i = 0; i < H; i++) s += p[off + i] * h2[i];
      out[j] = 1 / (1 + Math.exp(-s));
    }
    return out;
  }

  /** One Adam step on a batch of pictures. */
  step(X: ArrayLike<number>[], batch = 16, lr = 0.003) {
    const { D, H, L, p, g, o, h1, h2, z, xh, dh1, dh2, dz } = this;
    g.fill(0);
    for (let n = 0; n < batch; n++) {
      const x = X[Math.floor(this.rnd() * X.length)];
      this.encode(x, z);
      this.decode(z, xh);
      // binary cross-entropy against the pixels: the logit's gradient is x̂ − x
      dh2.fill(0);
      for (let j = 0; j < D; j++) {
        const d = (xh[j] - x[j]) / batch, off = o.W4 + j * H;
        if (d === 0) continue;
        for (let i = 0; i < H; i++) { g[off + i] += d * h2[i]; dh2[i] += p[off + i] * d; }
        g[o.b4 + j] += d;
      }
      dz.fill(0);
      for (let j = 0; j < H; j++) {
        const d = dh2[j] * (1 - h2[j] * h2[j]), off = o.W3 + j * L;
        for (let i = 0; i < L; i++) { g[off + i] += d * z[i]; dz[i] += p[off + i] * d; }
        g[o.b3 + j] += d;
      }
      dh1.fill(0);
      for (let j = 0; j < L; j++) {
        const d = dz[j], off = o.W2 + j * H;
        for (let i = 0; i < H; i++) { g[off + i] += d * h1[i]; dh1[i] += p[off + i] * d; }
        g[o.b2 + j] += d;
      }
      for (let j = 0; j < H; j++) {
        const d = dh1[j] * (1 - h1[j] * h1[j]), off = o.W1 + j * D;
        if (d === 0) continue;
        for (let i = 0; i < D; i++) g[off + i] += d * x[i];
        g[o.b1 + j] += d;
      }
    }
    this.adam(lr);
    this.steps++;
  }

  private adam(lr: number) {
    const { p, g, m, v } = this;
    this.t++;
    const c1 = 1 - 0.9 ** this.t, c2 = 1 - 0.999 ** this.t;
    for (let i = 0; i < p.length; i++) {
      m[i] = 0.9 * m[i] + 0.1 * g[i];
      v[i] = 0.999 * v[i] + 0.001 * g[i] * g[i];
      p[i] -= (lr * (m[i] / c1)) / (Math.sqrt(v[i] / c2) + 1e-8);
    }
  }

  /** Every weight, to send elsewhere. */
  weights() { return this.p.slice(); }
  load(w: Float32Array) { this.p.set(w); }

  /** Mean squared pixel error of the rebuilt pictures. */
  error(X: ArrayLike<number>[], every = 1) {
    let s = 0, n = 0;
    const c = new Float32Array(this.L);
    for (let k = 0; k < X.length; k += every) {
      this.encode(X[k], c);
      this.decode(c);
      for (let i = 0; i < this.D; i++) s += (this.xh[i] - X[k][i]) ** 2;
      n++;
    }
    return s / (n * this.D);
  }
}
