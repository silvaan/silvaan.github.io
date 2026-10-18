// Bare WebGL2 for the sims that draw tens of thousands of points: compile a
// program, upload interleaved float buffers, and a look-at camera whose basis
// the shaders take as three uniforms. Positions stay in Float64 on the CPU and
// each layer is drawn relative to the eye in its own unit, so one scene can
// hold planets in AU and quasars in Mpc without float32 running out of digits.

export type V3 = [number, number, number];

export const v3 = {
  add: (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a: V3) => Math.hypot(a[0], a[1], a[2]),
  unit: (a: V3): V3 => {
    const m = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / m, a[1] / m, a[2] / m];
  },
  mix: (a: V3, b: V3, f: number): V3 => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f],
};

/** A 3×3 matrix as rows, applied to column vectors. */
export type M3 = [V3, V3, V3];
export const mulM3 = (m: M3, v: V3): V3 => [v3.dot(m[0], v), v3.dot(m[1], v), v3.dot(m[2], v)];
export const transpose = (m: M3): M3 => [
  [m[0][0], m[1][0], m[2][0]],
  [m[0][1], m[1][1], m[2][1]],
  [m[0][2], m[1][2], m[2][2]],
];

/**
 * An eye at `eye` looking along `fwd`, with `up` roughly upwards. `tanY` is
 * the tangent of half the vertical field of view.
 */
export class View {
  eye: V3 = [0, 0, 0];
  fwd: V3 = [1, 0, 0];
  right: V3 = [0, 1, 0];
  up: V3 = [0, 0, 1];
  tanY = 0.55;
  aspect = 1.6;
  /** Height of the drawing in CSS pixels, for turning angles into pixels. */
  px = 600;

  /** Orbit `centre` at distance `r`; yaw about +z, pitch above the xy plane. */
  orbit(centre: V3, r: number, yaw: number, pitch: number) {
    const cp = Math.cos(pitch);
    const dir: V3 = [cp * Math.cos(yaw), cp * Math.sin(yaw), Math.sin(pitch)];
    this.eye = v3.add(centre, v3.mul(dir, r));
    this.look(v3.mul(dir, -1), [0, 0, 1]);
  }

  look(fwd: V3, upHint: V3) {
    this.fwd = v3.unit(fwd);
    let right = v3.cross(this.fwd, upHint);
    if (v3.len(right) < 1e-9) right = v3.cross(this.fwd, [1, 0, 0]);
    this.right = v3.unit(right);
    this.up = v3.cross(this.right, this.fwd);
  }

  /** Screen position (CSS px within W×H) and depth, or null behind the eye. */
  project(p: V3, W: number, H: number) {
    const d = v3.sub(p, this.eye);
    const z = v3.dot(d, this.fwd);
    if (z <= 0) return null;
    const x = v3.dot(d, this.right) / (z * this.tanY * this.aspect);
    const y = v3.dot(d, this.up) / (z * this.tanY);
    return { x: (x * 0.5 + 0.5) * W, y: (0.5 - y * 0.5) * H, z };
  }

  /** The world direction through a screen point. */
  ray(sx: number, sy: number, W: number, H: number): V3 {
    const x = (sx / W) * 2 - 1, y = 1 - (sy / H) * 2;
    return v3.unit(
      v3.add(this.fwd, v3.add(v3.mul(this.right, x * this.tanY * this.aspect), v3.mul(this.up, y * this.tanY)))
    );
  }

  /** Pixels per unit length at distance z. */
  pxPer(z: number) {
    return this.px / (2 * this.tanY * z);
  }
}

/**
 * GLSL shared by every point layer: the eye-relative projection. `uEye` is the
 * eye in the layer's unit; the camera basis and field of view come from View.
 */
export const GLSL_PROJECT = `
uniform vec3 uEye, uRight, uUp, uFwd;
uniform float uTanY, uAspect, uPx;
// returns the clip position; .w is the distance along the view axis
vec4 project(vec3 p, out vec3 rel) {
  rel = p - uEye;
  float z = dot(rel, uFwd);
  return vec4(dot(rel, uRight) / (uTanY * uAspect), dot(rel, uUp) / uTanY, 0.0, z);
}
`;

export function compile(gl: WebGL2RenderingContext, vs: string, fs: string, label: string) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(`${label}: shader failed to compile`, gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(`${label}: shader failed to link`, gl.getProgramInfoLog(prog));
    return null;
  }
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  return {
    prog,
    u(name: string) {
      if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(prog, name));
      return uniforms.get(name)!;
    },
  };
}
export type Program = NonNullable<ReturnType<typeof compile>>;

/**
 * A vertex array from one interleaved Float32Array. `attrs` lists the
 * attribute names with their float counts, in buffer order.
 */
export function vertexArray(gl: WebGL2RenderingContext, prog: Program, data: Float32Array, attrs: [string, number][]) {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const stride = attrs.reduce((s, [, n]) => s + n, 0);
  let off = 0;
  for (const [name, n] of attrs) {
    const loc = gl.getAttribLocation(prog.prog, name);
    if (loc >= 0) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride * 4, off * 4);
    }
    off += n;
  }
  gl.bindVertexArray(null);
  return { vao, count: data.length / stride, buf };
}

/** Upload the View into a program's projection uniforms, eye scaled to the layer unit. */
export function setView(gl: WebGL2RenderingContext, p: Program, view: View, eye: V3) {
  gl.uniform3f(p.u('uEye'), eye[0], eye[1], eye[2]);
  gl.uniform3f(p.u('uRight'), ...view.right);
  gl.uniform3f(p.u('uUp'), ...view.up);
  gl.uniform3f(p.u('uFwd'), ...view.fwd);
  gl.uniform1f(p.u('uTanY'), view.tanY);
  gl.uniform1f(p.u('uAspect'), view.aspect);
  gl.uniform1f(p.u('uPx'), view.px);
}

/** Size the GL canvas's backing store to its logical size times the DPR. */
export function fitCanvas(canvas: HTMLCanvasElement, W: number, H: number, scale = 1) {
  const dpr = Math.min(2, window.devicePixelRatio || 1) * scale;
  const w = Math.max(1, Math.round(W * dpr)), h = Math.max(1, Math.round(H * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return dpr;
}
