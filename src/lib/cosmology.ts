// The Friedmann universe, numerically: the expansion rate for given densities,
// the scale factor through time, and the distances and horizons that follow.
// Distances in Mpc, times in Gyr, H0 in km/s/Mpc; the scale factor a is 1 today.

export type Cosmo = { H0: number; Om: number; OL: number; Or: number };

/** Planck 2018 (TT,TE,EE+lowE+lensing+BAO). */
export const PLANCK18: Cosmo = { H0: 67.66, Om: 0.3111, OL: 0.6888, Or: 9.1e-5 };

export const C_KMS = 299792.458;
export const GLY_PER_MPC = 3.261563777e-3;

export const Ok = (c: Cosmo) => 1 - c.Om - c.OL - c.Or;
/** c / H0 in Mpc. */
export const hubbleDist = (c: Cosmo) => C_KMS / c.H0;
/** 1 / H0 in Gyr. */
export const hubbleTime = (c: Cosmo) => 977.792 / c.H0;

/** H(a) / H0; NaN where the universe never reaches a (E² < 0). */
export function E(c: Cosmo, a: number) {
  const e2 = c.Or / a ** 4 + c.Om / a ** 3 + Ok(c) / a ** 2 + c.OL;
  return e2 >= 0 ? Math.sqrt(e2) : NaN;
}

/** Simpson's rule on [lo, hi] with n (even) panels. */
function simpson(f: (x: number) => number, lo: number, hi: number, n = 400) {
  if (hi === lo) return 0;
  const h = (hi - lo) / n;
  let s = f(lo) + f(hi);
  for (let i = 1; i < n; i++) s += f(lo + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/** a² E(a), finite at a = 0 whenever there is radiation or matter. */
const a2E = (c: Cosmo, a: number) => Math.sqrt(Math.max(0, c.Or + c.Om * a + Ok(c) * a * a + c.OL * a ** 4));

/** Cosmic time at scale factor a, Gyr (substituting a = s² keeps the start smooth). */
export function age(c: Cosmo, a = 1) {
  return hubbleTime(c) * simpson((s) => (s === 0 ? 0 : (2 * s * s * s) / a2E(c, s * s)), 0, Math.sqrt(a));
}

/** Comoving distance from scale factor a1 to a2 (a1 < a2) along a light ray, Mpc. */
export function conformal(c: Cosmo, a1: number, a2: number, n = 400) {
  return hubbleDist(c) * simpson((a) => 1 / a2E(c, a), a1, a2, n);
}

/** Comoving distance today to redshift z, Mpc. */
export const comoving = (c: Cosmo, z: number) => conformal(c, 1 / (1 + z), 1);

/** Particle horizon at a: how far, in today's comoving Mpc, light has come since the start. */
export const particleHorizon = (c: Cosmo, a = 1) => conformal(c, 0, a, 800);

/**
 * Event horizon at a: the comoving distance light sent at a will ever cover,
 * Infinity without a cosmological constant. Substituting x = 1/a makes the
 * range finite.
 */
export function eventHorizon(c: Cosmo, a = 1) {
  if (c.OL <= 0) return Infinity;
  const f = (x: number) => 1 / Math.sqrt(Math.max(1e-12, c.Or * x ** 4 + c.Om * x ** 3 + Ok(c) * x * x + c.OL));
  return hubbleDist(c) * simpson(f, 0, 1 / a, 800);
}

/** Hubble radius c / H(a) in proper Mpc. */
export const hubbleRadius = (c: Cosmo, a = 1) => hubbleDist(c) / E(c, a);

export type History = { t: number[]; a: number[]; H: number[]; tNow: number; fate: 'expands' | 'recollapses' };

/**
 * a(t) from just after the start until tEnd (Gyr). Time is the integral of
 * da / (a H) on a fine grid in log a, which stays accurate through the
 * radiation era. A closed universe stops growing where H reaches zero and
 * then runs the same history backwards into a crunch. `H` is H(t)/H0 with
 * its sign, negative while collapsing.
 */
export function history(c: Cosmo, tEnd: number): History {
  const tH = hubbleTime(c);
  const e2 = (a: number) => c.Or / a ** 4 + c.Om / a ** 3 + Ok(c) / a ** 2 + c.OL;
  const T: number[] = [], A: number[] = [], HH: number[] = [];
  let a = 1e-5, t = age(c, a);
  const dl = 0.004; // step in ln a
  let fate: History['fate'] = 'expands';
  T.push(t); A.push(a); HH.push(Math.sqrt(e2(a)));
  while (t < tEnd) {
    const next = a * Math.exp(dl);
    if (e2(next) <= 0) {
      // turnaround: find the largest a with E² > 0, then mirror what came before
      let lo = a, hi = next;
      for (let i = 0; i < 60; i++) {
        const m = (lo + hi) / 2;
        if (e2(m) > 0) lo = m; else hi = m;
      }
      // near the top E ~ sqrt(a_max − a), so integrate in s = sqrt(a_max − a)
      const top = lo, s0 = Math.sqrt(top - a);
      const dt = 2 * tH * simpson((s) => s / (Math.max(1e-300, (top - s * s) * Math.sqrt(Math.max(1e-300, e2(top - s * s))))), 0, s0, 64);
      const tTop = t + dt;
      T.push(tTop); A.push(top); HH.push(0);
      const n = T.length - 1;
      for (let i = n - 1; i >= 0 && 2 * tTop - T[i] <= tEnd * 2; i--) {
        T.push(2 * tTop - T[i]); A.push(A[i]); HH.push(-HH[i]);
      }
      fate = 'recollapses';
      break;
    }
    // Simpson in u = ln a: dt = da / (a H) = du / H
    const f = (u: number) => 1 / Math.sqrt(e2(Math.exp(u)));
    const u0 = Math.log(a);
    t += tH * (dl / 6) * (f(u0) + 4 * f(u0 + dl / 2) + f(u0 + dl));
    a = next;
    T.push(t); A.push(a); HH.push(Math.sqrt(e2(a)));
  }
  // today is where the expanding branch passes a = 1
  const top = A.indexOf(Math.max(...A));
  const tNow = A[top] >= 1 ? interp(A.slice(0, top + 1), T.slice(0, top + 1), 1) : NaN;
  return { t: T, a: A, H: HH, tNow, fate };
}

/** Linear interpolation into a monotone table. */
export function interp(xs: number[], ys: number[], x: number) {
  if (x <= xs[0]) return ys[0];
  const n = xs.length - 1;
  if (x >= xs[n]) return ys[n];
  let lo = 0, hi = n;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (xs[m] <= x) lo = m; else hi = m;
  }
  const f = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return ys[lo] + f * (ys[hi] - ys[lo]);
}
