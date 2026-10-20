// t-SNE, exact, small enough to run live in the page.
//
// Each point i turns the distances to the others into a probability p_{j|i}
// with a Gaussian of its own width σ_i. The width is set so that the
// distribution's perplexity 2^H, its effective number of neighbours, equals
// the one asked for: a binary search, since perplexity only grows with σ.
// The map then moves points in 2D so that a heavy-tailed Student-t similarity
// q_ij matches the symmetrised p_ij, by gradient descent on KL(P‖Q).
// All pairs are computed every step (no Barnes-Hut), which is fine for the
// few hundred points the sims use.

/** Squared distances between all pairs of rows, as an N×N matrix. */
export function sqDistances(X: ArrayLike<number>[]): Float64Array {
  const N = X.length, D = new Float64Array(N * N);
  for (let i = 0; i < N; i++) {
    const a = X[i];
    for (let j = i + 1; j < N; j++) {
      const b = X[j];
      let s = 0;
      for (let k = 0; k < a.length; k++) { const d = a[k] - b[k]; s += d * d; }
      D[i * N + j] = s;
      D[j * N + i] = s;
    }
  }
  return D;
}

export type Search = {
  sigma: number;
  /** Entropy in bits. */
  H: number;
  perp: number;
  /** p_{j|i} for every j (0 at j = i). */
  p: Float64Array;
  /** Every width the search tried, in order, with the perplexity it gave. */
  steps: { sigma: number; perp: number }[];
};

/** Perplexity of row i's distribution at width σ, and the distribution. */
export function rowAt(D: Float64Array, N: number, i: number, sigma: number, out = new Float64Array(N)) {
  const beta = 1 / (2 * sigma * sigma);
  let dmin = Infinity;
  for (let j = 0; j < N; j++) if (j !== i) dmin = Math.min(dmin, D[i * N + j]);
  let sum = 0, sdp = 0;
  for (let j = 0; j < N; j++) {
    if (j === i) { out[j] = 0; continue; }
    const d = D[i * N + j] - dmin; // shifted so the nearest weighs 1: no underflow at small σ
    const v = Math.exp(-beta * d);
    out[j] = v;
    sum += v;
    sdp += d * v;
  }
  for (let j = 0; j < N; j++) out[j] /= sum;
  const Hn = Math.log(sum) + (beta * sdp) / sum; // nats
  return { p: out, H: Hn / Math.LN2, perp: Math.exp(Hn) };
}

/** The width σ_i whose distribution has the given perplexity. */
export function searchSigma(D: Float64Array, N: number, i: number, target: number): Search {
  // start at the typical distance to the others, then bisect in log σ
  let mean = 0;
  for (let j = 0; j < N; j++) if (j !== i) mean += D[i * N + j];
  let lo = -Infinity, hi = Infinity;
  let ls = 0.5 * Math.log(Math.max(1e-12, mean / (N - 1)));
  const steps: Search['steps'] = [];
  const p = new Float64Array(N);
  let r = rowAt(D, N, i, Math.exp(ls), p);
  for (let k = 0; k < 80; k++) {
    steps.push({ sigma: Math.exp(ls), perp: r.perp });
    if (Math.abs(Math.log(r.perp / target)) < 1e-4) break;
    if (r.perp > target) hi = ls; else lo = ls;
    ls = isFinite(lo) && isFinite(hi) ? (lo + hi) / 2 : isFinite(lo) ? lo + 1 : hi - 1;
    r = rowAt(D, N, i, Math.exp(ls), p);
  }
  return { sigma: Math.exp(ls), H: r.H, perp: r.perp, p, steps };
}

/** Symmetric joint p_ij = (p_{j|i} + p_{i|j}) / 2N, and every point's σ. */
export function jointP(D: Float64Array, N: number, perp: number) {
  const target = Math.min(perp, N - 1.01);
  const cond = new Float64Array(N * N), sigma = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const s = searchSigma(D, N, i, target);
    sigma[i] = s.sigma;
    cond.set(s.p, i * N);
  }
  const P = new Float64Array(N * N);
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) P[i * N + j] = Math.max(1e-12, (cond[i * N + j] + cond[j * N + i]) / (2 * N));
  for (let i = 0; i < N; i++) P[i * N + i] = 0;
  return { P, cond, sigma };
}

export const EXAGGERATION = 12;
export const EXAGGERATION_ITERS = 250;

/** The 2D map and its optimizer: momentum and per-coordinate gains, as in van der Maaten's code. */
export class Embedding {
  N: number;
  P: Float64Array;
  Y: Float64Array;
  iter = 0;
  /** KL(P‖Q) every few iterations, for the curve. */
  history: { iter: number; kl: number }[] = [];
  exaggerate = true;
  lr: number;
  /** Student-t kernel and its normaliser from the last step: q_ij = num_ij / Z. */
  num: Float64Array;
  Z = 1;
  private gains: Float64Array;
  private upd: Float64Array;
  private grad: Float64Array;

  constructor(P: Float64Array, N: number, seed = 1) {
    this.N = N;
    this.P = P;
    this.Y = new Float64Array(2 * N);
    let s = seed >>> 0 || 1;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 2 * N; i++) this.Y[i] = 1e-2 * Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    this.gains = new Float64Array(2 * N).fill(1);
    this.upd = new Float64Array(2 * N);
    this.grad = new Float64Array(2 * N);
    this.num = new Float64Array(N * N);
    this.lr = Math.max(50, N / 4);
    this.kernel();
  }

  get exaggerating() {
    return this.exaggerate && this.iter < EXAGGERATION_ITERS;
  }

  private kernel() {
    const { N, Y, num } = this;
    let Z = 0;
    for (let i = 0; i < N; i++) {
      const xi = Y[2 * i], yi = Y[2 * i + 1];
      for (let j = i + 1; j < N; j++) {
        const dx = xi - Y[2 * j], dy = yi - Y[2 * j + 1];
        const v = 1 / (1 + dx * dx + dy * dy);
        num[i * N + j] = v;
        num[j * N + i] = v;
        Z += 2 * v;
      }
    }
    this.Z = Z;
  }

  kl() {
    const { N, P, num, Z } = this;
    let c = 0;
    for (let k = 0; k < N * N; k++) {
      const p = P[k];
      if (p > 1e-12) c += p * Math.log(p / Math.max(1e-12, num[k] / Z));
    }
    return c;
  }

  step() {
    const { N, P, Y, num, grad, gains, upd } = this;
    const ex = this.exaggerating ? EXAGGERATION : 1;
    const Z = this.Z;
    grad.fill(0);
    for (let i = 0; i < N; i++) {
      let gx = 0, gy = 0;
      const xi = Y[2 * i], yi = Y[2 * i + 1];
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const n = num[i * N + j];
        const m = (ex * P[i * N + j] - n / Z) * n;
        gx += m * (xi - Y[2 * j]);
        gy += m * (yi - Y[2 * j + 1]);
      }
      grad[2 * i] = 4 * gx;
      grad[2 * i + 1] = 4 * gy;
    }
    const mom = this.iter < EXAGGERATION_ITERS ? 0.5 : 0.8;
    let cx = 0, cy = 0;
    for (let k = 0; k < 2 * N; k++) {
      gains[k] = Math.sign(grad[k]) !== Math.sign(upd[k]) ? gains[k] + 0.2 : Math.max(0.01, gains[k] * 0.8);
      upd[k] = mom * upd[k] - this.lr * gains[k] * grad[k];
      Y[k] += upd[k];
      if (k % 2) cy += Y[k]; else cx += Y[k];
    }
    for (let i = 0; i < N; i++) { Y[2 * i] -= cx / N; Y[2 * i + 1] -= cy / N; }
    this.iter++;
    this.kernel();
    if (this.iter % 5 === 0 || this.iter === 1) this.history.push({ iter: this.iter, kl: this.kl() });
  }
}
