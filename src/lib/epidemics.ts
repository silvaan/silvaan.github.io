// An outbreak among people who wander around a box. A sick person passes the
// disease to anyone within reach at a fixed rate and recovers at rate γ, so
// on average a case infects R0 = β/γ others while everyone around is still
// susceptible, the same R0 as in the SIR equations. The infection rate is set
// from R0 through the density, and fast wandering keeps the crowd mixed, so
// the counts follow the equations up to chance.

export const S = 0, I = 1, R = 2, V = 3;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Sample = { day: number; s: number; i: number; r: number; v: number };

export type OutbreakOptions = {
  n: number;
  w: number;
  h: number;
  r0: number;
  /** Fraction immunised before it starts. */
  vax?: number;
  /** People sick at day 0; the first sits in the middle. */
  seeds?: number;
  seed?: number;
  /** Mean days a case stays sick, 1/γ. */
  sick?: number;
  /** Reach of one person, in pixels. */
  reach?: number;
  /** Wandering speed in pixels per day. */
  speed?: number;
};

export class Outbreak {
  n: number; w: number; h: number; r0: number; vax: number; sick: number; reach: number; speed: number;
  x: Float32Array; y: Float32Array; head: Float32Array;
  state: Uint8Array;
  /** Day each person fell sick (or -1), who infected them (-1 for a seed), and their generation. */
  tInf: Float32Array; parent: Int32Array; gen: Int16Array; kids: Uint16Array;
  day = 0;
  counts = { s: 0, i: 0, r: 0, v: 0 };
  ever = 0;
  history: Sample[] = [];
  /** The day the last case recovered, or -1 while it goes on. */
  over = -1;
  private rng: () => number;
  private lambda: number;
  private cols: number; private rows: number;
  private cellHead: Int32Array; private next: Int32Array;

  constructor(o: OutbreakOptions) {
    this.n = o.n; this.w = o.w; this.h = o.h; this.r0 = o.r0;
    this.vax = o.vax ?? 0;
    this.sick = o.sick ?? 5;
    this.reach = o.reach ?? 12;
    this.speed = o.speed ?? 40;
    this.rng = mulberry32(o.seed ?? 1);
    const n = this.n, rnd = this.rng;
    this.x = new Float32Array(n); this.y = new Float32Array(n); this.head = new Float32Array(n);
    this.state = new Uint8Array(n);
    this.tInf = new Float32Array(n).fill(-1);
    this.parent = new Int32Array(n).fill(-1);
    this.gen = new Int16Array(n).fill(-1);
    this.kids = new Uint16Array(n);
    for (let k = 0; k < n; k++) {
      this.x[k] = rnd() * this.w;
      this.y[k] = rnd() * this.h;
      this.head[k] = rnd() * Math.PI * 2;
    }
    // immunise a random share, then seed among the rest
    const order = Array.from({ length: n }, (_, k) => k);
    for (let k = n - 1; k > 0; k--) {
      const j = Math.floor(rnd() * (k + 1));
      [order[k], order[j]] = [order[j], order[k]];
    }
    const nv = Math.round(this.vax * n);
    for (let k = 0; k < nv; k++) this.state[order[k]] = V;
    const seeds = Math.min(o.seeds ?? 1, n - nv);
    for (let k = 0; k < seeds; k++) {
      const p = order[nv + k];
      this.state[p] = I;
      this.tInf[p] = 0;
      this.gen[p] = 0;
      if (k === 0) { this.x[p] = this.w / 2; this.y[p] = this.h / 2; }
    }
    // contact rate per sick person: lambda while within reach, times the
    // chance someone is within reach, gives β = R0 γ
    const area = this.w * this.h, disk = Math.PI * this.reach * this.reach;
    this.lambda = (this.r0 / this.sick) * area / (disk * this.n * this.edge());
    this.cols = Math.max(1, Math.floor(this.w / this.reach));
    this.rows = Math.max(1, Math.floor(this.h / this.reach));
    this.cellHead = new Int32Array(this.cols * this.rows);
    this.next = new Int32Array(n);
    this.tally();
    this.record();
  }

  /** Share of a reach disk that falls inside the box, averaged over the box. */
  private edge() {
    const r = this.reach, P = 2 * (this.w + this.h), A = this.w * this.h;
    return 1 - (2 * r * P) / (3 * Math.PI * A);
  }

  private tally() {
    let s = 0, i = 0, r = 0, v = 0;
    for (let k = 0; k < this.n; k++) {
      const st = this.state[k];
      if (st === S) s++; else if (st === I) i++; else if (st === R) r++; else v++;
    }
    this.counts = { s, i, r, v };
    this.ever = i + r;
  }

  private record() {
    this.history.push({ day: this.day, ...this.counts });
  }

  step(dt: number) {
    const n = this.n, rnd = this.rng, sp = this.speed * dt;
    // wander: straight lines that slowly bend, bouncing off the walls
    for (let k = 0; k < n; k++) {
      this.head[k] += (rnd() - 0.5) * 3 * Math.sqrt(dt);
      let x = this.x[k] + Math.cos(this.head[k]) * sp, y = this.y[k] + Math.sin(this.head[k]) * sp;
      if (x < 0) { x = -x; this.head[k] = Math.PI - this.head[k]; }
      if (x > this.w) { x = 2 * this.w - x; this.head[k] = Math.PI - this.head[k]; }
      if (y < 0) { y = -y; this.head[k] = -this.head[k]; }
      if (y > this.h) { y = 2 * this.h - y; this.head[k] = -this.head[k]; }
      this.x[k] = x; this.y[k] = y;
    }
    // bucket everyone into cells one reach wide
    this.cellHead.fill(-1);
    const cw = this.w / this.cols, ch = this.h / this.rows;
    const cellOf = (k: number) =>
      Math.min(this.rows - 1, Math.floor(this.y[k] / ch)) * this.cols + Math.min(this.cols - 1, Math.floor(this.x[k] / cw));
    for (let k = 0; k < n; k++) {
      const c = cellOf(k);
      this.next[k] = this.cellHead[c];
      this.cellHead[c] = k;
    }
    // infect, then recover, both decided on the state at the start of the step
    const p = 1 - Math.exp(-this.lambda * dt), q = 1 - Math.exp(-dt / this.sick), r2 = this.reach * this.reach;
    const sickNow: number[] = [];
    for (let k = 0; k < n; k++) if (this.state[k] === I) sickNow.push(k);
    const fresh: number[] = [];
    for (const k of sickNow) {
      const cx = Math.min(this.cols - 1, Math.floor(this.x[k] / cw)), cy = Math.min(this.rows - 1, Math.floor(this.y[k] / ch));
      for (let yy = Math.max(0, cy - 1); yy <= Math.min(this.rows - 1, cy + 1); yy++)
        for (let xx = Math.max(0, cx - 1); xx <= Math.min(this.cols - 1, cx + 1); xx++)
          for (let j = this.cellHead[yy * this.cols + xx]; j >= 0; j = this.next[j]) {
            if (this.state[j] !== S) continue;
            const dx = this.x[j] - this.x[k], dy = this.y[j] - this.y[k];
            if (dx * dx + dy * dy > r2 || rnd() >= p) continue;
            this.state[j] = 9; // claimed this step
            this.parent[j] = k;
            this.gen[j] = this.gen[k] + 1;
            this.kids[k]++;
            fresh.push(j);
          }
    }
    this.day += dt;
    for (const k of sickNow) if (rnd() < q) this.state[k] = R;
    for (const j of fresh) { this.state[j] = I; this.tInf[j] = this.day; }
    this.tally();
    const last = this.history[this.history.length - 1];
    if (this.day - last.day >= 0.25 || (this.counts.i === 0 && this.over < 0)) this.record();
    if (this.counts.i === 0 && this.over < 0) this.over = this.day;
  }
}

/**
 * What the SIR equations predict starting from a share s0 susceptible and a
 * vanishing share sick: the share of everyone who ever gets it, and the
 * highest share sick at once.
 */
export function predict(r0: number, s0 = 1) {
  if (r0 * s0 <= 1) return { attack: 0, peak: 0 };
  let sInf = 0;
  for (let k = 0; k < 200; k++) sInf = s0 * Math.exp(-r0 * (s0 - sInf));
  return { attack: s0 - sInf, peak: s0 - 1 / r0 - Math.log(r0 * s0) / r0 };
}
