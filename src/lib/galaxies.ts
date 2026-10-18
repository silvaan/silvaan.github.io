// Spiral galaxies as clouds of glowing points, for the Cosmology sims: the
// Milky Way, Andromeda, Triangulum and the Large Magellanic Cloud. The shapes
// are models; the positions, tilts and brightnesses are measured.

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
    name: 'Milky Way',
    spec: {
      centre: GC, u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1],
      h: 3600, rMin: 1200, rMax: 18000, arms: 4, pitch: 18 * DEG, phase: 0.6,
      bulge: 0.1, barLen: 2000, barAngle: Math.PI + 27 * DEG, thick: 260,
      N: 70000, M: -20.9, seed: 7, hole: [0, 0, 0],
    },
  },
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

