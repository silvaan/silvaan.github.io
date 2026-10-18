// Initial conditions for a box of the universe: a Gaussian random field with
// the Planck 2018 power spectrum, and the Zel'dovich approximation to carry it
// forward. Each particle starts on a grid point q and moves along a fixed
// displacement ψ(q), scaled by the linear growth factor: x = q + D(t) ψ(q).
// It is exact while the contrasts are small and keeps the right sheets,
// filaments and voids later on; the field is smoothed a little so the late
// web stays crisp instead of overshooting.

import { PLANCK18 } from './cosmology';

/** In-place radix-2 FFT of n complex numbers spaced `stride` apart from `off`. */
function fft1(re: Float64Array, im: Float64Array, off: number, stride: number, n: number, inv: boolean, cos: Float64Array, sin: Float64Array) {
  // bit reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const a = off + i * stride, b = off + j * stride;
      let t = re[a]; re[a] = re[b]; re[b] = t;
      t = im[a]; im[a] = im[b]; im[b] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const step = n / len, half = len >> 1;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const wr = cos[k * step], wi = inv ? sin[k * step] : -sin[k * step];
        const a = off + (i + k) * stride, b = off + (i + k + half) * stride;
        const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
      }
    }
  }
}

/** 3D FFT of an n³ grid (x fastest); the inverse divides by n³. */
function fft3(re: Float64Array, im: Float64Array, n: number, inv: boolean) {
  const cos = new Float64Array(n), sin = new Float64Array(n);
  for (let i = 0; i < n; i++) { cos[i] = Math.cos((2 * Math.PI * i) / n); sin[i] = Math.sin((2 * Math.PI * i) / n); }
  const n2 = n * n;
  for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) fft1(re, im, z * n2 + y * n, 1, n, inv, cos, sin);
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) fft1(re, im, z * n2 + x, n, n, inv, cos, sin);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) fft1(re, im, y * n + x, n2, n, inv, cos, sin);
  if (inv) {
    const s = 1 / (n * n2);
    for (let i = 0; i < re.length; i++) { re[i] *= s; im[i] *= s; }
  }
}

/** Linear matter power spectrum today, Mpc³, k in 1/Mpc: BBKS transfer with Sugiyama's shape, σ8 = 0.811. */
function powerSpectrum() {
  const h = PLANCK18.H0 / 100, Om = PLANCK18.Om, Ob = 0.049, ns = 0.9665;
  const gamma = Om * h * Math.exp(-Ob - (Math.sqrt(2 * h) * Ob) / Om);
  const shape = (k: number) => {
    const q = k / h / gamma;
    const T = (Math.log(1 + 2.34 * q) / (2.34 * q)) * (1 + 3.89 * q + (16.1 * q) ** 2 + (5.46 * q) ** 3 + (6.71 * q) ** 4) ** -0.25;
    return k ** ns * T * T;
  };
  // normalise: σ² in spheres of 8/h Mpc
  const R = 8 / h;
  let s = 0;
  const n = 4000, l0 = Math.log(1e-5), l1 = Math.log(50);
  for (let i = 0; i <= n; i++) {
    const k = Math.exp(l0 + ((l1 - l0) * i) / n), x = k * R;
    const W = (3 * (Math.sin(x) - x * Math.cos(x))) / (x * x * x);
    s += k * k * k * shape(k) * W * W * (i === 0 || i === n ? 0.5 : 1);
  }
  s *= (l1 - l0) / n / (2 * Math.PI * Math.PI);
  const A = 0.811 ** 2 / s;
  return (k: number) => A * shape(k);
}

export type Box = {
  n: number;
  L: number; // Mpc, comoving
  /** Per particle: grid position q (Mpc, centred on 0), displacement ψ today (Mpc). */
  q: Float32Array;
  psi: Float32Array;
  /** The initial contrast at q, in units of its own spread. */
  delta: Float32Array;
  /** Where the particle's surroundings rank in density today, 0 (emptiest) to 1 (densest). */
  rank: Float32Array;
};

export function makeBox(n = 64, L = 150, seed = 20260101, smooth = 2.2): Box {
  const N = n * n * n, V = L * L * L;
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

  // white noise, to k-space, shaped by the spectrum
  const wr = new Float64Array(N), wi = new Float64Array(N);
  for (let i = 0; i < N; i++) wr[i] = gauss();
  fft3(wr, wi, n, false);
  const P = powerSpectrum();
  const kf = (2 * Math.PI) / L;
  const kk = (i: number) => (i <= n / 2 ? i : i - n) * kf;
  const dr = new Float64Array(N), di = new Float64Array(N);
  const comps = [0, 1, 2].map(() => [new Float64Array(N), new Float64Array(N)] as const);
  for (let z = 0; z < n; z++)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const i = z * n * n + y * n + x;
        const k = [kk(x), kk(y), kk(z)];
        const k2 = k[0] * k[0] + k[1] * k[1] + k[2] * k[2];
        if (k2 === 0) continue;
        const amp = Math.sqrt((N * P(Math.sqrt(k2))) / V) * Math.exp((-k2 * smooth * smooth) / 2);
        const re = wr[i] * amp, im = wi[i] * amp;
        dr[i] = re; di[i] = im;
        // ψ = i k δ / k², so ∇·ψ = −δ
        for (let c = 0; c < 3; c++) {
          comps[c][0][i] = (-k[c] / k2) * im;
          comps[c][1][i] = (k[c] / k2) * re;
        }
      }
  fft3(dr, di, n, true);
  for (const [r, i] of comps) fft3(r, i, n, true);

  const q = new Float32Array(N * 3), psi = new Float32Array(N * 3), delta = new Float32Array(N);
  let var_ = 0;
  for (let i = 0; i < N; i++) var_ += dr[i] * dr[i];
  const sd = Math.sqrt(var_ / N);
  const cell = L / n;
  for (let z = 0; z < n; z++)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const i = z * n * n + y * n + x;
        q[i * 3] = (x + 0.5) * cell - L / 2;
        q[i * 3 + 1] = (y + 0.5) * cell - L / 2;
        q[i * 3 + 2] = (z + 0.5) * cell - L / 2;
        for (let c = 0; c < 3; c++) psi[i * 3 + c] = comps[c][0][i];
        delta[i] = dr[i] / sd;
      }

  // density today: particles counted onto the grid, smoothed, read back
  const wrap = (v: number) => ((v % n) + n) % n;
  const rho = new Float64Array(N);
  const pos = (i: number, c: number) => (q[i * 3 + c] + psi[i * 3 + c] + L / 2) / cell;
  for (let i = 0; i < N; i++) {
    const gx = Math.floor(pos(i, 0)), gy = Math.floor(pos(i, 1)), gz = Math.floor(pos(i, 2));
    rho[wrap(gz) * n * n + wrap(gy) * n + wrap(gx)]++;
  }
  // two passes of a 3×3×3 box blur
  for (let pass = 0; pass < 2; pass++) {
    const src = rho.slice();
    for (let z = 0; z < n; z++)
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          let sum = 0;
          for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
            sum += src[wrap(z + dz) * n * n + wrap(y + dy) * n + wrap(x + dx)];
          rho[z * n * n + y * n + x] = sum / 27;
        }
  }
  const d = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const gx = Math.floor(pos(i, 0)), gy = Math.floor(pos(i, 1)), gz = Math.floor(pos(i, 2));
    d[i] = rho[wrap(gz) * n * n + wrap(gy) * n + wrap(gx)] + rnd() * 1e-3;
  }
  const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => d[a] - d[b]);
  const rank = new Float32Array(N);
  order.forEach((p, r) => { rank[p] = r / (N - 1); });
  return { n, L, q, psi, delta, rank };
}
