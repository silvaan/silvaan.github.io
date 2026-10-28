// UMAP, small enough to run live in the page.
//
// Each point keeps only its k nearest neighbours. It measures them from its
// nearest one (ρ_i), so every point is tied to at least one other at full
// strength, and with a width σ_i chosen so the k weights add up to log2 k.
// The two one-way views of a pair are glued by a fuzzy union, w = a + b − ab.
// The map is laid out by stochastic gradient descent on the cross-entropy
// between w and the curve q = 1 / (1 + a d^{2b}): every epoch each thread is
// tugged a number of times proportional to its weight, and each tug also
// pushes the point away from a few others picked at random (negative
// sampling), as in umap-learn.

/** The k-nearest-neighbour graph with its fuzzy weights. */
export function fuzzyGraph(D: Float64Array, N: number, kAsked: number) {
  const k = Math.max(2, Math.min(kAsked, N - 1));
  const knn = new Int32Array(N * k), dist = new Float64Array(N * k);
  const rho = new Float64Array(N), sigma = new Float64Array(N);
  /** One-way weights v_{j|i}, row i: how much i counts j as a neighbour. */
  const V = new Float64Array(N * N);
  const target = Math.log2(k);
  for (let i = 0; i < N; i++) {
    const order = Array.from({ length: N }, (_, j) => j).filter((j) => j !== i);
    order.sort((a, b) => D[i * N + a] - D[i * N + b]);
    let mean = 0;
    for (let m = 0; m < k; m++) {
      knn[i * k + m] = order[m];
      dist[i * k + m] = Math.sqrt(D[i * N + order[m]]);
      mean += dist[i * k + m] / k;
    }
    rho[i] = dist[i * k];
    // bisect σ so the weights sum to log2 k, as umap-learn's smooth_knn_dist
    let lo = 0, hi = Infinity, mid = 1;
    for (let n = 0; n < 64; n++) {
      let s = 0;
      for (let m = 0; m < k; m++) s += Math.exp(-Math.max(0, dist[i * k + m] - rho[i]) / mid);
      if (Math.abs(s - target) < 1e-5) break;
      if (s > target) { hi = mid; mid = (lo + hi) / 2; }
      else { lo = mid; mid = hi === Infinity ? mid * 2 : (lo + hi) / 2; }
    }
    sigma[i] = Math.max(mid, 1e-3 * mean);
    for (let m = 0; m < k; m++)
      V[i * N + knn[i * k + m]] = Math.exp(-Math.max(0, dist[i * k + m] - rho[i]) / sigma[i]);
  }
  // fuzzy union of the two one-way views
  const W = new Float64Array(N * N);
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++) {
      const a = V[i * N + j], b = V[j * N + i];
      const w = a + b - a * b;
      if (w <= 0) continue;
      W[i * N + j] = w;
      W[j * N + i] = w;
      pairs.push([i, j, w]);
    }
  return { k, knn, dist, rho, sigma, V, W, pairs };
}

/** The a, b of q(d) = 1 / (1 + a d^{2b}) closest to 1 up to min_dist, then e^{-(d − min_dist)}. */
export function fitAB(minDist: number, spread = 1) {
  const xs: number[] = [], ys: number[] = [];
  for (let k = 0; k < 300; k++) {
    const x = (3 * spread * k) / 299;
    xs.push(x);
    ys.push(x < minDist ? 1 : Math.exp(-(x - minDist) / spread));
  }
  const err = (la: number, b: number) => {
    const a = Math.exp(la);
    let s = 0;
    for (let k = 0; k < xs.length; k++) {
      const d = 1 / (1 + a * xs[k] ** (2 * b)) - ys[k];
      s += d * d;
    }
    return s;
  };
  // a grid in (log a, b), shrunk around the best cell a few times
  let ca = 0, cb = 1, ra = 4, rb = 1, best = Infinity;
  for (let round = 0; round < 7; round++) {
    let na = ca, nb = cb;
    for (let ia = -10; ia <= 10; ia++)
      for (let ib = -10; ib <= 10; ib++) {
        const la = ca + (ra * ia) / 10, b = cb + (rb * ib) / 10;
        if (b <= 0.05) continue;
        const e = err(la, b);
        if (e < best) { best = e; na = la; nb = b; }
      }
    ca = na; cb = nb; ra /= 4; rb /= 4;
  }
  return { a: Math.exp(ca), b: cb };
}

export const NEG_RATE = 5;

/** The 2D map and its sampled optimizer. */
export class Layout {
  N: number;
  Y: Float64Array;
  a: number;
  b: number;
  nEpochs: number;
  epoch = 0;
  alpha = 1;
  /** Called on every tug of a thread and every push from a random point. */
  onPull?: (i: number, j: number) => void;
  onPush?: (i: number, k: number) => void;
  private W: Float64Array;
  private head: Int32Array;
  private tail: Int32Array;
  private eps: Float64Array;
  private next: Float64Array;
  private epsNeg: Float64Array;
  private nextNeg: Float64Array;
  private c = 0;
  private rnd: () => number;

  constructor(W: Float64Array, pairs: [number, number, number][], N: number, a: number, b: number, nEpochs = 500, seed = 1) {
    this.N = N;
    this.W = W;
    this.a = a;
    this.b = b;
    this.nEpochs = nEpochs;
    let s = seed >>> 0 || 1;
    this.rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    this.Y = new Float64Array(2 * N);
    for (let k = 0; k < 2 * N; k++) this.Y[k] = 20 * this.rnd() - 10;

    // both directions of every thread, the faintest dropped, in a shuffled order
    const wmax = Math.max(...pairs.map((p) => p[2]));
    const E: [number, number, number][] = [];
    for (const [i, j, w] of pairs) {
      if (w < wmax / nEpochs) continue;
      E.push([i, j, w], [j, i, w]);
    }
    for (let k = E.length - 1; k > 0; k--) {
      const r = Math.floor(this.rnd() * (k + 1));
      [E[k], E[r]] = [E[r], E[k]];
    }
    this.head = Int32Array.from(E.map((e) => e[0]));
    this.tail = Int32Array.from(E.map((e) => e[1]));
    // a thread of weight w is tugged once every wmax / w epochs
    this.eps = Float64Array.from(E.map((e) => wmax / e[2]));
    this.next = Float64Array.from(this.eps);
    this.epsNeg = this.eps.map((v) => v / NEG_RATE);
    this.nextNeg = Float64Array.from(this.epsNeg);
  }

  get done() {
    return this.epoch >= this.nEpochs;
  }

  /** Tug the next thread due in this epoch, with its pushes. False when the epoch ends instead. */
  tug(): boolean {
    if (this.done) return false;
    const E = this.head.length;
    while (this.c < E && this.next[this.c] > this.epoch) this.c++;
    if (this.c >= E) {
      this.c = 0;
      this.epoch++;
      this.alpha = 1 - this.epoch / this.nEpochs;
      return false;
    }
    const e = this.c++;
    const { Y, a, b, alpha, N } = this;
    const i = this.head[e], j = this.tail[e];
    const clip = (v: number) => Math.max(-4, Math.min(4, v));

    // pull: both ends move toward each other
    let dx = Y[2 * i] - Y[2 * j], dy = Y[2 * i + 1] - Y[2 * j + 1];
    let d2 = dx * dx + dy * dy;
    if (d2 > 0) {
      const g = (-2 * a * b * d2 ** (b - 1)) / (a * d2 ** b + 1);
      const gx = clip(g * dx) * alpha, gy = clip(g * dy) * alpha;
      Y[2 * i] += gx; Y[2 * i + 1] += gy;
      Y[2 * j] -= gx; Y[2 * j + 1] -= gy;
    }
    this.onPull?.(i, j);
    this.next[e] += this.eps[e];

    // push: a few points picked at random, only i moves away
    const nNeg = Math.floor((this.epoch - this.nextNeg[e]) / this.epsNeg[e]);
    for (let p = 0; p < nNeg; p++) {
      const k = Math.floor(this.rnd() * N);
      if (k === i) continue;
      dx = Y[2 * i] - Y[2 * k]; dy = Y[2 * i + 1] - Y[2 * k + 1];
      d2 = dx * dx + dy * dy;
      const g = d2 > 0 ? (2 * b) / ((0.001 + d2) * (a * d2 ** b + 1)) : 0;
      Y[2 * i] += (g > 0 ? clip(g * dx) : 4) * alpha;
      Y[2 * i + 1] += (g > 0 ? clip(g * dy) : 4) * alpha;
      this.onPush?.(i, k);
    }
    this.nextNeg[e] += Math.max(0, nNeg) * this.epsNeg[e];
    return true;
  }

  /** Run to the end at once. */
  settle() {
    while (!this.done) this.tug();
  }

  /** Σ w log(w/q) + (1 − w) log((1 − w)/(1 − q)) over all pairs. */
  crossEntropy() {
    const { N, Y, W, a, b } = this;
    let c = 0;
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++) {
        const d2 = (Y[2 * i] - Y[2 * j]) ** 2 + (Y[2 * i + 1] - Y[2 * j + 1]) ** 2;
        const q = Math.min(1 - 1e-6, Math.max(1e-6, 1 / (1 + a * d2 ** b)));
        const w = W[i * N + j];
        if (w > 0) c += w * Math.log(w / q);
        if (w < 1) c += (1 - w) * Math.log((1 - w) / (1 - q));
      }
    return c;
  }
}
