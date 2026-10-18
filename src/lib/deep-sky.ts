// Nebulae, star clusters and black holes for the WebGL Cosmology sims. The
// positions and sizes are measured; the looks are procedural, drawn to match
// how these objects appear in deep photographs: emission nebulae pink with
// hydrogen-alpha and teal with oxygen near their hot stars, planetary nebulae
// as glowing shells, supernova remnants as tangled filaments, clusters as
// swarms of stars, and black holes as a shadow ringed by their accretion disk.

import { compile, v3, type View, type V3 } from './gl3d';
import { radec, PC_PER_MPC } from './cosmos';
import { GC } from './galaxies';

export type DeepKind = 'hii' | 'pn' | 'snr' | 'pwn' | 'open' | 'globular' | 'bh';
export type DeepObject = {
  name: string;
  kind: DeepKind;
  pos: V3; // galactic, pc
  /** Radius, pc; for a black hole, the size its picture is drawn at once it is close. */
  r: number;
  info: string;
  c1: [number, number, number];
  c2: [number, number, number];
  /** How bright it is drawn, 1 for the showpieces of deep photographs. */
  b: number;
};
/** The faint ones, which need long exposures even in big telescopes. */
const FAINT: Record<string, number> = {
  'Vela Supernova Remnant': 0.22, 'Veil Nebula': 0.45, 'Cassiopeia A': 0.6, 'Rosette Nebula': 0.6,
  'Heart Nebula': 0.5, 'North America Nebula': 0.55, 'Helix Nebula': 0.6,
};

const HA: [number, number, number] = [1.0, 0.3, 0.45];
const OIII: [number, number, number] = [0.3, 0.85, 0.85];
const BLUE: [number, number, number] = [0.6, 0.75, 1.0];
const WARM: [number, number, number] = [1.0, 0.86, 0.62];
const NONE: [number, number, number] = [0, 0, 0];

// name, kind, RA, Dec (degrees), distance (pc), radius (pc), note, colours
const LIST: [string, DeepKind, number, number, number, number, string, [number, number, number]?, [number, number, number]?][] = [
  ['Orion Nebula (M42)', 'hii', 83.822, -5.391, 412, 3.7, 'the nearest large star nursery, lit by the Trapezium stars', HA, OIII],
  ['Eagle Nebula (M16)', 'hii', 274.7, -13.807, 1740, 9, 'home of the Pillars of Creation', [1.0, 0.42, 0.4], [0.45, 0.8, 0.75]],
  ['Lagoon Nebula (M8)', 'hii', 270.904, -24.387, 1250, 13, 'a star-forming cloud 110 light-years long', HA, [0.5, 0.7, 1.0]],
  ['Trifid Nebula (M20)', 'hii', 270.675, -22.971, 1260, 6, 'red emission split by dark lanes beside a blue reflection nebula', HA, [0.45, 0.6, 1.0]],
  ['Omega Nebula (M17)', 'hii', 275.196, -16.171, 1680, 6, 'one of the brightest star-forming regions in the Galaxy', HA, OIII],
  ['Carina Nebula', 'hii', 161.265, -59.867, 2300, 35, 'a giant nebula round Eta Carinae, a star that may soon explode', [1.0, 0.38, 0.35], [0.5, 0.75, 1.0]],
  ['Rosette Nebula', 'hii', 97.98, 4.94, 1600, 20, 'a ring of glowing hydrogen hollowed out by its central cluster', [1.0, 0.3, 0.38], [0.9, 0.5, 0.5]],
  ['North America Nebula', 'hii', 314.75, 44.33, 795, 15, 'shaped like the continent, behind a dark dust cloud', HA, [0.7, 0.5, 0.6]],
  ['Heart Nebula', 'hii', 38.2, 61.45, 2300, 25, 'an emission nebula carved by the cluster Melotte 15', [1.0, 0.33, 0.42], [0.9, 0.45, 0.5]],
  ['Tarantula Nebula', 'hii', 84.676, -69.101, 49970, 100, 'the most active star-forming region in the Local Group, in the LMC', HA, OIII],
  ['Ring Nebula (M57)', 'pn', 283.396, 33.029, 787, 0.2, 'gas shed by a dying Sun-like star, 1.3 light-years across', [1.0, 0.35, 0.3], [0.3, 0.9, 0.75]],
  ['Helix Nebula', 'pn', 337.411, -20.837, 200, 0.45, 'the nearest bright planetary nebula, the “Eye of God”', [1.0, 0.35, 0.3], [0.35, 0.75, 1.0]],
  ['Dumbbell Nebula (M27)', 'pn', 299.902, 22.721, 405, 0.5, 'the first planetary nebula ever found, in 1764', [1.0, 0.4, 0.35], [0.35, 0.85, 0.9]],
  ['Cat’s Eye Nebula', 'pn', 269.639, 66.633, 1000, 0.12, 'nested shells blown by a dying star', [1.0, 0.45, 0.35], [0.35, 0.9, 0.8]],
  ['Crab Nebula (M1)', 'pwn', 83.633, 22.015, 2000, 1.7, 'the wreck of the supernova seen in 1054, powered by a pulsar spinning 30 times a second', [1.0, 0.5, 0.3], [0.45, 0.6, 1.0]],
  ['Veil Nebula', 'snr', 312.75, 30.67, 735, 17, 'filaments of a star that exploded about 15,000 years ago', [0.4, 0.75, 1.0], [1.0, 0.35, 0.4]],
  ['Cassiopeia A', 'snr', 350.85, 58.815, 3400, 2.5, 'the youngest known supernova remnant in the Galaxy, about 350 years old', [0.55, 0.8, 1.0], [1.0, 0.5, 0.35]],
  ['Vela Supernova Remnant', 'snr', 128.5, -45.5, 287, 19, 'a remnant 11,000 years old, with the Vela pulsar at its heart', [0.45, 0.7, 1.0], [1.0, 0.35, 0.45]],
  ['Pleiades (M45)', 'open', 56.75, 24.12, 136, 4, 'the Seven Sisters, young stars drifting through a dust cloud', [0.7, 0.82, 1.0], [0.3, 0.45, 0.9]],
  ['Hyades', 'open', 66.75, 15.87, 47, 5, 'the nearest open cluster, the face of Taurus', [1.0, 0.88, 0.75], NONE],
  ['Beehive Cluster (M44)', 'open', 130.1, 19.67, 187, 4, 'a swarm of a thousand stars in Cancer', [1.0, 0.92, 0.8], NONE],
  ['Omega Centauri', 'globular', 201.697, -47.479, 5240, 26, 'the largest globular cluster, ten million stars, perhaps the core of a swallowed galaxy', WARM, NONE],
  ['47 Tucanae', 'globular', 6.024, -72.081, 4450, 20, 'a dense globular cluster beside the Small Magellanic Cloud', WARM, NONE],
  ['Hercules Cluster (M13)', 'globular', 250.423, 36.461, 6800, 20, 'the great globular cluster of the northern sky', WARM, NONE],
  ['Cygnus X-1', 'bh', 299.59, 35.202, 2220, 2e-6, 'the first black hole found, 21 Suns, feeding on a blue supergiant', [1.0, 0.75, 0.45], BLUE],
  ['V404 Cygni', 'bh', 306.016, 33.867, 2390, 2e-6, 'a black hole of 9 Suns that flares in X-rays every few decades', [1.0, 0.75, 0.45], NONE],
  ['A0620−00', 'bh', 95.686, -0.346, 1060, 2e-6, 'one of the nearest X-ray binaries with a black hole', [1.0, 0.75, 0.45], NONE],
  ['Gaia BH1', 'bh', 262.172, -0.581, 480, 2e-6, 'the nearest known black hole, 10 Suns, found by its pull on a Sun-like star', [1.0, 0.75, 0.45], NONE],
  ['Gaia BH2', 'bh', 207.57, -59.24, 1160, 2e-6, 'a dormant black hole of 9 Suns orbited by a red giant', [1.0, 0.75, 0.45], NONE],
  ['Gaia BH3', 'bh', 294.832, 14.932, 590, 2e-6, 'the most massive stellar black hole in the Galaxy, 33 Suns', [1.0, 0.75, 0.45], NONE],
  ['M87*', 'bh', 187.706, 12.391, 16.8 * PC_PER_MPC, 0.01, 'a black hole of 6.5 billion Suns, the first ever photographed (2019)', [1.0, 0.6, 0.3], NONE],
];

export const DEEP_SKY: DeepObject[] = [
  ...LIST.map(([name, kind, ra, dec, d, r, info, c1, c2]) => ({
    name, kind, pos: radec(ra, dec, d), r, info, c1: c1 ?? HA, c2: c2 ?? NONE, b: FAINT[name] ?? 1,
  })),
  {
    name: 'Sagittarius A*', kind: 'bh', pos: GC, r: 2e-4,
    info: 'the Milky Way’s central black hole, 4.3 million Suns, photographed in 2022',
    c1: [1.0, 0.65, 0.35], c2: NONE, b: 1,
  },
];

const KIND_ID: Record<DeepKind, number> = { hii: 0, pn: 1, snr: 2, open: 3, globular: 4, pwn: 5, bh: 6 };

const VS = `#version 300 es
in vec2 aCorner;
in vec3 iRel;
in float iR, iKind, iSeed, iB;
in vec3 iC1, iC2;
uniform vec3 uRight, uUp, uFwd;
uniform float uTanY, uAspect, uPx, uMinPx, uGain;
out vec2 vUv;
out float vKind, vSeed, vA;
out vec3 vC1, vC2;
void main() {
  float z = dot(iRel, uFwd);
  float pxR = iR / (2.0 * uTanY * max(z, 1e-30)) * uPx;
  float R = iR, a = uGain * iB;
  bool bh = iKind > 5.5;
  if (bh) {
    // a black hole is far too small to see: it is drawn as a marker until it is not
    if (pxR < uMinPx) R *= uMinPx / max(pxR, 1e-12);
  } else {
    a *= smoothstep(1.0, 5.0, pxR);
    // fly into it and it thins away instead of filling the screen
    a *= smoothstep(0.4, 1.4, length(iRel) / iR);
  }
  float ext = bh ? 1.0 : 1.3;
  vec3 p = iRel + (uRight * aCorner.x + uUp * aCorner.y) * R * ext;
  float w = dot(p, uFwd);
  gl_Position = vec4(dot(p, uRight) / (uTanY * uAspect), dot(p, uUp) / uTanY, 0.0, w);
  if (z <= 0.0 || a < 0.003) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  vUv = aCorner * ext;
  vKind = iKind;
  vSeed = iSeed;
  vA = a;
  vC1 = iC1;
  vC2 = iC2;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
in float vKind, vSeed, vA;
in vec3 vC1, vC2;
out vec4 o;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.7); a *= 0.5; }
  return s;
}
// a sprinkle of stars: one per cell at most, brighter ones rarer
float stars(vec2 p, float density) {
  vec2 c = floor(p), f = fract(p);
  float h = hash(c + vSeed);
  if (h > density) return 0.0;
  vec2 at = vec2(hash(c + 1.7 + vSeed), hash(c + 3.1 + vSeed)) * 0.7 + 0.15;
  float b = pow(hash(c + 5.3), 4.0) * 3.0 + 0.3;
  return b * exp(-dot(f - at, f - at) * 110.0);
}
void main() {
  int k = int(vKind + 0.5);
  float ang = vSeed * 6.2831;
  vec2 uv = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * vUv;
  float r = length(uv);
  vec2 q = uv * 1.7 + vSeed * 17.0;
  vec3 col = vec3(0.0);
  float occ = 0.0;
  if (k == 0) {
    // emission nebula: warped clouds, hot teal heart, dark dust lanes, a few bright young stars
    float warp = fbm(q * 1.2);
    float n = fbm(q * 2.0 + warp * 1.8);
    float body = smoothstep(1.05, 0.1, r + (n - 0.5) * 0.7);
    float gas = body * (0.25 + 1.1 * n * n);
    float core = exp(-r * r * 7.0);
    float dark = smoothstep(0.52, 0.72, fbm(q * 3.3 + 7.0)) * body;
    col = mix(vC1, vC2, core * 0.75) * gas * 1.3 + vec3(1.0, 0.92, 0.85) * core * 0.25;
    col *= 1.0 - dark * 0.9;
    col += stars(uv * 9.0, 0.12) * body * vec3(0.85, 0.9, 1.0);
    occ = dark * 0.7;
  } else if (k == 1) {
    // planetary nebula: a shell, teal inside, red at the rim, the white dwarf at the centre
    vec2 e = uv * vec2(1.0, 1.25);
    float rr = length(e) + (fbm(e * 4.0 + vSeed * 9.0) - 0.5) * 0.12;
    float shell = exp(-pow((rr - 0.58) / 0.14, 2.0));
    float inner = smoothstep(0.62, 0.0, rr) * 0.5;
    float rim = exp(-pow((rr - 0.76) / 0.09, 2.0));
    col = vC2 * inner + mix(vC2, vC1, 0.55) * shell * 1.2 + vC1 * rim * 0.9;
    col += vec3(0.9, 0.95, 1.0) * exp(-r * r * 900.0) * 2.0;
  } else if (k == 2 || k == 5) {
    // supernova remnant: a shell of thin tangled filaments; a pulsar-wind nebula is filled with blue light
    float n = fbm(q * 1.5);
    float ridge = 1.0 - abs(fbm(q * 2.6 + n) * 2.0 - 1.0);
    ridge = pow(ridge, k == 5 ? 5.0 : 9.0);
    float shell = smoothstep(1.0, 0.72, r + (n - 0.5) * 0.25) * (k == 5 ? 1.0 : smoothstep(0.35, 0.85, r + (n - 0.5) * 0.3));
    float mixc = fbm(q * 0.8 + 3.0);
    col = mix(vC1, vC2, smoothstep(0.35, 0.65, mixc)) * ridge * shell * 2.4;
    if (k == 5) col = vC1 * ridge * shell * 2.2 + vC2 * smoothstep(0.85, 0.0, r) * 0.45 * (0.6 + n);
  } else if (k == 3) {
    // open cluster: a loose handful of bright stars, sometimes in a blue reflection haze
    float d = exp(-r * r * 2.0);
    col = vC1 * (stars(uv * 6.0, 0.35 * d) + stars(uv * 13.0, 0.25 * d) * 0.5);
    col += vC2 * pow(fbm(q * 2.5), 2.0) * d * 0.5;
  } else if (k == 4) {
    // globular cluster: a ball of old stars crowding to a glowing core
    float d = exp(-r * r * 6.0);
    col = vC1 * (stars(uv * 16.0, 0.95 * d) * 1.4 + stars(uv * 30.0, 0.95 * d) * 0.8 + stars(uv * 55.0, d) * 0.5 + d * d * 0.3);
  } else {
    // black hole: the shadow, the thin photon ring, and a tilted disk whose far side is lensed up over the top
    float shadow = 1.0 - smoothstep(0.25, 0.27, r);
    vec2 d = vec2(vUv.x, vUv.y / 0.24);
    float rd = length(d);
    float disk = smoothstep(0.3, 0.42, rd) * smoothstep(0.98, 0.5, rd);
    float beam = 1.0 + 0.75 * (-vUv.x / max(rd * 0.6, 0.1));
    float front = vUv.y < 0.0 ? 1.0 : 0.0;
    float ringP = exp(-pow((r - 0.285) / 0.018, 2.0));
    float lensed = exp(-pow((r - 0.36) / 0.07, 2.0)) * smoothstep(-0.05, 0.25, vUv.y);
    vec3 hot = vC1;
    vec3 glow = hot * (disk * max(beam, 0.2) * 1.2 + lensed * 0.9) + vec3(1.0, 0.92, 0.8) * ringP * 1.4;
    col = glow * (1.0 - shadow * (1.0 - front * disk));
    if (vC2.b > 0.0) {
      // the companion star feeding it
      vec2 s = vUv - vec2(0.72, 0.45);
      col += vC2 * exp(-dot(s, s) * 160.0) * 1.6;
    }
    occ = shadow * (1.0 - front * disk);
  }
  float edge = smoothstep(1.3, 0.9, length(vUv));
  o = vec4(col * vA * edge, occ * vA * edge);
}`;

/** Draw the deep-sky objects that are switched on; `eye` and the objects in pc, galactic. */
export function deepSkyGL(gl: WebGL2RenderingContext) {
  const prog = compile(gl, VS, FS, 'deep sky');
  if (!prog) return null;
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const cb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const ac = gl.getAttribLocation(prog.prog, 'aCorner');
  gl.enableVertexAttribArray(ac);
  gl.vertexAttribPointer(ac, 2, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ib);
  const STRIDE = 13;
  const attrs: [string, number, number][] = [['iRel', 3, 0], ['iR', 1, 3], ['iKind', 1, 4], ['iSeed', 1, 5], ['iC1', 3, 6], ['iC2', 3, 9], ['iB', 1, 12]];
  for (const [name, n, off] of attrs) {
    const loc = gl.getAttribLocation(prog.prog, name);
    if (loc < 0) continue;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, STRIDE * 4, off * 4);
    gl.vertexAttribDivisor(loc, 1);
  }
  gl.bindVertexArray(null);
  const data = new Float32Array(DEEP_SKY.length * STRIDE);

  return {
    draw(view: View, eye: V3, o: { show: (d: DeepObject) => boolean; gain?: number }) {
      // far to near, so nearer dust and shadows cover what is behind them
      const list = DEEP_SKY.map((d, i) => ({ d, i, rel: v3.sub(d.pos, eye) }))
        .filter((x) => o.show(x.d))
        .sort((a, b) => v3.len(b.rel) - v3.len(a.rel));
      if (!list.length) return;
      list.forEach(({ d, i, rel }, j) => {
        data.set([...rel, d.r, KIND_ID[d.kind], ((i * 0.618034) % 1), ...d.c1, ...d.c2, d.b], j * STRIDE);
      });
      gl.useProgram(prog.prog);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, ib);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, list.length * STRIDE), gl.DYNAMIC_DRAW);
      gl.uniform3f(prog.u('uRight'), ...view.right);
      gl.uniform3f(prog.u('uUp'), ...view.up);
      gl.uniform3f(prog.u('uFwd'), ...view.fwd);
      gl.uniform1f(prog.u('uTanY'), view.tanY);
      gl.uniform1f(prog.u('uAspect'), view.aspect);
      gl.uniform1f(prog.u('uPx'), view.px);
      gl.uniform1f(prog.u('uMinPx'), 9);
      gl.uniform1f(prog.u('uGain'), o.gain ?? 1);
      gl.enable(gl.BLEND);
      // premultiplied: light adds, dust and shadows cover
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, list.length);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(null);
    },
  };
}
