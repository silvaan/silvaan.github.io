// The hot Big Bang in numbers, from the end of inflation to today: the scale
// factor, temperature and density against time, and the few milestones the
// big-bang sim shows (neutrons freezing out, helium forming, the fog of free
// electrons clearing, and the first stars ionizing the gas again).
//
// The expansion is integrated in ln a with Planck 2018 densities. In the
// radiation era the radiation density carries the number of relativistic
// species g*(T), and the temperature follows from entropy conservation, so
// T rises a little above T0/a after electrons and positrons annihilate.
// The nuclear and atomic histories are simple models tuned to the standard
// calculations (BBN codes, RECFAST); the sim says so where it shows them.

import { PLANCK18 } from './cosmology';

export const T0_K = 2.7255;
const K_PER_MEV = 1.160452e10;
const T0_MEV = T0_K / K_PER_MEV;
export const SEC_PER_YR = 3.15576e7;
const MPC_M = 3.0856776e22;
const G = 6.674e-11;
const H0_S = (PLANCK18.H0 * 1000) / MPC_M;

/** g* and g*s against log10(T / MeV): the Standard Model's relativistic species. */
const GSTAR: [number, number, number][] = [
  [-3, 3.363, 3.909],
  [-1.3, 3.4, 3.95],
  [-1.0, 4.4, 5.0],
  [-0.7, 7.0, 7.6],
  [-0.4, 9.6, 9.9],
  [0, 10.75, 10.75],
  [1.7, 10.75, 10.75],
  [2.0, 14.25, 14.25], // muons
  [2.17, 17.25, 17.25], // pions
  [2.3, 61.75, 61.75], // free quarks and gluons above the QCD transition
  [3.0, 72, 72],
  [4.0, 86.25, 86.25],
  [5.0, 96.25, 96.25],
  [5.3, 106.75, 106.75], // everything in the Standard Model
  [30, 106.75, 106.75],
];
function gstar(Tmev: number): [number, number] {
  const x = Math.log10(Tmev);
  if (x <= GSTAR[0][0]) return [GSTAR[0][1], GSTAR[0][2]];
  for (let i = 1; i < GSTAR.length; i++) {
    if (x <= GSTAR[i][0]) {
      const [x0, g0, s0] = GSTAR[i - 1], [x1, g1, s1] = GSTAR[i];
      const f = (x - x0) / (x1 - x0);
      return [g0 + f * (g1 - g0), s0 + f * (s1 - s0)];
    }
  }
  return [106.75, 106.75];
}

/** Photon temperature at scale factor a, MeV: g*s T³ a³ stays constant. */
function tempAt(a: number) {
  let T = T0_MEV / a;
  for (let i = 0; i < 6; i++) T = (T0_MEV / a) * Math.cbrt(3.909 / gstar(T)[1]);
  return T;
}

/** H in s⁻¹ at scale factor a. */
function hubble(a: number) {
  const T = tempAt(a);
  const rad = PLANCK18.Or * (gstar(T)[0] / 3.363) * (T / T0_MEV) ** 4;
  return H0_S * Math.sqrt(rad + PLANCK18.Om / a ** 3 + PLANCK18.OL);
}

// Inflation ends, and the hot universe begins, at this time and temperature.
export const T_INFLATION_START = 1e-36;
const T_REHEAT_MEV = Math.sqrt(2.42 / (Math.sqrt(106.75) * 1e-32));
/** e-folds of inflation: the box grows e^60 ≈ 10²⁶ times. */
const N_EFOLDS = 60;

// --- the table: ln a against log10 t -----------------------------------------
const lnA: number[] = [], logT: number[] = [], Tmev: number[] = [];
let aStart = 0;
{
  // a where the photons were as hot as reheating left them
  let lo = -80, hi = 0;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    if (tempAt(Math.exp(m)) > T_REHEAT_MEV) lo = m; else hi = m;
  }
  aStart = Math.exp(lo);
  let la = lo, t = 1 / (2 * hubble(aStart));
  const dl = 0.01;
  lnA.push(la); logT.push(Math.log10(t)); Tmev.push(tempAt(aStart));
  while (la < 0) {
    const step = Math.min(dl, -la);
    const f = (u: number) => 1 / hubble(Math.exp(u));
    t += (step / 6) * (f(la) + 4 * f(la + step / 2) + f(la + step));
    la += step;
    lnA.push(la); logT.push(Math.log10(t)); Tmev.push(tempAt(Math.exp(la)));
  }
}
/** End of inflation (start of the hot Big Bang), s. */
export const T_HOT_START = 10 ** logT[0];
/** The age of the universe today, s. */
export const T_NOW = 10 ** logT[logT.length - 1];
const H_INF = N_EFOLDS / (T_HOT_START - T_INFLATION_START);

function lookup(xs: number[], ys: number[], x: number) {
  const n = xs.length - 1;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n]) return ys[n];
  let lo = 0, hi = n;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (xs[m] <= x) lo = m; else hi = m;
  }
  const f = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return ys[lo] + f * (ys[hi] - ys[lo]);
}

/** Time at which the photons had temperature T (MeV), s. */
export function timeAtTemp(T: number) {
  // Tmev falls along the table
  return 10 ** lookup(Tmev.map((x) => -Math.log10(x)), logT, -Math.log10(T));
}

export type Moment = {
  t: number; // s
  a: number;
  z: number;
  /** Photon temperature in K, or null during inflation (no particles yet). */
  T: number | null;
  /** H in s⁻¹. */
  H: number;
  /** Total density, kg/m³. */
  rho: number;
  inflating: boolean;
};

export function moment(t: number): Moment {
  if (t < T_HOT_START) {
    const a = aStart * Math.exp(-H_INF * (T_HOT_START - t));
    // during inflation H is constant and the density is the inflaton's
    return { t, a, z: 1 / a - 1, T: null, H: H_INF, rho: (3 * H_INF * H_INF) / (8 * Math.PI * G), inflating: true };
  }
  const a = Math.exp(lookup(logT, lnA, Math.log10(t)));
  const H = hubble(a);
  return { t, a, z: 1 / a - 1, T: tempAt(a) * K_PER_MEV, H, rho: (3 * H * H) / (8 * Math.PI * G), inflating: false };
}

// --- matter: the growth of density contrasts ----------------------------------
// Linear growth D(a) ∝ E(a) ∫ da / (a E)³, normalised to 1 today. Exact for
// matter and Λ; in the radiation era it only says "hardly grows", which is
// what the sim needs.
const growLnA: number[] = [], growD: number[] = [];
{
  const E = (a: number) => hubble(a) / H0_S;
  let s = 0, la = Math.log(1e-8);
  const dl = 0.02;
  let prev = 1 / (Math.exp(la) * E(Math.exp(la))) ** 3 * Math.exp(la);
  growLnA.push(la); growD.push(0);
  while (la < 0) {
    la += dl;
    const a = Math.exp(la);
    const cur = (1 / (a * E(a)) ** 3) * a; // da = a dln a
    s += ((prev + cur) / 2) * dl;
    prev = cur;
    growLnA.push(la); growD.push(E(a) * s);
  }
  const d1 = growD[growD.length - 1];
  for (let i = 0; i < growD.length; i++) growD[i] /= d1;
}
export const growth = (a: number) => (a <= 1e-8 ? 0 : lookup(growLnA, growD, Math.log(a)));

// --- nuclei -------------------------------------------------------------------
const Q_MEV = 1.293; // neutron minus proton mass
const TAU_N = 879.4; // neutron lifetime, s
const T_FREEZE = 0.787; // weak reactions stop swapping n and p, MeV
const T_DEUT = 0.072; // deuterium stops being broken up as fast as it forms, MeV
export const T_NUCLEI = timeAtTemp(T_DEUT);
const FREEZE_X = 1 / (1 + Math.exp(Q_MEV / T_FREEZE));

export type Nuclei = {
  /** Mass fractions: free protons (hydrogen), free neutrons, helium-4. */
  H: number;
  n: number;
  He: number;
  /** Deuterium per hydrogen, by number. */
  D: number;
};

/** Light nuclei at time t (s): a model of the standard BBN results (Y_p ≈ 0.247, D/H ≈ 2.5×10⁻⁵). */
export function nuclei(t: number): Nuclei {
  const T = t < T_HOT_START ? Infinity : tempAt(moment(t).a);
  // neutrons: in equilibrium with protons, then frozen, then decaying
  const Xeq = 1 / (1 + Math.exp(Q_MEV / Math.max(T, T_FREEZE)));
  const X = (T > 200 ? 0.5 : Xeq) * Math.exp(-t / TAU_N);
  if (t < T_NUCLEI) {
    const lt = Math.log10(Math.max(t, 1));
    const lD = -13 + (11 * Math.max(0, lt)) / Math.log10(T_NUCLEI);
    return { H: 1 - X, n: X, He: 0, D: t < 1 ? 0 : 10 ** lD };
  }
  const Xc = FREEZE_X * Math.exp(-T_NUCLEI / TAU_N);
  const s = 1 - Math.exp(-(t - T_NUCLEI) / 45);
  const He = 2 * Xc * s;
  const n = Xc * (1 - s) * Math.exp(-(t - T_NUCLEI) / TAU_N);
  const lD = Math.log10(2.53e-5) + (-2.0 - Math.log10(2.53e-5)) * Math.exp(-(Math.log10(t) - Math.log10(T_NUCLEI)) / 0.22);
  return { H: 1 - He - n, n, He, D: 10 ** lD };
}

// --- free electrons: recombination, then reionization -------------------------
/** Hydrogen-ionized fraction from recombination alone, a fit to RECFAST. */
const xRecH = (z: number) => 0.5 * (1 + Math.tanh((z - 1270) / 110)) * (1 - 2.4e-4) + 2.4e-4;
/** Reionization as Planck fits it: a tanh in (1+z)^1.5 centred on z = 7.7. */
export function reionized(z: number) {
  const y = (1 + z) ** 1.5, yre = (1 + 7.7) ** 1.5, dy = 1.5 * Math.sqrt(1 + 7.7) * 0.5;
  return 0.5 * (1 + Math.tanh((yre - y) / dy));
}
/** Free electrons per hydrogen nucleus (helium adds up to 0.163 more). */
export function freeElectrons(z: number) {
  const He2 = 0.0815 * 0.5 * (1 + Math.tanh((z - 6000) / 300));
  const He1 = 0.0815 * 0.5 * (1 + Math.tanh((z - 2400) / 200));
  return Math.max(xRecH(z) + He1 + He2, reionized(z) * 1.08);
}

/** How far a photon gets between scatterings, in today's (comoving) Mpc. */
export function meanFreePath(z: number) {
  const nH0 = 0.1905; // hydrogen nuclei per m³ today
  const sigmaT = 6.6524587e-29;
  const lp = 1 / (freeElectrons(z) * nH0 * (1 + z) ** 3 * sigmaT); // proper, m
  return (lp * (1 + z)) / MPC_M;
}

/** Share of the matter that has made stars by redshift z, for the picture (rises after z ≈ 25). */
export function starShare(z: number) {
  const g = Math.max(0, Math.min(1, (Math.log10(26) - Math.log10(1 + z)) / (Math.log10(26) - Math.log10(1.6))));
  return 0.06 * g ** 1.4;
}
