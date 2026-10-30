// Contrastive learning, small enough to run live in the page.
//
// The things to embed are little pictures: a shape, a colour, a size and a
// turn. A tiny network (features → H → 3) sends each one to a point on a
// sphere, as real systems do by normalising every embedding to length 1.
// Nobody says where anything goes. The only input is a rule for which things
// count as a pair; the loss pulls pairs together and pushes everything else
// apart, and the layout follows from the rule:
//
//   shape    pictures with the same shape are pairs (labels, supervised)
//   colour   pictures with the same colour are pairs (labels, supervised)
//   versions two randomly altered copies of one picture are pairs (no labels, SimCLR)
//   caption  a picture and its caption are pairs, each with its own network (CLIP)

export const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};
export const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

export const SHAPES = ['circle', 'triangle', 'square', 'star'];
export const COLOURS = ['red', 'blue', 'yellow', 'green'];

export type Pic = { shape: number; colour: number; size: number; turn: number };
export type Rule = 'shape' | 'colour' | 'versions' | 'caption';
export type Loss = 'pull' | 'pairs' | 'triplet' | 'nce';

/** Every shape in every colour, three times with its own size and turn. */
export function pictures(seed = 3): Pic[] {
  const r = rng(seed), out: Pic[] = [];
  for (let s = 0; s < 4; s++)
    for (let c = 0; c < 4; c++)
      for (let k = 0; k < 3; k++) out.push({ shape: s, colour: c, size: 0.75 + 0.5 * r(), turn: r() * Math.PI * 2 });
  return out;
}
/** The sixteen captions, "red star" and so on, as (shape, colour). */
export const CAPTIONS = Array.from({ length: 16 }, (_, k) => ({ shape: k >> 2, colour: k & 3 }));

/** Features per input; a caption uses the first eight and leaves the rest at zero. */
const F = 11;
function picFeatures(p: Pic, out: Float64Array, at: number) {
  out[at + p.shape] = 1;
  out[at + 4 + p.colour] = 1;
  out[at + 8] = p.size - 1;
  out[at + 9] = Math.sin(p.turn);
  out[at + 10] = Math.cos(p.turn);
}
function capFeatures(c: { shape: number; colour: number }, out: Float64Array, at: number) {
  out[at + c.shape] = 1;
  out[at + 4 + c.colour] = 1;
}

/** A random new version of a picture: another size, another turn, and most often another colour. */
export function alter(p: Pic, r: () => number): Pic {
  return { shape: p.shape, colour: r() < 0.8 ? Math.floor(r() * 4) : p.colour, size: 0.75 + 0.5 * r(), turn: r() * Math.PI * 2 };
}

/** features → H → 3 with tanh, then normalised onto the unit sphere. */
export class Encoder {
  H: number;
  p: Float64Array;
  private m: Float64Array;
  private v: Float64Array;
  private t = 0;
  private o: { b1: number; w2: number; b2: number };

  constructor(H = 16, seed = 11) {
    this.H = H;
    this.o = { b1: F * H, w2: F * H + H, b2: F * H + 4 * H };
    this.p = new Float64Array(F * H + 4 * H + 3);
    const r = rng(seed);
    for (let k = 0; k < F * H; k++) this.p[k] = 1.3 * gauss(r);
    for (let k = 0; k < H; k++) this.p[this.o.b1 + k] = 0.3 * gauss(r);
    for (let k = 0; k < 3 * H; k++) this.p[this.o.w2 + k] = (1.6 * gauss(r)) / Math.sqrt(H);
    this.m = new Float64Array(this.p.length);
    this.v = new Float64Array(this.p.length);
  }

  /** One input onto the sphere: the raw output o, its length and the unit z; fills h with the hidden layer. */
  forward(X: Float64Array, at: number, h: Float64Array) {
    const { H, p } = this, { b1, w2, b2 } = this.o;
    const o = [p[b2], p[b2 + 1], p[b2 + 2]];
    for (let k = 0; k < H; k++) {
      let s = p[b1 + k];
      for (let f = 0; f < F; f++) s += p[k * F + f] * X[at + f];
      h[k] = Math.tanh(s);
      for (let c = 0; c < 3; c++) o[c] += p[w2 + c * H + k] * h[k];
    }
    const len = Math.hypot(o[0], o[1], o[2]) || 1e-9;
    return { len, z: [o[0] / len, o[1] / len, o[2] / len] };
  }

  /** Add the gradient for one input, given dL/dz (three numbers at gz[at3]), into g. */
  back(X: Float64Array, at: number, gz: Float64Array, at3: number, g: Float64Array, h: Float64Array) {
    const { H, p } = this, { b1, w2, b2 } = this.o;
    const { len, z } = this.forward(X, at, h);
    // through z = o / |o|: only the part of the gradient that turns z counts
    const dot = gz[at3] * z[0] + gz[at3 + 1] * z[1] + gz[at3 + 2] * z[2];
    const go = [0, 1, 2].map((c) => (gz[at3 + c] - z[c] * dot) / len);
    for (let c = 0; c < 3; c++) g[b2 + c] += go[c];
    for (let k = 0; k < H; k++) {
      let back = 0;
      for (let c = 0; c < 3; c++) {
        g[w2 + c * H + k] += go[c] * h[k];
        back += go[c] * p[w2 + c * H + k];
      }
      const gh = back * (1 - h[k] * h[k]);
      g[b1 + k] += gh;
      for (let f = 0; f < F; f++) g[k * F + f] += gh * X[at + f];
    }
  }

  /** Adam, with weight decay on the weights (not the biases). */
  adam(g: Float64Array, lr: number, decay: number) {
    const { p } = this, { b1, w2, b2 } = this.o;
    this.t++;
    const c1 = 1 - 0.9 ** this.t, c2 = 1 - 0.999 ** this.t;
    for (let k = 0; k < p.length; k++) {
      const weight = k < b1 || (k >= w2 && k < b2);
      const gk = g[k] + (weight ? decay * p[k] : 0);
      this.m[k] = 0.9 * this.m[k] + 0.1 * gk;
      this.v[k] = 0.999 * this.v[k] + 0.001 * gk * gk;
      p[k] -= (lr * this.m[k]) / c1 / (Math.sqrt(this.v[k] / c2) + 1e-8);
    }
  }
}

/**
 * One batch: the inputs, which network reads each, and two relations on
 * them. pos[a·m + b] marks a pair; cand[a·m + b] marks what a is compared
 * with at all (for captions, only things of the other kind).
 */
export type Batch = {
  m: number;
  X: Float64Array;
  /** 0: picture network, 1: caption network. */
  net: Uint8Array;
  pos: Uint8Array;
  cand: Uint8Array;
  /** The picture (or caption, after the pictures) each row came from. */
  src: Int32Array;
  /** For versions, the altered picture each row shows. */
  vers?: Pic[];
};

/** The batch a rule makes from the pictures; `r` draws the random versions. */
export function batch(P: Pic[], rule: Rule, r: () => number): Batch {
  const n = P.length;
  if (rule === 'caption') {
    const m = n + CAPTIONS.length;
    const X = new Float64Array(m * F), net = new Uint8Array(m), pos = new Uint8Array(m * m), cand = new Uint8Array(m * m);
    P.forEach((p, i) => picFeatures(p, X, i * F));
    CAPTIONS.forEach((c, k) => { capFeatures(c, X, (n + k) * F); net[n + k] = 1; });
    for (let i = 0; i < n; i++)
      for (let k = 0; k < CAPTIONS.length; k++) {
        const a = i, b = n + k;
        cand[a * m + b] = cand[b * m + a] = 1;
        if (P[i].shape === CAPTIONS[k].shape && P[i].colour === CAPTIONS[k].colour) pos[a * m + b] = pos[b * m + a] = 1;
      }
    return { m, X, net, pos, cand, src: Int32Array.from({ length: m }, (_, a) => a) };
  }
  if (rule === 'versions') {
    const m = 2 * n;
    const X = new Float64Array(m * F), pos = new Uint8Array(m * m), cand = new Uint8Array(m * m).fill(1);
    const vers: Pic[] = new Array(m);
    P.forEach((p, i) => {
      vers[i] = alter(p, r);
      vers[i + n] = alter(p, r);
      picFeatures(vers[i], X, i * F);
      picFeatures(vers[i + n], X, (i + n) * F);
    });
    for (let a = 0; a < m; a++) cand[a * m + a] = 0;
    for (let i = 0; i < n; i++) pos[i * m + i + n] = pos[(i + n) * m + i] = 1;
    return { m, X, net: new Uint8Array(m), pos, cand, src: Int32Array.from({ length: m }, (_, a) => a % n), vers };
  }
  const X = new Float64Array(n * F), pos = new Uint8Array(n * n), cand = new Uint8Array(n * n).fill(1);
  P.forEach((p, i) => picFeatures(p, X, i * F));
  for (let a = 0; a < n; a++) {
    cand[a * n + a] = 0;
    for (let b = 0; b < n; b++)
      if (a !== b && (rule === 'shape' ? P[a].shape === P[b].shape : P[a].colour === P[b].colour)) pos[a * n + b] = 1;
  }
  return { m: n, X, net: new Uint8Array(n), pos, cand, src: Int32Array.from({ length: n }, (_, a) => a) };
}

export type Params = { margin: number; tau: number };

/**
 * dL/dd for every distance the loss looks at from anchor a: positive pulls,
 * negative pushes. Every loss here is a rule about distances, so this one
 * function is all that differs between them. Returns a's share of the loss.
 */
export function pushes(Z: Float64Array, B: Batch, loss: Loss, k: Params, a: number, out: Float64Array) {
  const { m, pos, cand } = B;
  out.fill(0);
  const d = (j: number) => Math.hypot(Z[3 * a] - Z[3 * j], Z[3 * a + 1] - Z[3 * j + 1], Z[3 * a + 2] - Z[3 * j + 2]);
  let L = 0;
  if (loss === 'pull' || loss === 'pairs') {
    // every pair to zero; with the push, every other pair out past the margin
    let cnt = 0;
    for (let j = 0; j < m; j++) if (cand[a * m + j]) cnt++;
    for (let j = 0; j < m; j++) {
      if (!cand[a * m + j]) continue;
      const dj = d(j);
      if (pos[a * m + j]) { L += (dj * dj) / cnt; out[j] = (2 * dj) / cnt; }
      else if (loss === 'pairs' && dj < k.margin) { L += (k.margin - dj) ** 2 / cnt; out[j] = (-2 * (k.margin - dj)) / cnt; }
    }
    return L;
  }
  const Ps: number[] = [], Ns: number[] = [];
  for (let j = 0; j < m; j++) if (cand[a * m + j]) (pos[a * m + j] ? Ps : Ns).push(j);
  if (!Ps.length || !Ns.length) return 0;
  if (loss === 'triplet') {
    // each pair must be nearer than each non-pair, by the margin
    const dn = Ns.map(d), w = 1 / (Ps.length * Ns.length);
    for (const p of Ps) {
      const dp = d(p);
      Ns.forEach((q, i) => {
        const v = dp - dn[i] + k.margin;
        if (v <= 0) return;
        L += v * w;
        out[p] += w;
        out[q] -= w;
      });
    }
    return L;
  }
  // InfoNCE: a softmax over everything a is compared with, s = −d²/τ, every pair a right answer
  const C = [...Ps, ...Ns], s = C.map((j) => -(d(j) ** 2) / k.tau);
  const mx = Math.max(...s);
  let sum = 0;
  const e = s.map((v) => { const x = Math.exp(v - mx); sum += x; return x; });
  const lse = Math.log(sum) + mx;
  C.forEach((j, i) => {
    const isPos = i < Ps.length;
    if (isPos) L += (lse - s[i]) / Ps.length;
    out[j] = ((e[i] / sum - (isPos ? 1 / Ps.length : 0)) * -2 * d(j)) / k.tau;
  });
  return L;
}

/** dL/dd turned into dL/dz for the whole batch. */
function lossAndGrad(Z: Float64Array, B: Batch, loss: Loss, k: Params) {
  const { m } = B, g = new Float64Array(3 * m), dd = new Float64Array(m);
  let L = 0;
  for (let a = 0; a < m; a++) {
    L += pushes(Z, B, loss, k, a, dd) / m;
    for (let j = 0; j < m; j++) {
      if (!dd[j]) continue;
      const dist = Math.hypot(Z[3 * a] - Z[3 * j], Z[3 * a + 1] - Z[3 * j + 1], Z[3 * a + 2] - Z[3 * j + 2]);
      if (dist < 1e-9) continue;
      const c = dd[j] / m / dist;
      for (let k = 0; k < 3; k++) {
        const dk = Z[3 * a + k] - Z[3 * j + k];
        g[3 * a + k] += c * dk;
        g[3 * j + k] -= c * dk;
      }
    }
  }
  return { L, g };
}

/** A training run: a network for pictures, one for captions, a rule and a loss. */
export class Run {
  P: Pic[];
  rule: Rule;
  loss: Loss;
  k: Params;
  pic = new Encoder(16, 11);
  cap = new Encoder(16, 23);
  step = 0;
  L = 0;
  B: Batch;
  Z: Float64Array;
  private r: () => number;
  private h = new Float64Array(16);

  constructor(P: Pic[], rule: Rule, loss: Loss, k: Params, seed = 5) {
    this.P = P;
    this.rule = rule;
    this.loss = loss;
    this.k = { ...k };
    this.r = rng(seed);
    this.B = batch(P, rule, this.r);
    this.Z = this.embed(this.B);
    this.L = lossAndGrad(this.Z, this.B, loss, this.k).L;
  }

  embed(B: Batch) {
    const Z = new Float64Array(3 * B.m);
    for (let a = 0; a < B.m; a++) Z.set((B.net[a] ? this.cap : this.pic).forward(B.X, a * F, this.h).z, 3 * a);
    return Z;
  }

  learn() {
    this.B = batch(this.P, this.rule, this.r);
    this.Z = this.embed(this.B);
    const { L, g } = lossAndGrad(this.Z, this.B, this.loss, this.k);
    this.L = L;
    const gp = new Float64Array(this.pic.p.length), gc = new Float64Array(this.cap.p.length);
    for (let a = 0; a < this.B.m; a++)
      (this.B.net[a] ? this.cap : this.pic).back(this.B.X, a * F, g, 3 * a, this.B.net[a] ? gc : gp, this.h);
    // Pull alone has a perfect answer that means nothing, one point for
    // everything, and a network drifts to it; a firm weight decay stands in
    // for that drift in one this small.
    const decay = this.loss === 'pull' ? 0.3 : 1e-3;
    this.pic.adam(gp, 0.01, decay);
    if (this.rule === 'caption') this.cap.adam(gc, 0.01, decay);
    this.step++;
  }

  /** Where every picture lands, then every caption. */
  layout() {
    const n = this.P.length, X = new Float64Array((n + 16) * F), out = new Float64Array(3 * (n + 16));
    this.P.forEach((p, i) => picFeatures(p, X, i * F));
    CAPTIONS.forEach((c, k) => capFeatures(c, X, (n + k) * F));
    for (let i = 0; i < n + 16; i++) {
      out.set((i < n ? this.pic : this.cap).forward(X, i * F, this.h).z, 3 * i);
    }
    return out;
  }
}

/**
 * How well the layout answers a lookup. For captions: the share whose
 * nearest picture matches them. Otherwise: the share of pictures whose
 * nearest other picture shares the feature the rule was about (the shape for
 * versions, the one thing a random version never changes).
 */
export function lookup(Y: Float64Array, P: Pic[], rule: Rule) {
  const n = P.length;
  const d = (a: number, b: number) => (Y[3 * a] - Y[3 * b]) ** 2 + (Y[3 * a + 1] - Y[3 * b + 1]) ** 2 + (Y[3 * a + 2] - Y[3 * b + 2]) ** 2;
  let ok = 0;
  if (rule === 'caption') {
    for (let k = 0; k < 16; k++) {
      let best = 0;
      for (let i = 1; i < n; i++) if (d(n + k, i) < d(n + k, best)) best = i;
      if (P[best].shape === CAPTIONS[k].shape && P[best].colour === CAPTIONS[k].colour) ok++;
    }
    return ok / 16;
  }
  const key = (p: Pic) => (rule === 'colour' ? p.colour : p.shape);
  for (let i = 0; i < n; i++) {
    let best = -1;
    for (let j = 0; j < n; j++) if (j !== i && (best < 0 || d(i, j) < d(i, best))) best = j;
    if (key(P[best]) === key(P[i])) ok++;
  }
  return ok / n;
}
