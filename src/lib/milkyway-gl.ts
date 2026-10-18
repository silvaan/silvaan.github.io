// The Milky Way as a lit, dusty disk for the WebGL Cosmology sims, drawn the
// way the well-known illustrations draw it (R. Hurt, NASA/JPL-Caltech): a long
// yellow bar inside a ring, two major arms rich in old stars, thinner gassy
// minor arms, pink star-forming knots, blue young clusters, and dark lanes of
// dust along the inner edges of the arms.
//
// The face-on picture is computed once on the GPU into two textures; the disk
// is then drawn as a stack of thin slabs whose brightness falls off with height
// like the stars and gas do, so it has a real thickness seen edge-on and from
// inside it shows as a band across the sky.

import { compile, type Program, type View, type V3 } from './gl3d';
import { ARMS, GC } from './galaxies';

/** Half the side of the square the textures cover, pc. */
const S = 18000;
const TEX = 2048;

const NOISE = `
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
  for (int i = 0; i < 5; i++) {
    s += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return s;
}
`;

const BAKE_VS = `#version 300 es
in vec2 p;
out vec2 vP;
void main() { vP = p * ${S.toFixed(1)}; gl_Position = vec4(p, 0.0, 1.0); }`;

// vP is the position in the plane relative to the centre, galactic x and y
// (x points from the Sun towards the centre, so the Sun is at (−8178, 0)).
const BAKE_FS = `#version 300 es
precision highp float;
in vec2 vP;
uniform vec4 uA[5]; // R_k, β_k, ψ1, ψ2
uniform vec4 uB[5]; // β0, β1, width, weight
layout(location = 0) out vec4 oYoung;
layout(location = 1) out vec4 oOld;
const float DEG = 0.017453292519943295;
${NOISE}
void main() {
  vec2 p = vP;
  float R = max(length(p), 1.0);
  // β as galaxies.ts measures it: 0 towards the Sun, growing with rotation
  float beta = atan(p.y, -p.x) / DEG;
  float lnR = log(R);

  // texture that follows the spiral: constant along a 12° log spiral
  float s = beta * DEG + lnR / tan(12.0 * DEG);
  float feather = fbm(vec2(s * 5.0, lnR * 1.5));
  float s2 = beta * DEG + lnR / tan(38.0 * DEG);
  float spurN = fbm(vec2(s2 * 9.0, lnR * 3.0) + 5.0);
  float clump = fbm(p / 380.0);
  float fine = fbm(p / 110.0 + 31.0);

  float arms = 0.0, major = 0.0, dust = 0.0;
  for (int i = 0; i < 5; i++) {
    vec4 a = uA[i], b = uB[i];
    float best = 1e9, fade = 0.0, Ra = 0.0;
    for (int k = -1; k <= 1; k++) {
      float bd = beta + 360.0 * float(k);
      float f = smoothstep(b.x - 40.0, b.x + 15.0, bd) * (1.0 - smoothstep(b.y - 15.0, b.y + 40.0, bd));
      if (f <= 0.0) continue;
      float psi = (bd < a.y ? a.z : a.w) * DEG;
      float r = a.x * exp(-(bd - a.y) * DEG * tan(psi));
      float dr = (R - r) * cos(psi);
      if (abs(dr) < abs(best)) { best = dr; fade = f; Ra = r; }
    }
    if (fade <= 0.0) continue;
    fade *= smoothstep(2600.0, 3600.0, Ra) * (1.0 - smoothstep(14500.0, 17500.0, Ra));
    float w = b.z * pow(Ra / 8150.0, 0.6) * 1.9;
    float g = exp(-best * best / (w * w)) * fade * b.w;
    arms += g;
    if (i < 2) major += g;
    // the dust lane hugs the inner (concave) edge, where the gas is squeezed
    float lane = (best + 0.55 * w) / (0.32 * w);
    dust += exp(-lane * lane) * fade * b.w;
  }

  // the bar, 30° from the Sun–centre line, its near end at positive longitude
  float c = cos(30.0 * DEG), sn = sin(30.0 * DEG);
  float x = -p.x, y = p.y;
  float along = x * c + y * sn, across = -x * sn + y * c;
  float bar = exp(-pow(abs(along) / 3600.0, 2.6) - pow(across / 750.0, 2.0));
  // straight dust lanes on the bar's leading edges, as in barred galaxies seen face-on
  float lead = (across - sign(along) * 520.0) / 170.0;
  float barDust = exp(-lead * lead) * smoothstep(4800.0, 1200.0, abs(along)) * smoothstep(300.0, 900.0, abs(along));
  // the ring the bar sits in, the "3-kpc arms"
  float ringR = length(vec2(along, across * 1.7));
  float ring = exp(-pow((ringR - 4300.0) / 420.0, 2.0)) * (0.55 + 0.9 * clump);
  float bulge = 0.45 * exp(-R / 420.0) + 0.25 * exp(-R / 1100.0);

  float edge = 1.0 - smoothstep(13500.0, 17500.0, R);
  float disk = exp(-R / 2600.0) * smoothstep(1200.0, 3500.0, R) * edge;

  // young light: arms, pink HII regions, blue clusters
  // arms break up into clumps and feathers rather than running as smooth ribbons
  float knots = smoothstep(0.3, 0.8, clump * 0.75 + feather * 0.35 + spurN * 0.2);
  float armLight = arms * (0.12 + 1.5 * knots * knots) * (0.6 + 0.6 * fine);
  float hii = pow(max(fine * 0.7 + clump * 0.45 - 0.62, 0.0) * 4.5, 2.0) * arms;
  float blue = pow(max(fbm(p / 45.0 + 7.0) - 0.56, 0.0) * 4.5, 2.5) * arms * (0.5 + knots);
  // faint spurs crossing between the arms
  float spur = pow(max(spurN - 0.5, 0.0) * 3.0, 2.0) * disk * 0.9;
  vec3 young = armLight * vec3(0.55, 0.68, 1.0) * 0.9
             + hii * vec3(1.0, 0.33, 0.55) * 3.4
             + blue * vec3(0.7, 0.84, 1.0) * 2.4
             + spur * vec3(0.7, 0.78, 1.0)
             + ring * vec3(0.9, 0.7, 0.75) * 0.25;
  // old light: the smooth disk, piled up a little in the major arms, and the bar
  vec3 old = disk * (0.85 + 0.3 * clump) * vec3(1.0, 0.86, 0.68) * 2.2
           + major * exp(-R / 5200.0) * (0.6 + 0.6 * clump) * vec3(1.0, 0.9, 0.78) * 1.1
           + bar * vec3(1.0, 0.8, 0.52) * 0.9
           + ring * vec3(1.0, 0.86, 0.68) * 0.35
           // the inner disk round the bar is old stars too, a warm glow rather than a gap
           + exp(-R / 1900.0) * (1.0 - smoothstep(4000.0, 6500.0, R)) * vec3(1.0, 0.84, 0.6) * 1.1;

  float d = (dust * (0.5 + 1.2 * fbm(p / 160.0 + 3.0))
          + arms * 0.25 * fbm(vec2(s * 14.0, lnR * 5.0) + 11.0)
          + ring * 0.25
          + barDust * 0.6 * (0.4 + fine)
          + disk * 1.6 * pow(spurN, 3.0)) * edge;
  // light is stored as a square root, so the 8-bit textures keep the faint outskirts
  oYoung = vec4(sqrt(clamp(young / 4.0, 0.0, 1.0)), clamp(d * 0.6, 0.0, 1.0));
  oOld = vec4(sqrt(clamp(old / 4.0, 0.0, 1.0)), sqrt(clamp(bulge * 0.45, 0.0, 1.0)));
}`;

/**
 * The slab shader. \`place\` maps a point (pc, Sun-centred galactic) to where
 * the sim draws it; the atlas leaves it alone, the travel sim bends it into
 * the ship's maps.
 */
const slabVS = (place: string) => `#version 300 es
in vec2 aXY;
uniform vec3 uGC, uEye, uRight, uUp, uFwd;
uniform float uTanY, uAspect, uZ, uNear;
out vec2 vUv;
out vec3 vRel;
${place}
void main() {
  vec3 w = place(uGC + vec3(aXY * ${S.toFixed(1)}, uZ));
  vec3 rel = w - uEye;
  vUv = aXY * 0.5 + 0.5;
  vRel = rel;
  float z = dot(rel, uFwd);
  gl_Position = vec4(dot(rel, uRight) / (uTanY * uAspect), dot(rel, uUp) / uTanY, z - 2.0 * uNear, z);
}`;

const SLAB_FS = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vRel;
uniform sampler2D uYoung, uOld;
uniform float uZ, uDz, uGain, uNearFade;
uniform bool uDust;
out vec4 o;
void main() {
  float d = length(vRel);
  // through a slab at a slant you see more of it
  float path = 1.0 / max(abs(vRel.z) / d, 0.05);
  float near = smoothstep(uNearFade * 0.3, uNearFade, d);
  vec4 y = texture(uYoung, vUv);
  if (uDust) {
    float tau = y.a * 1.6 * path * near;
    o = vec4(1.0 - exp(-tau * vec3(0.75, 0.88, 1.0)), 0.0);
    return;
  }
  vec4 q = texture(uOld, vUv);
  vec3 Ey = y.rgb * y.rgb * 4.0, Eo = q.rgb * q.rgb * 4.0;
  float Eb = q.a * q.a / 0.45;
  // each part has its own thickness: gas and young stars thin, old stars
  // thicker, the bulge a fat box
  float z = uZ;
  float wy = exp(-z * z / (2.0 * 110.0 * 110.0)) / 110.0;
  float wo = exp(-z * z / (2.0 * 330.0 * 330.0)) / 330.0;
  float wb = exp(-z * z / (2.0 * 700.0 * 700.0)) / 700.0;
  vec3 E = Ey * wy + Eo * wo + Eb * wb * vec3(1.0, 0.84, 0.6) * 2.2;
  // the slab's own dust dims what it carries
  E *= exp(-y.a * 0.9 * exp(-z * z / (2.0 * 120.0 * 120.0)));
  o = vec4(E * uDz * uGain * min(path, 6.0) * near, 0.0);
}`;

// The same disk ray-marched: each pixel walks its ray through the slab,
// adding light and losing it to dust in front, so lanes hide the bulge behind
// them and, from inside, the band across the sky has the Great Rift in it.
const VOL_VS = `#version 300 es
in vec2 p;
out vec2 vNdc;
void main() { vNdc = p; gl_Position = vec4(p, 0.0, 1.0); }`;

const VOL_FS = `#version 300 es
precision highp float;
in vec2 vNdc;
uniform sampler2D uYoung, uOld;
uniform vec3 uEye, uRight, uUp, uFwd; // eye relative to the centre, pc
uniform float uTanY, uAspect, uGain, uNearFade, uPixAng, uSeed;
out vec4 o;
const float S = ${S.toFixed(1)}, HZ = 1800.0, TEXEL = ${(2 * S / TEX).toFixed(4)};
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float erf_(float x) {
  // Abramowitz and Stegun 7.1.26
  float s = sign(x); x = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * x);
  float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x);
  return s * y;
}
// ∫ exp(−z²/2σ²)/σ dt along a step whose height runs from za to zb
float seg(float za, float zb, float dz, float dt, float sig) {
  if (abs(zb - za) < 1e-3 * sig) {
    float z = 0.5 * (za + zb);
    return exp(-z * z / (2.0 * sig * sig)) / sig * dt;
  }
  float k = 0.70710678 / sig;
  return 1.2533141 * abs(erf_(zb * k) - erf_(za * k)) / abs(dz);
}
void main() {
  vec3 d = normalize(uFwd + vNdc.x * uTanY * uAspect * uRight + vNdc.y * uTanY * uUp);
  // where the ray is inside the box |x|,|y| < S, |z| < HZ
  vec3 inv = 1.0 / d;
  vec3 b = vec3(S, S, HZ);
  vec3 t0 = (-b - uEye) * inv, t1 = (b - uEye) * inv;
  vec3 lo = min(t0, t1), hi = max(t0, t1);
  float ta = max(max(lo.x, lo.y), max(lo.z, 0.0)), tb = min(min(hi.x, hi.y), hi.z);
  ta = max(ta, uNearFade * 0.3);
  if (tb <= ta) discard;
  const int N = 96;
  float jit = hash(gl_FragCoord.xy * 0.731 + uSeed);
  float dt = (tb - ta) / float(N);
  vec3 L = vec3(0.0);
  float T = 1.0;
  float dz = d.z;
  for (int i = 0; i < N; i++) {
    float t = ta + (float(i) + jit) * dt;
    float t0 = ta + float(i) * dt, t1 = t0 + dt;
    vec3 q = uEye + d * t;
    vec2 uv = q.xy / (2.0 * S) + 0.5;
    float lod = max(0.0, log2(t * uPixAng / TEXEL));
    vec4 y = textureLod(uYoung, uv, lod);
    // the old stars are a smooth haze: their map is read blurred, so a thick layer seen at a slant does not smear streaks
    vec4 w = textureLod(uOld, uv, lod + 3.0);
    // each part's vertical profile integrated exactly over the step, so thin layers are never stepped over
    float za = uEye.z + d.z * t0, zb = uEye.z + d.z * t1;
    float sy = seg(za, zb, dz, dt, 75.0), so = seg(za, zb, dz, dt, 330.0);
    float sb = seg(za, zb, dz, dt, 700.0), sd = seg(za, zb, dz, dt, 85.0);
    vec3 E = y.rgb * y.rgb * 4.0 * sy + w.rgb * w.rgb * 4.0 * so + (w.a * w.a / 0.45) * sb * vec3(1.0, 0.84, 0.6) * 2.2;
    float near = smoothstep(uNearFade * 0.3, uNearFade, t);
    // clouds in three dimensions, finer than the map: they break the band
    // seen from inside into patches and rifts
    float c = noise3(q / 260.0) * 0.65 + noise3(q / 90.0) * 0.35;
    E *= (0.55 + 0.9 * c) * near;
    float tau = y.a * 1.2 * sd * near * (0.2 + 1.8 * c * c);
    // light made inside the step is dimmed by the step's own dust on average
    L += T * E * (tau > 1e-4 ? (1.0 - exp(-tau)) / tau : 1.0 - 0.5 * tau);
    T *= exp(-tau);
    if (T < 0.01) break;
  }
  // a soft shoulder, so the bulge seen edge-on glows instead of burning out
  o = vec4(1.0 - exp(-L * uGain), 1.0 - T);
}`;

// From near the Sun nothing beats the real sky: ESO's all-sky panorama
// (S. Brunier), in galactic longitude and latitude, the centre in the middle.
const PHOTO_URL = '/data/cosmos/milkyway.jpg';
const PHOTO_FS = `#version 300 es
precision highp float;
in vec2 vNdc;
uniform sampler2D uTex;
uniform vec3 uRight, uUp, uFwd;
uniform float uTanY, uAspect, uAlpha, uLod;
out vec4 o;
void main() {
  vec3 d = normalize(uFwd + vNdc.x * uTanY * uAspect * uRight + vNdc.y * uTanY * uUp);
  float l = atan(d.y, d.x), b = asin(clamp(d.z, -1.0, 1.0));
  vec2 uv = vec2(0.5 - l / 6.2831853, 0.5 - b / 3.1415927);
  vec3 c = textureLod(uTex, uv, uLod).rgb;
  // drop the photo's sky glow and noise floor, keep its light
  c = max(c - 0.035, 0.0) / 0.965;
  o = vec4(pow(c, vec3(1.25)) * uAlpha, 0.0);
}`;

/** Heights of the slabs, pc: crowded near the plane, where the thin parts are. */
const LAYERS = (() => {
  const n = 21, zs: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 2 - 1;
    zs.push(Math.sign(t) * 1600 * t * t);
  }
  return zs.map((z, i) => {
    const lo = i > 0 ? (zs[i - 1] + z) / 2 : z - (zs[1] - zs[0]) / 2;
    const hi = i < n - 1 ? (zs[i + 1] + z) / 2 : z + (z - zs[n - 2]) / 2;
    return { z, dz: hi - lo };
  });
})();

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const PLACE_IDENTITY = 'vec3 place(vec3 p) { return p; }';

export function milkyWayGL(gl: WebGL2RenderingContext, place = PLACE_IDENTITY) {
  const bake = compile(gl, BAKE_VS, BAKE_FS, 'milky way bake');
  const slab = compile(gl, slabVS(place), SLAB_FS, 'milky way');
  const vol = compile(gl, VOL_VS, VOL_FS, 'milky way volume');
  const photo = compile(gl, VOL_VS, PHOTO_FS, 'milky way photo');
  if (!bake || !slab || !vol || !photo) return null;
  let photoTex: WebGLTexture | null = null;
  const img = new Image();
  img.onload = () => {
    photoTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, photoTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    onPhoto?.();
  };
  img.src = PHOTO_URL;
  let onPhoto: (() => void) | null = null;
  /** How much of the sky is the photograph: all of it near the Sun, none a few hundred parsecs out. */
  const photoShare = (eye: V3) => (photoTex ? 1 - smoothstep(25, 450, Math.hypot(...eye)) : 0);

  // --- bake the face-on textures ------------------------------------------
  const tex = () => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, Math.log2(TEX) + 1, gl.RGBA8, TEX, TEX);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const young = tex(), old = tex();
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, young, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, old, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  const tri = gl.createVertexArray();
  gl.bindVertexArray(tri);
  const tb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(bake.prog, 'p');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(bake.prog);
  gl.uniform4fv(bake.u('uA'), ARMS.flatMap((a) => [a.Rk, a.bk, a.p1, a.p2]));
  gl.uniform4fv(bake.u('uB'), ARMS.flatMap((a) => [a.b0, a.b1, a.w, a.weight]));
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, TEX, TEX);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindVertexArray(null);
  for (const t of [young, old]) {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  // --- a fine grid, so a bending \`place\` bends the disk smoothly ------------
  const N = 64, grid: number[] = [];
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const x0 = (i / N) * 2 - 1, x1 = ((i + 1) / N) * 2 - 1, y0 = (j / N) * 2 - 1, y1 = ((j + 1) / N) * 2 - 1;
      grid.push(x0, y0, x1, y0, x1, y1, x0, y0, x1, y1, x0, y1);
    }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const gb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, gb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(grid), gl.STATIC_DRAW);
  const al = gl.getAttribLocation(slab.prog, 'aXY');
  gl.enableVertexAttribArray(al);
  gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const count = grid.length / 2;

  const volVao = gl.createVertexArray();
  gl.bindVertexArray(volVao);
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const vl = gl.getAttribLocation(vol.prog, 'p');
  gl.enableVertexAttribArray(vl);
  gl.vertexAttribPointer(vl, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const inside = (eye: V3) => {
    const dGC = Math.hypot(eye[0] - GC[0], eye[1] - GC[1], eye[2] - GC[2]);
    return (1 - smoothstep(16000, 30000, dGC)) * (1 - smoothstep(800, 3000, Math.abs(eye[2] - GC[2])));
  };

  return {
    /**
     * The ray-marched disk, for a sim that draws space as it is. `eye` is the
     * camera in pc, Sun-centred galactic; `pixAng` the angle one device pixel spans.
     */
    drawVolume(view: View, eye: V3, o: { gain: number; pixAng: number; photoGain: number }) {
      const e: V3 = [eye[0] - GC[0], eye[1] - GC[1], eye[2] - GC[2]];
      // far enough away the galaxy is a smudge the points already show
      if (Math.hypot(...e) > 3e6) return;
      const ins = inside(eye);
      const share = photoShare(eye);
      if (share > 0.002) {
        gl.useProgram(photo.prog);
        gl.bindVertexArray(volVao);
        gl.uniform3f(photo.u('uRight'), ...view.right);
        gl.uniform3f(photo.u('uUp'), ...view.up);
        gl.uniform3f(photo.u('uFwd'), ...view.fwd);
        gl.uniform1f(photo.u('uTanY'), view.tanY);
        gl.uniform1f(photo.u('uAspect'), view.aspect);
        gl.uniform1f(photo.u('uAlpha'), share * o.photoGain);
        gl.uniform1f(photo.u('uLod'), Math.max(0, Math.log2(o.pixAng / ((2 * Math.PI) / 4096))));
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, photoTex);
        gl.uniform1i(photo.u('uTex'), 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (share > 0.998) return;
      gl.useProgram(vol.prog);
      gl.bindVertexArray(volVao);
      gl.uniform3f(vol.u('uEye'), ...e);
      gl.uniform3f(vol.u('uRight'), ...view.right);
      gl.uniform3f(vol.u('uUp'), ...view.up);
      gl.uniform3f(vol.u('uFwd'), ...view.fwd);
      gl.uniform1f(vol.u('uTanY'), view.tanY);
      gl.uniform1f(vol.u('uAspect'), view.aspect);
      gl.uniform1f(vol.u('uGain'), o.gain * (1 - 0.6 * ins) * (1 - share));
      gl.uniform1f(vol.u('uNearFade'), 250 + 250 * ins);
      gl.uniform1f(vol.u('uPixAng'), o.pixAng);
      gl.uniform1f(vol.u('uSeed'), 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, young);
      gl.uniform1i(vol.u('uYoung'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, old);
      gl.uniform1i(vol.u('uOld'), 1);
      gl.enable(gl.BLEND);
      // light adds; the dust's share of the light from behind is taken away
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(null);
      gl.activeTexture(gl.TEXTURE0);
    },

    /**
     * Draw into the bound framebuffer. `eye` is the camera in pc, Sun-centred
     * galactic (in the sim's drawn space). `gain` sets the brightness; `extra`
     * sets any uniforms `place` uses.
     */
    // From inside the disk the stars near you are drawn one by one, so the
    // disk's own light starts a good way off, and the band it makes across
    // the sky is kept to the faint glow it is.
    inside,
    /** Called once the panorama has loaded, to redraw. */
    set onPhoto(f: () => void) { onPhoto = f; },
    draw(view: View, eye: V3, o: { gain: number; nearFade?: number; extra?: (p: Program) => void }) {
      gl.useProgram(slab.prog);
      gl.bindVertexArray(vao);
      gl.uniform3f(slab.u('uGC'), GC[0], GC[1], GC[2]);
      gl.uniform3f(slab.u('uEye'), eye[0], eye[1], eye[2]);
      gl.uniform3f(slab.u('uRight'), ...view.right);
      gl.uniform3f(slab.u('uUp'), ...view.up);
      gl.uniform3f(slab.u('uFwd'), ...view.fwd);
      gl.uniform1f(slab.u('uTanY'), view.tanY);
      gl.uniform1f(slab.u('uAspect'), view.aspect);
      const dGC = Math.hypot(eye[0] - GC[0], eye[1] - GC[1], eye[2] - GC[2]);
      gl.uniform1f(slab.u('uNear'), Math.max(1e-3, Math.min(50, dGC * 1e-4)));
      const inside = this.inside(eye);
      gl.uniform1f(slab.u('uNearFade'), o.nearFade ?? 400 + 1100 * inside);
      gl.uniform1f(slab.u('uGain'), o.gain * (1 - 0.6 * inside));
      o.extra?.(slab);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, young);
      gl.uniform1i(slab.u('uYoung'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, old);
      gl.uniform1i(slab.u('uOld'), 1);
      // light first, all slabs adding up
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform1i(slab.u('uDust'), 0);
      for (const L of LAYERS) {
        gl.uniform1f(slab.u('uZ'), L.z);
        gl.uniform1f(slab.u('uDz'), L.dz);
        gl.drawArrays(gl.TRIANGLES, 0, count);
      }
      // then the dust in the mid-plane takes its share of everything behind it
      gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_COLOR);
      gl.uniform1i(slab.u('uDust'), 1);
      gl.uniform1f(slab.u('uZ'), 0);
      gl.drawArrays(gl.TRIANGLES, 0, count);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(null);
      gl.activeTexture(gl.TEXTURE0);
    },
  };
}
