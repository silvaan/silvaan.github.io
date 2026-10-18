// Spiral galaxies as clouds of glowing points, for the Cosmology sims: the
// Milky Way, Andromeda, Triangulum and the Large Magellanic Cloud. The shapes
// are models; the positions, tilts and brightnesses are measured. The Milky
// Way's arms follow the maser parallaxes of Reid et al. (2019).

import { v3, mulM3, type V3 } from './gl3d';
import { EQ_TO_GAL, R_GC } from './cosmos';

const DEG = Math.PI / 180;
const lum = (M: number) => Math.pow(10, -0.4 * M);
/** The galactic centre, galactic axes, pc. */
export const GC: V3 = [R_GC, 0, 20.8];

/**
 * A disk of clouds, each a row of `out`: position (pc), radius (pc),
 * luminosity (relative to M_V = 0), RGB. Seeded, so it is the same on every
 * visit; a few thousand clouds keep a galaxy's shape when you fly up to it.
 */
export type DiskSpec = {
  centre: V3; u: V3; v: V3; n: V3; // the disk's axes, galactic
  h: number; rMin: number; rMax: number; // exponential scale length and cut-offs, pc
  arms: number; pitch: number; phase: number;
  bulge: number; barLen: number; barAngle: number; thick: number;
  N: number; M: number; seed: number;
  hole?: V3; // leave out clouds near this point (the Sun's own neighbourhood)
};
export function diskGalaxy(g: DiskSpec, out: number[]) {
  let seed = g.seed;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const Lc = lum(g.M) / g.N;
  let n = 0;
  while (n < g.N) {
    let x: number, y: number, z: number, col: [number, number, number], size: number;
    if (rnd() < g.bulge) {
      // bulge and bar: old stars, yellow
      const along = gauss() * (g.barLen || g.h * 0.35), across = gauss() * g.h * 0.25;
      const c = Math.cos(g.barAngle), sn = Math.sin(g.barAngle);
      x = along * c - across * sn;
      y = along * sn + across * c;
      z = gauss() * g.h * 0.17;
      col = [1.0, 0.82, 0.55];
      size = g.h * 0.09;
    } else {
      const R = -g.h * Math.log(rnd() * 0.995 + 0.002);
      if (R > g.rMax || R < g.rMin) continue;
      const onArm = g.arms > 0 && rnd() < 0.68;
      const psi = onArm
        ? g.phase + (Math.floor(rnd() * g.arms) * 2 * Math.PI) / g.arms + Math.log(R / g.h) / Math.tan(g.pitch) + gauss() * 0.17
        : rnd() * 2 * Math.PI;
      x = R * Math.cos(psi);
      y = R * Math.sin(psi);
      z = gauss() * g.thick * (onArm ? 0.5 : 1);
      const young = onArm && rnd() < 0.55;
      col = young ? [0.62, 0.72, 1.0] : [1.0, 0.9, 0.75];
      if (onArm && rnd() < 0.04) col = [1.0, 0.45, 0.6]; // gas lit by new stars
      size = g.h * (onArm ? 0.06 : 0.08);
    }
    const p = v3.add(g.centre, v3.add(v3.add(v3.mul(g.u, x), v3.mul(g.v, y)), v3.mul(g.n, z)));
    if (g.hole && v3.len(v3.sub(p, g.hole)) < 600) continue;
    out.push(...p, size, Lc, ...col);
    n++;
  }
}

/**
 * Axes of a disk we see at (ra, dec), tilted by inclination i with its
 * major axis at position angle pa (from north through east), all in degrees.
 */
export function skyDisk(ra: number, dec: number, d: number, i: number, pa: number) {
  const a = ra * DEG, b = dec * DEG;
  const los: V3 = [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)];
  const east: V3 = [-Math.sin(a), Math.cos(a), 0];
  const north: V3 = [-Math.sin(b) * Math.cos(a), -Math.sin(b) * Math.sin(a), Math.cos(b)];
  const major = v3.add(v3.mul(north, Math.cos(pa * DEG)), v3.mul(east, Math.sin(pa * DEG)));
  const minorSky = v3.cross(los, major);
  const n = v3.add(v3.mul(los, Math.cos(i * DEG)), v3.mul(minorSky, Math.sin(i * DEG)));
  const g = (v: V3) => mulM3(EQ_TO_GAL, v);
  return { centre: g(v3.mul(los, d)), u: g(major), v: g(v3.unit(v3.cross(n, major))), n: g(n) };
}

/** The galaxies we draw as disks, with the catalogue name each replaces. */
export const DISKS: { name: string; spec: DiskSpec }[] = [
  {
    // Andromeda: i = 77°, PA = 38° (de Vaucouleurs), 785 kpc
    name: 'Andromeda',
    spec: {
      ...skyDisk(10.6847, 41.2690, 785000, 77, 38),
      h: 5300, rMin: 600, rMax: 26000, arms: 2, pitch: 10 * DEG, phase: 1.2,
      bulge: 0.2, barLen: 0, barAngle: 0, thick: 350,
      N: 26000, M: -21.5, seed: 31,
    },
  },
  {
    // Triangulum: i = 54°, PA = 23°, 840 kpc
    name: 'Triangulum',
    spec: {
      ...skyDisk(23.4621, 30.6599, 840000, 54, 23),
      h: 1400, rMin: 150, rMax: 8500, arms: 2, pitch: 22 * DEG, phase: 0.3,
      bulge: 0.05, barLen: 0, barAngle: 0, thick: 150,
      N: 9000, M: -18.8, seed: 53,
    },
  },
  {
    // Large Magellanic Cloud: i = 35°, PA = 150°, 50 kpc, one stubby arm and an off-centre bar
    name: 'LMC',
    spec: {
      ...skyDisk(80.8942, -69.7561, 50000, 35, 150),
      h: 1500, rMin: 100, rMax: 5500, arms: 1, pitch: 25 * DEG, phase: 2,
      bulge: 0.18, barLen: 1200, barAngle: 0.4, thick: 300,
      N: 7000, M: -18.1, seed: 71,
    },
  },
];


/**
 * The spiral arms as Reid et al. (2019, ApJ 885, 131) fit them to the
 * parallaxes of masers in star-forming regions: log spirals
 * ln(R / R_k) = −(β − β_k) tan ψ, with a different pitch ψ either side of a
 * kink at (R_k, β_k). β is the galactocentric azimuth, 0 towards the Sun and
 * growing in the direction of rotation. Beyond the stretch the masers cover,
 * each arm is continued at the same pitch, as the usual maps draw them.
 */
const ARMS: { name: string; Rk: number; bk: number; p1: number; p2: number; b0: number; b1: number; w: number; weight: number }[] = [
  { name: 'Scutum–Centaurus', Rk: 4910, bk: 23, p1: 14.1, p2: 12.1, b0: -235, b1: 60, w: 420, weight: 1.0 },
  { name: 'Perseus', Rk: 8870, bk: 40, p1: 10.3, p2: 8.7, b0: -125, b1: 285, w: 380, weight: 1.0 },
  { name: 'Sagittarius–Carina', Rk: 6040, bk: 24, p1: 17.1, p2: 1.0, b0: -105, b1: 95, w: 260, weight: 0.55 },
  { name: 'Norma–Outer', Rk: 12240, bk: 18, p1: 3.0, p2: 9.4, b0: -60, b1: 350, w: 400, weight: 0.55 },
  { name: 'Local (Orion Spur)', Rk: 8260, bk: 9, p1: 11.4, p2: 11.4, b0: -25, b1: 35, w: 310, weight: 0.3 },
];
export const ARM_NAMES = ARMS.map((a) => a.name);

/** Galactocentric (R, β) in pc and radians to galactic coordinates with the Sun at the origin. */
const fromGC = (R: number, beta: number, z: number): V3 => [GC[0] - R * Math.cos(beta), GC[1] + R * Math.sin(beta), GC[2] + z];

/** A point on an arm's centre line at azimuth β (degrees). */
export function armPoint(i: number, betaDeg: number): V3 {
  const a = ARMS[i];
  const psi = (betaDeg < a.bk ? a.p1 : a.p2) * DEG;
  const R = a.Rk * Math.exp(-(betaDeg - a.bk) * DEG * Math.tan(psi));
  return fromGC(R, betaDeg * DEG, 0);
}

/**
 * The Milky Way as points. `light` gets rows of position, radius, luminosity
 * and RGB like diskGalaxy; `dust` gets clouds that absorb (RGB is how much
 * of each colour they take out, blue most). The pieces:
 *   a long bar (half-length 5 kpc, 30° from the Sun–centre line, near end at
 *   positive longitudes) round a boxy bulge, both old and yellow;
 *   an exponential disk of old stars (scale length 2.6 kpc, 300 pc thick);
 *   the arms, lit by young blue stars and pink nebulae, with dust lanes along
 *   their inner edges; the Sun's own 600 pc is left to the real stars.
 */
export function milkyWay(light: number[], dust: number[]) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const M_TOTAL = -20.9;
  const N_BAR = 45000, N_DISK = 90000, N_ARM = 120000, N_HII = 5000, N_DUST = 60000;
  const Lc = lum(M_TOTAL) / (N_BAR + N_DISK + N_ARM);
  const near = (p: V3) => Math.hypot(p[0], p[1], p[2]) < 600;
  const put = (p: V3, size: number, L: number, c: [number, number, number]) => {
    if (!near(p)) light.push(...p, size, L, ...c);
  };

  // bar and bulge: positions in the bar's own frame, then turned
  const barDir = 30 * DEG; // from the centre towards the near end, as a β
  for (let i = 0; i < N_BAR; i++) {
    const boxy = rnd() < 0.45;
    const along = boxy ? gauss() * 900 : (rnd() * 2 - 1) * 5000 * Math.sqrt(rnd());
    const across = gauss() * (boxy ? 800 : 420);
    const z = gauss() * (boxy ? 650 * (1 - Math.min(1, Math.abs(along) / 2500)) + 120 : 180);
    const b = barDir, c = Math.cos(b), s = Math.sin(b);
    // the bar's axis in the plane, measured like β from the Sun line
    const x = along * c - across * s, y = along * s + across * c;
    put([GC[0] - x, GC[1] + y, GC[2] + z], 140, Lc * 1.25, [1.0, 0.78, 0.5]);
  }
  // the old disk
  for (let i = 0; i < N_DISK; i++) {
    const R = -2600 * Math.log(rnd() * 0.997 + 0.001);
    if (R > 16000 || R < 2000) { i--; continue; }
    const beta = rnd() * 2 * Math.PI;
    put(fromGC(R, beta, gauss() * 300), 200, Lc, [1.0, 0.86, 0.68]);
  }
  // the arms
  const totalW = ARMS.reduce((s, a) => s + a.weight * (a.b1 - a.b0), 0);
  for (let i = 0; i < N_ARM + N_HII + N_DUST; i++) {
    // pick an arm in proportion to its length and weight, then a place along it
    let r = rnd() * totalW, k = 0;
    while (r > ARMS[k].weight * (ARMS[k].b1 - ARMS[k].b0)) { r -= ARMS[k].weight * (ARMS[k].b1 - ARMS[k].b0); k++; }
    const a = ARMS[k];
    const bdeg = a.b0 + rnd() * (a.b1 - a.b0);
    const psi = (bdeg < a.bk ? a.p1 : a.p2) * DEG;
    const R0 = a.Rk * Math.exp(-(bdeg - a.bk) * DEG * Math.tan(psi));
    if (R0 > 17000 || R0 < 3000) continue;
    // arms widen outwards, as Reid's widths do
    const w = a.w * (R0 / 8150) ** 0.6;
    if (i < N_ARM) {
      const R = R0 + gauss() * w;
      const young = rnd() < 0.6;
      put(fromGC(R, bdeg * DEG, gauss() * (young ? 90 : 200)), 110, Lc * (young ? 1.6 : 1), young ? [0.6, 0.72, 1.0] : [1.0, 0.9, 0.78]);
    } else if (i < N_ARM + N_HII) {
      // pink nebulae, clumped
      const R = R0 + gauss() * w * 0.6;
      const p = fromGC(R, bdeg * DEG, gauss() * 50);
      for (let j = 0; j < 3; j++) put([p[0] + gauss() * 60, p[1] + gauss() * 60, p[2] + gauss() * 30], 60, Lc * 2.2, [1.0, 0.42, 0.62]);
    } else {
      // dust on the inner side of the arm, where the gas is compressed
      const R = R0 - w * 0.6 + gauss() * w * 0.45;
      const p = fromGC(R, bdeg * DEG, gauss() * 60);
      if (!near(p)) dust.push(...p, 180, 0, 0.55, 0.65, 0.8);
    }
  }
  // a little dust everywhere in the inner disk too
  for (let i = 0; i < 15000; i++) {
    const R = -3000 * Math.log(rnd() * 0.99 + 0.005);
    if (R > 12000 || R < 1500) continue;
    const p = fromGC(R, rnd() * 2 * Math.PI, gauss() * 70);
    if (!near(p)) dust.push(...p, 220, 0, 0.35, 0.42, 0.55);
  }
}
