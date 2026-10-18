// Shared pieces of the Cosmology sims: the catalogue files built by
// scripts/build-cosmos-data.mjs, the turn from equatorial to galactic axes,
// star colours, and distances printed in the unit a reader thinks in.
//
// Every sim works in galactic Cartesian axes with the Sun at the origin: x
// towards the galactic centre, y along the rotation, z to the north galactic
// pole, so the Milky Way's disk lies flat.

import type { M3, V3 } from './gl3d';
import { mulM3 } from './gl3d';

export const LY_PER_PC = 3.261563777;
export const AU_PER_PC = 206264.806;
export const KM_PER_AU = 1.495978707e8;
export const PC_PER_MPC = 1e6;
/** Sun to the galactic centre, pc (GRAVITY 2019). */
export const R_GC = 8178;

/** Equatorial J2000 to galactic, as rows. */
export const EQ_TO_GAL: M3 = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762],
];

/** Ecliptic J2000 to equatorial: a turn about x by the obliquity. */
const EPS = (23.4392911 * Math.PI) / 180;
export const ECL_TO_EQ: M3 = [
  [1, 0, 0],
  [0, Math.cos(EPS), -Math.sin(EPS)],
  [0, Math.sin(EPS), Math.cos(EPS)],
];

export const radec = (raDeg: number, decDeg: number, d: number): V3 => {
  const a = (raDeg * Math.PI) / 180, b = (decDeg * Math.PI) / 180;
  return mulM3(EQ_TO_GAL, [d * Math.cos(b) * Math.cos(a), d * Math.cos(b) * Math.sin(a), d * Math.sin(b)]);
};

const BASE = '/data/cosmos/';

/** A packed catalogue: count, floats per row, then rows whose first three floats are an equatorial position. */
async function loadBin(name: string) {
  const buf = await (await fetch(BASE + name)).arrayBuffer();
  const head = new Uint32Array(buf, 0, 2);
  const rows = new Float32Array(buf, 8, head[0] * head[1]);
  const [n, stride] = [head[0], head[1]];
  // rotate into galactic axes in place
  const m = EQ_TO_GAL;
  for (let i = 0; i < n; i++) {
    const o = i * stride, x = rows[o], y = rows[o + 1], z = rows[o + 2];
    rows[o] = m[0][0] * x + m[0][1] * y + m[0][2] * z;
    rows[o + 1] = m[1][0] * x + m[1][1] * y + m[1][2] * z;
    rows[o + 2] = m[2][0] * x + m[2][1] * y + m[2][2] * z;
  }
  return { n, stride, rows };
}
export type Catalogue = Awaited<ReturnType<typeof loadBin>>;

const json = async <T>(name: string): Promise<T> => (await fetch(BASE + name)).json();

/** HYG stars: x, y, z (pc), absolute V magnitude, B−V colour index. */
export const loadStars = () => loadBin('stars.bin');
export type NamedStar = { n: string; i: number; d: number; m: number; s: string };
export const loadStarNames = () => json<NamedStar[]>('stars.json');

/** 2MRS galaxies: x, y, z (Mpc), absolute K magnitude, 1 if early type. */
export const loadGalaxies = () => loadBin('galaxies.bin');
export type NamedGalaxy = { n: string; i: number; z: number };
export const loadGalaxyNames = () => json<NamedGalaxy[]>('galaxies.json');

/** SDSS DR16 quasars: x, y, z (comoving Mpc), redshift. */
export const loadQuasars = () => loadBin('quasars.bin');

/**
 * The cosmic web: SDSS and 6dFGS redshift-survey galaxies, ~900k of them,
 * quantised to Int16 to keep the file small. Rows: x, y, z (comoving Mpc,
 * galactic), absolute r or K magnitude.
 */
export async function loadWeb() {
  const buf = await (await fetch(BASE + 'web.bin')).arrayBuffer();
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true), scale = dv.getFloat32(4, true);
  const q = new Int16Array(buf, 12, n * 4);
  const rows = new Float32Array(n * 4);
  const m = EQ_TO_GAL;
  for (let i = 0; i < n; i++) {
    const o = i * 4, x = q[o] * scale, y = q[o + 1] * scale, z = q[o + 2] * scale;
    rows[o] = m[0][0] * x + m[0][1] * y + m[0][2] * z;
    rows[o + 1] = m[1][0] * x + m[1][1] * y + m[1][2] * z;
    rows[o + 2] = m[2][0] * x + m[2][1] * y + m[2][2] * z;
    rows[o + 3] = q[o + 3] / 100;
  }
  return { n, stride: 4, rows };
}

export type LocalGalaxy = { n: string; t: string; p: V3; d: number; M: number | null; r: number | null };
/** McConnachie (2012): positions turned galactic, still Mpc. */
export async function loadLocalGroup() {
  const list = await json<LocalGalaxy[]>('local-group.json');
  for (const g of list) g.p = mulM3(EQ_TO_GAL, g.p);
  return list;
}

export const CMB_URL = BASE + 'cmb.jpg';

/**
 * Colour of a star from its B−V index: temperature by Ballesteros (2012),
 * then a fit to the blackbody colour. Returns linear-ish RGB in 0..1.
 */
export function starRGB(bv: number): [number, number, number] {
  const b = Math.max(-0.4, Math.min(2, bv));
  const T = 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62));
  const t = T / 100;
  let r: number, g: number, bl: number;
  if (t <= 66) {
    r = 255;
    g = 99.47 * Math.log(t) - 161.12;
    bl = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  } else {
    r = 329.7 * Math.pow(t - 60, -0.1332);
    g = 288.12 * Math.pow(t - 60, -0.0755);
    bl = 255;
  }
  const c = (v: number) => Math.max(0, Math.min(255, v)) / 255;
  return [c(r), c(g), c(bl)];
}

/** GLSL twin of starRGB, for shaders that shift the colour index. */
export const GLSL_STAR_RGB = `
vec3 tempRGB(float T) {
  float t = T / 100.0;
  vec3 c;
  if (t <= 66.0) {
    c.r = 255.0;
    c.g = 99.47 * log(t) - 161.12;
    c.b = t <= 19.0 ? 0.0 : 138.52 * log(t - 10.0) - 305.04;
  } else {
    c.r = 329.7 * pow(t - 60.0, -0.1332);
    c.g = 288.12 * pow(t - 60.0, -0.0755);
    c.b = 255.0;
  }
  return clamp(c / 255.0, 0.0, 1.0);
}
float bvTemp(float bv) {
  float b = clamp(bv, -0.4, 2.0);
  return 4600.0 * (1.0 / (0.92 * b + 1.7) + 1.0 / (0.92 * b + 0.62));
}
`;

const sig = (v: number, n = 3) => {
  if (v >= 100) return Math.round(v).toLocaleString('en-US');
  return (+v.toPrecision(n)).toString();
};

/** A distance in parsecs, printed in km, AU or light-years as fits. */
export function fmtDist(pc: number) {
  const ly = pc * LY_PER_PC;
  const au = pc * AU_PER_PC;
  if (au < 0.01) return `${sig(au * KM_PER_AU)} km`;
  if (ly < 0.05) return `${sig(au)} AU`;
  if (ly < 1e4) return `${sig(ly)} ly`;
  if (ly < 1e6) return `${sig(ly / 1e3)} thousand ly`;
  if (ly < 1e9) return `${sig(ly / 1e6)} million ly`;
  return `${sig(ly / 1e9)} billion ly`;
}

/** How long light takes over a distance in parsecs. */
export function fmtLightTime(pc: number) {
  const s = (pc * AU_PER_PC * KM_PER_AU) / 299792.458;
  if (s < 120) return `${sig(s)} s`;
  if (s < 7200) return `${sig(s / 60)} min`;
  if (s < 172800) return `${sig(s / 3600)} h`;
  const yr = s / 3.15576e7;
  if (yr < 1) return `${sig(s / 86400)} days`;
  return fmtYears(yr);
}

export function fmtYears(yr: number) {
  if (yr < 1e4) return `${sig(yr)} years`;
  if (yr < 1e6) return `${sig(yr / 1e3)} thousand years`;
  if (yr < 1e9) return `${sig(yr / 1e6)} million years`;
  return `${sig(yr / 1e9)} billion years`;
}
