// The Hodgkin–Huxley model of the squid giant axon at 6.3 °C, in the modern
// convention (rest near −65 mV). Units: mV, ms, µA/cm², mS/cm², µF/cm².
// Gates step with exponential Euler, which stays stable at the dt used here.

export const HH = { C: 1, gNa: 120, gK: 36, gL: 0.3, ENa: 50, EK: -77, EL: -54.387 };

/** x / (1 − e^(−x/y)), with its limit y at x = 0. */
const vt = (x: number, y: number) => (Math.abs(x) < 1e-6 ? y : x / (1 - Math.exp(-x / y)));
const am = (V: number) => 0.1 * vt(V + 40, 10);
const bm = (V: number) => 4 * Math.exp(-(V + 65) / 18);
const ah = (V: number) => 0.07 * Math.exp(-(V + 65) / 20);
const bh = (V: number) => 1 / (1 + Math.exp(-(V + 35) / 10));
const an = (V: number) => 0.01 * vt(V + 55, 10);
const bn = (V: number) => 0.125 * Math.exp(-(V + 65) / 80);
function gate(x: number, a: number, b: number, dt: number) {
  const s = a + b, inf = a / s;
  return inf + (x - inf) * Math.exp(-s * dt);
}

export const iNa = (V: number, m: number, h: number) => HH.gNa * m * m * m * h * (V - HH.ENa);
export const iK = (V: number, n: number) => HH.gK * n * n * n * n * (V - HH.EK);
export const iL = (V: number) => HH.gL * (V - HH.EL);

/** The resting state, settled once. */
export const REST = (() => {
  let V = -65, m = am(V) / (am(V) + bm(V)), h = ah(V) / (ah(V) + bh(V)), n = an(V) / (an(V) + bn(V));
  for (let i = 0; i < 20000; i++) {
    const dV = -(iNa(V, m, h) + iK(V, n) + iL(V));
    [m, h, n] = [gate(m, am(V), bm(V), 0.01), gate(h, ah(V), bh(V), 0.01), gate(n, an(V), bn(V), 0.01)];
    V += 0.01 * dV;
  }
  return { V, m, h, n };
})();

/**
 * Smallest 1 ms push, into three compartments 2 cm from the end of the cable
 * below, that sends a spike down it (found by bisection offline). A push just
 * under it lifts the voltage there to about −53 mV.
 */
export const THRESHOLD = 47;

/**
 * A squid giant axon as a row of HH patches joined by the axon's inside
 * (radius 238 µm, axial resistivity 35.4 Ω·cm), with sealed ends.
 */
export class Cable {
  readonly V: Float64Array; readonly m: Float64Array; readonly h: Float64Array; readonly n: Float64Array;
  /** The latest Na⁺ and K⁺ currents per compartment, for drawing. */
  readonly ina: Float64Array; readonly ik: Float64Array;
  private next: Float64Array;
  private stim: { i0: number; i1: number; amp: number; until: number }[] = [];
  t = 0;
  /** Coupling between neighbours, per ms: (a / 2Rᵢ) / dx² over C. */
  readonly k: number;
  constructor(readonly N = 160, readonly dx = 0.1) {
    const D = (0.0238 / (2 * 35.4)) * 1000;
    this.k = D / (dx * dx) / HH.C;
    this.V = new Float64Array(N); this.m = new Float64Array(N); this.h = new Float64Array(N); this.n = new Float64Array(N);
    this.ina = new Float64Array(N); this.ik = new Float64Array(N); this.next = new Float64Array(N);
    this.reset();
  }
  reset() {
    this.V.fill(REST.V); this.m.fill(REST.m); this.h.fill(REST.h); this.n.fill(REST.n);
    this.ina.fill(0); this.ik.fill(0);
    this.stim = [];
    this.t = 0;
  }
  /** Push current into compartments i−1..i+1 for `dur` ms. */
  push(i: number, amp: number, dur = 1) {
    this.stim.push({ i0: Math.max(0, i - 1), i1: Math.min(this.N - 1, i + 1), amp, until: this.t + dur });
  }
  pushing(i: number) {
    return this.stim.some((s) => i >= s.i0 && i <= s.i1 && this.t < s.until);
  }
  step(dt: number) {
    const { V, m, h, n, N, k, next } = this;
    for (let i = 0; i < N; i++) {
      const v = V[i], l = V[i > 0 ? i - 1 : i], r = V[i < N - 1 ? i + 1 : i];
      let I = k * (l + r - 2 * v);
      for (const s of this.stim) if (i >= s.i0 && i <= s.i1 && this.t < s.until) I += s.amp;
      const a = iNa(v, m[i], h[i]), b = iK(v, n[i]);
      this.ina[i] = a;
      this.ik[i] = b;
      next[i] = v + dt * (I - a - b - iL(v)) / HH.C;
      m[i] = gate(m[i], am(v), bm(v), dt);
      h[i] = gate(h[i], ah(v), bh(v), dt);
      n[i] = gate(n[i], an(v), bn(v), dt);
    }
    V.set(next);
    this.t += dt;
    this.stim = this.stim.filter((s) => this.t < s.until);
  }
}
