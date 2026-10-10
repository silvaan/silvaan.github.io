// Volumetric fog for the 3D sims: a field sampled on a 3D grid is raymarched
// in WebGL2 as glowing fog, and an optional shaded plane is composited inside
// the same march so it sits at the right depth (fog in front of the plane
// covers it, fog behind it is behind it). It draws on its own canvas, stacked
// under the page's 2D canvas, which keeps the box, arrows and labels on top.
//
// Three kinds of data:
//   'complex' two channels (re, im): density |z|², coloured by phase or a ramp
//   'scalar'  one channel ≥ 0: density v, coloured by a ramp
//   'signed'  one channel: density |v|, a ramp for + and another for −

import type { Camera3D, PlaneAxis, Vec } from './scene3d';
import { planePoint, planeNormal, rgba32 } from './scene3d';

export type VolumeKind = 'complex' | 'scalar' | 'signed';

const VS = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler3D uVol;
uniform sampler2D uPlane, uLutA, uLutB;
uniform vec3 uEye, uFwd, uRight, uUp;
uniform vec2 uC, uLogical, uRes;
uniform float uK;
uniform vec3 uLo, uHi;
uniform float uEmit, uAbsorb, uGain, uPlaneGain, uKappa, uLen, uHalf, uOffset, uPlaneA;
uniform vec3 uN, uAu, uAv;
uniform int uCloud, uPlaneOn, uKind, uPhase, uLight, uSteps;
out vec4 o;

// kind 0 complex, 1 scalar, 2 signed. A is the main ramp (or the phase table,
// one row per hue), B the ramp for negative values.
float density(vec2 z) {
  if (uKind == 0) return dot(z, z);
  return abs(z.x);
}

vec4 colour(vec2 z, float l) {
  float u = clamp(l, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0;
  if (uKind == 0 && uPhase == 1) {
    // row r holds hue r/64 at its centre; the texture repeats in v, so the
    // last row blends back into the first and the wheel has no seam
    float h = fract(atan(z.y, z.x) / 6.2831853);
    return texture(uLutA, vec2(u, h + 0.5 / 64.0));
  }
  if (uKind == 2 && z.x < 0.0) return texture(uLutB, vec2(u, 0.5));
  return texture(uLutA, vec2(u, 0.5));
}

void main() {
  vec2 px = vec2(gl_FragCoord.x * uLogical.x / uRes.x, (uRes.y - gl_FragCoord.y) * uLogical.y / uRes.y);
  vec3 d = normalize(uFwd + uRight * ((px.x - uC.x) / uK) + uUp * (-(px.y - uC.y) / uK));
  vec3 C = vec3(0.0);
  float A = 0.0;

  // where the ray crosses the plane, if it does inside its square
  float tp = -1.0;
  vec4 pc = vec4(0.0);
  if (uPlaneOn == 1) {
    float dn = dot(d, uN);
    if (abs(dn) > 1e-6) {
      float t = (uOffset - dot(uEye, uN)) / dn;
      vec3 h = uEye + d * t;
      float u = dot(h, uAu), v = dot(h, uAv);
      if (t > 0.0 && abs(u) <= uHalf && abs(v) <= uHalf) {
        vec2 z = texture(uPlane, vec2(u, v) / (2.0 * uHalf) + 0.5).rg;
        float rho = density(z) * uPlaneGain;
        pc = colour(z, log(1.0 + rho * 16.0) / log(17.0));
        pc.a *= uPlaneA;
        if (pc.a > 0.004) tp = t;
      }
    }
  }

  if (uCloud == 1) {
    vec3 inv = 1.0 / d;
    vec3 ta = (uLo - uEye) * inv, tb = (uHi - uEye) * inv;
    vec3 tmin = min(ta, tb), tmax = max(ta, tb);
    float t0 = max(max(max(tmin.x, tmin.y), tmin.z), 0.0);
    float t1 = min(min(tmax.x, tmax.y), tmax.z);
    if (t1 > t0) {
      float dt = (t1 - t0) / float(uSteps);
      // a fixed per-pixel offset of the first sample hides the step banding
      float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      float tt = t0 + dt * jit;
      vec3 span = uHi - uLo;
      float k = uKappa * dt / uLen;
      for (int s = 0; s < 256; s++) {
        if (s >= uSteps || A > 0.985) break;
        if (tp > 0.0 && tp < tt) {
          C += (1.0 - A) * pc.a * pc.rgb;
          A += (1.0 - A) * pc.a;
          tp = -1.0;
        }
        vec2 z = texture(uVol, (uEye + d * tt - uLo) / span).rg;
        float rho = density(z) * uGain;
        if (rho > 2e-4) {
          // cheap stand-in for 1 − e^(−x): this loop is the whole cost
          float x = rho * k;
          float al = x / (1.0 + x + 0.5 * x * x) * (1.0 + 0.5 * x);
          // the fog takes a full-strength colour; how bright it looks comes
          // from how much of it the ray passes through
          float l = uLight == 1 ? rho * 5.0 / (1.0 + rho * 5.0) : 0.66;
          vec3 c = colour(z, l).rgb;
          // on the dark stage the fog gives off more light than it blocks, so it glows
          C += (1.0 - A) * al * c * uEmit;
          A += (1.0 - A) * al * uAbsorb;
        }
        tt += dt;
      }
    }
  }
  if (tp > 0.0) {
    C += (1.0 - A) * pc.a * pc.rgb;
    A += (1.0 - A) * pc.a;
  }

  if (uLight == 1) {
    o = vec4(C, A);
  } else {
    // emission only, softly saturating: the fog adds light to the dark stage
    // and never darkens it, so thin fog leaves no grey halo round the bright core
    vec3 E = vec3(1.0) - exp(-C * 1.5);
    o = vec4(E, max(E.r, max(E.g, E.b)));
  }
}`;

/** Inject the stacking styles once: GL canvas underneath, 2D canvas on top. */
function styleOnce() {
  if (document.getElementById('vol3d-style')) return;
  const s = document.createElement('style');
  s.id = 'vol3d-style';
  s.textContent = `
.vol3d-wrap { position: relative; width: 100%; margin: 0 auto; }
.sim:fullscreen .vol3d-wrap { width: min(100%, calc((100vh - 150px) * var(--vol-ar))); }
.vol3d-wrap > canvas {
  position: absolute; inset: 0; width: 100% !important; height: 100% !important;
  max-width: none !important; max-height: none !important; margin: 0 !important;
}
.vol3d-wrap > canvas.vol3d-top { background: transparent !important; }
.vol3d-wrap > canvas.vol3d-gl { pointer-events: none; }`;
  document.head.appendChild(s);
}

/**
 * A hue wheel × brightness table for complex fields (64 hue rows of 256
 * levels): hue is the phase, brightness the level. Dark stage: from black to
 * the full colour and a little past it toward white. Light stage: from white to
 * a deep saturated colour.
 */
export function phaseTable(light: boolean) {
  const out = new Uint32Array(256 * 64);
  for (let h = 0; h < 64; h++) {
    const a = (h / 64) * Math.PI * 2;
    // a smooth, evenly bright wheel: red at 0, then yellow, green, cyan, blue, magenta
    const base = [0, 1, 2].map((i) => 0.5 + 0.5 * Math.cos(a - (i * 2 * Math.PI) / 3));
    const sat = base.map((c) => Math.pow(c, 0.8));
    for (let k = 0; k < 256; k++) {
      const l = k / 255;
      let rgb: number[];
      let al: number;
      if (light) {
        const deep = sat.map((c) => 30 + 190 * c * 0.85);
        rgb = deep.map((c) => 255 + (c - 255) * Math.min(1, l * 1.4));
        al = Math.min(0.85, l * 1.1);
      } else {
        const lift = Math.max(0, l - 0.75) / 0.25;
        rgb = sat.map((c) => (40 + 215 * c) * Math.min(1, l * 1.3) * (1 - lift * 0.35) + 255 * lift * 0.35);
        al = Math.min(0.9, l * 1.05);
      }
      out[h * 256 + k] = rgba32(rgb[0], rgb[1], rgb[2], 255 * al);
    }
  }
  return out;
}

export type VolumeRender = {
  /** Draw the fog. */
  cloud: boolean;
  /** Draw the plane (after setPlane). */
  plane: boolean;
  /** Multiplies the stored density so that ~1 is "dense": usually 1 / exposure. */
  gain: number;
  /** Gain for the plane's brightness; defaults to `gain`. */
  planeGain?: number;
  /** How opaque the fog is, ~1. */
  opacity?: number;
  /** A typical size of the features, in world units; opacity is per this length. */
  len?: number;
  /** Phase colouring for complex data (else the ramp). */
  phase?: boolean;
  light: boolean;
  /** How opaque the plane is when the fog is on too (0..1). */
  planeAlpha?: number;
};

export class VolumeView {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private texVol: WebGLTexture;
  private texPlane: WebGLTexture;
  private texA: WebGLTexture;
  private texB: WebGLTexture;
  private kind: VolumeKind;
  private W: number;
  private H: number;
  private dims: [number, number, number] = [0, 0, 0];
  private lo: [number, number, number] = [0, 0, 0];
  private hi: [number, number, number] = [0, 0, 0];
  private hasVol = false;
  private planeSpec: { plane: PlaneAxis; offset: number; half: number } | null = null;
  private scale = 1;
  private lastT = 0;
  private avg = 0.016;
  private lastChange = 0;
  private aRows = 1;

  /**
   * Stack a WebGL2 canvas under `top` (the page's 2D canvas) and return the
   * renderer, or null when WebGL2 is not available.
   */
  static create(top: HTMLCanvasElement, W: number, H: number, kind: VolumeKind): VolumeView | null {
    const glc = document.createElement('canvas');
    const gl = glc.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return null;
    try {
      return new VolumeView(top, glc, gl, W, H, kind);
    } catch (e) {
      console.warn('volume3d: WebGL2 setup failed', e);
      return null;
    }
  }

  private constructor(top: HTMLCanvasElement, glc: HTMLCanvasElement, gl: WebGL2RenderingContext, W: number, H: number, kind: VolumeKind) {
    styleOnce();
    this.canvas = glc;
    this.gl = gl;
    this.W = W;
    this.H = H;
    this.kind = kind;

    const wrap = document.createElement('div');
    wrap.className = 'vol3d-wrap';
    wrap.style.aspectRatio = `${W} / ${H}`;
    wrap.style.setProperty('--vol-ar', String(W / H));
    top.parentNode!.insertBefore(wrap, top);
    glc.className = 'vol3d-gl';
    glc.setAttribute('aria-hidden', 'true');
    wrap.appendChild(glc);
    top.classList.add('vol3d-top');
    wrap.appendChild(top);

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
    gl.useProgram(prog);
    this.prog = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uVol', 'uPlane', 'uLutA', 'uLutB', 'uEye', 'uFwd', 'uRight', 'uUp', 'uC', 'uLogical', 'uRes', 'uK',
      'uLo', 'uHi', 'uEmit', 'uAbsorb', 'uGain', 'uPlaneGain', 'uKappa', 'uLen', 'uHalf', 'uOffset', 'uPlaneA',
      'uN', 'uAu', 'uAv', 'uCloud', 'uPlaneOn', 'uKind', 'uPhase', 'uLight', 'uSteps'])
      this.u[n] = gl.getUniformLocation(prog, n);
    const tex = (unit: number, target: number, wrapT: number) => {
      const t = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(target, t);
      gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
      if (target === gl.TEXTURE_3D) gl.texParameteri(target, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.texVol = tex(0, gl.TEXTURE_3D, gl.CLAMP_TO_EDGE);
    this.texPlane = tex(1, gl.TEXTURE_2D, gl.CLAMP_TO_EDGE);
    this.texA = tex(2, gl.TEXTURE_2D, gl.REPEAT); // the hue rows wrap round
    this.texB = tex(3, gl.TEXTURE_2D, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.u.uVol, 0);
    gl.uniform1i(this.u.uPlane, 1);
    gl.uniform1i(this.u.uLutA, 2);
    gl.uniform1i(this.u.uLutB, 3);
    gl.uniform1i(this.u.uKind, kind === 'complex' ? 0 : kind === 'scalar' ? 1 : 2);
    this.size();
    document.addEventListener('fullscreenchange', () => this.size());
  }

  private get channels() { return this.kind === 'complex' ? 2 : 1; }

  private size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(this.W * dpr * this.scale)), h = Math.max(1, Math.round(this.H * dpr * this.scale));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /**
   * Colour tables, each a Uint32Array of 256 levels (scene3d's ramp32), or for
   * complex phase colouring 64 rows × 256 (phaseTable). `b` is the ramp for
   * negative values of signed data.
   */
  setColours(a: Uint32Array, b?: Uint32Array) {
    const gl = this.gl;
    this.aRows = a.length / 256;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.texA);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, this.aRows, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
    const bb = b ?? a.subarray(0, 256);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.texB);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(bb.buffer, bb.byteOffset, 256 * 4));
  }

  /**
   * The 3D grid: nx·ny·nz samples (x fastest, then y, then z), each one or two
   * floats by kind, covering the box [lo, hi] (cell centres at lo + (i+½)·step).
   */
  setVolume(data: Float32Array, dims: [number, number, number], lo: [number, number, number], hi: [number, number, number]) {
    const gl = this.gl;
    const fmt = this.channels === 2 ? gl.RG : gl.RED, ifmt = this.channels === 2 ? gl.RG16F : gl.R16F;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, this.texVol);
    if (dims[0] !== this.dims[0] || dims[1] !== this.dims[1] || dims[2] !== this.dims[2]) {
      gl.texImage3D(gl.TEXTURE_3D, 0, ifmt, dims[0], dims[1], dims[2], 0, fmt, gl.FLOAT, data);
      this.dims = [...dims];
    } else gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, dims[0], dims[1], dims[2], fmt, gl.FLOAT, data);
    this.lo = [...lo];
    this.hi = [...hi];
    this.hasVol = true;
  }

  clearVolume() { this.hasVol = false; }

  /** A grid × grid slice (u fastest, then v) on an axis-aligned plane over [−half, half]². */
  setPlane(data: Float32Array | null, grid: number, plane: PlaneAxis, offset: number, half: number) {
    if (!data) { this.planeSpec = null; return; }
    const gl = this.gl;
    const fmt = this.channels === 2 ? gl.RG : gl.RED, ifmt = this.channels === 2 ? gl.RG16F : gl.R16F;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texPlane);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, grid, grid, 0, fmt, gl.FLOAT, data);
    this.planeSpec = { plane, offset, half };
  }

  /**
   * Lower the resolution when frames run long, raise it back when they don't.
   * The scale moves between a few fixed levels and at most every 0.75 s:
   * resizing the canvas reallocates it, so a scale that drifted every frame
   * would cost more than it saves.
   */
  private adapt() {
    const t = performance.now();
    if (this.lastT) {
      const dt = (t - this.lastT) / 1000;
      // only frames drawn back to back say anything about the GPU; a gap of
      // two seconds or more is a pause, not a slow frame. Slow frames must
      // count, however slow, or a page that starts slow would never lower its
      // resolution.
      if (dt < 2) {
        this.avg = this.avg * 0.8 + Math.min(dt, 0.25) * 0.2;
        if (t - this.lastChange > 750) {
          const LEVELS = [0.25, 0.35, 0.5, 0.7, 1];
          let i = LEVELS.indexOf(this.scale);
          if (this.avg > 0.024 && i > 0) i--;
          else if (this.avg < 0.0175 && i < LEVELS.length - 1) i++;
          if (LEVELS[i] !== this.scale) {
            this.scale = LEVELS[i];
            this.lastChange = t;
          }
        }
      }
    }
    this.lastT = t;
  }

  render(cam: Camera3D, o: VolumeRender) {
    const gl = this.gl, u = this.u, W = this.W, H = this.H;
    this.adapt();
    this.size();
    gl.useProgram(this.prog);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const cloud = o.cloud && this.hasVol;
    const plane = o.plane && !!this.planeSpec;
    if (!cloud && !plane) return;

    const v3 = (loc: WebGLUniformLocation | null, p: Vec) => gl.uniform3f(loc, p.x, p.y, p.z);
    v3(u.uEye, cam.eye());
    v3(u.uFwd, cam.forward());
    v3(u.uRight, cam.right());
    v3(u.uUp, cam.up());
    gl.uniform2f(u.uC, cam.cx, cam.cy);
    gl.uniform2f(u.uLogical, W, H);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uK, cam.k);
    gl.uniform3f(u.uLo, this.lo[0], this.lo[1], this.lo[2]);
    gl.uniform3f(u.uHi, this.hi[0], this.hi[1], this.hi[2]);
    gl.uniform1f(u.uGain, o.gain);
    gl.uniform1f(u.uPlaneGain, o.planeGain ?? o.gain);
    gl.uniform1f(u.uKappa, o.opacity ?? 1);
    const diag = Math.hypot(this.hi[0] - this.lo[0], this.hi[1] - this.lo[1], this.hi[2] - this.lo[2]);
    gl.uniform1f(u.uLen, Math.max(0.05, o.len ?? diag / 6));
    gl.uniform1f(u.uPlaneA, cloud ? o.planeAlpha ?? 0.6 : 1);
    gl.uniform1f(u.uEmit, o.light ? 1 : 1.1);
    gl.uniform1f(u.uAbsorb, o.light ? 1 : 0.6);
    gl.uniform1i(u.uCloud, cloud ? 1 : 0);
    gl.uniform1i(u.uPlaneOn, plane ? 1 : 0);
    gl.uniform1i(u.uPhase, o.phase && this.aRows > 1 ? 1 : 0);
    gl.uniform1i(u.uLight, o.light ? 1 : 0);
    gl.uniform1i(u.uSteps, this.scale < 0.45 ? 48 : this.scale < 0.75 ? 64 : 96);

    const pts: Vec[] = [];
    if (cloud)
      for (let c = 0; c < 8; c++)
        pts.push({ x: c & 1 ? this.hi[0] : this.lo[0], y: c & 2 ? this.hi[1] : this.lo[1], z: c & 4 ? this.hi[2] : this.lo[2] });
    if (plane) {
      const p = this.planeSpec!;
      v3(u.uN, planeNormal(p.plane));
      const [au, av]: Vec[] =
        p.plane === 'xy' ? [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }]
        : p.plane === 'xz' ? [{ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }]
        : [{ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }];
      v3(u.uAu, au);
      v3(u.uAv, av);
      gl.uniform1f(u.uHalf, p.half);
      gl.uniform1f(u.uOffset, p.offset);
      for (const [a, b] of [[-p.half, -p.half], [p.half, -p.half], [-p.half, p.half], [p.half, p.half]])
        pts.push(planePoint(p.plane, p.offset, a, b));
    }

    // only the screen rectangle the volume and the plane cover needs rays
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of pts) {
      const pr = cam.project(q);
      if (pr.zc < 0.3) { x0 = 0; y0 = 0; x1 = W; y1 = H; break; }
      x0 = Math.min(x0, pr.sx); x1 = Math.max(x1, pr.sx);
      y0 = Math.min(y0, pr.sy); y1 = Math.max(y1, pr.sy);
    }
    const sx = this.canvas.width / W, sy = this.canvas.height / H;
    const gx0 = Math.max(0, Math.floor(x0 * sx) - 2), gx1 = Math.min(this.canvas.width, Math.ceil(x1 * sx) + 2);
    const gy0 = Math.max(0, Math.floor((H - y1) * sy) - 2), gy1 = Math.min(this.canvas.height, Math.ceil((H - y0) * sy) + 2);
    if (gx1 > gx0 && gy1 > gy0) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(gx0, gy0, gx1 - gx0, gy1 - gy0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
    }
  }
}
