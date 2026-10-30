// A reaction chamber for E + S ⇌ ES → E + P, molecule by molecule.
// Substrate and inhibitor fly in straight lines at one speed, turning a
// little at random, so the rate at which they hit a free enzyme is the gas
// result 2·R·v·n per enzyme. Binding with a fixed chance per contact,
// unbinding and catalysis at fixed rates then give Michaelis–Menten with
//   Km = (k_off + k_cat) / k_on,   k_on = stick · 2·R·v / area,
// counting [S] as free substrate molecules in the chamber. Fresh substrate
// flows in as it is used, so [S] holds steady and the rate can be measured.

export const K = {
  /** Molecule speed, px/s. */
  speed: 150,
  /** Enzyme radius and the contact distance for binding, px. */
  enzR: 24,
  capture: 30,
  /** Per second. */
  kcat: 1.2,
  koff: 0.6,
  kiOff: 1.2,
  /** Chance that one contact with a free enzyme ends in binding. */
  stick: 1,
};
/** Defaults, for putting the constants back. */
export const K0 = { ...K };

export type Mol = {
  x: number; y: number; vx: number; vy: number;
  kind: 'S' | 'I' | 'P';
  /** Enzyme it sits in, or −1. */
  e: number;
  /** Seconds since it was made, bound or released. */
  age: number;
  /** Where it was caught, for the glide into the pocket. */
  fx: number; fy: number;
  /** Seconds left in which it cannot bind (just released). */
  shy: number;
  spin: number;
};
export type Enz = { x: number; y: number; vx: number; vy: number; ang: number; w: number; m: Mol | null; busy: number };

/** Small seeded generator, so a reset starts from the same picture. */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Chamber {
  mols: Mol[] = [];
  enz: Enz[] = [];
  /** Times at which a product was made. */
  made: number[] = [];
  t = 0;
  total = 0;
  private owed = { S: 0, I: 0 };
  private want = { S: 0, I: 0 };
  constructor(readonly w: number, readonly h: number, private rnd = rng(1)) {}

  /** Pair rate constant per second, for one free enzyme and one free molecule. */
  kon() {
    return (K.stick * 2 * K.capture * K.speed) / (this.w * this.h - this.enz.length * Math.PI * K.enzR ** 2);
  }
  km() {
    return (K.koff + K.kcat) / this.kon();
  }
  ki() {
    return K.kiOff / this.kon();
  }

  private mol(kind: 'S' | 'I', x?: number, y?: number): Mol {
    const r = this.rnd, a = r() * Math.PI * 2;
    let px = x ?? 8 + r() * (this.w - 16), py = y ?? 8 + r() * (this.h - 16);
    if (x === undefined) {
      // keep clear of the enzymes
      for (let k = 0; k < 20 && this.enz.some((e) => Math.hypot(e.x - px, e.y - py) < K.capture + 4); k++) {
        px = 8 + r() * (this.w - 16);
        py = 8 + r() * (this.h - 16);
      }
    }
    return { x: px, y: py, vx: K.speed * Math.cos(a), vy: K.speed * Math.sin(a), kind, e: -1, age: 0, fx: 0, fy: 0, shy: 0, spin: r() * 6.28 };
  }
  /** One molecule in through a wall, heading inwards. */
  private inflow(kind: 'S' | 'I') {
    const r = this.rnd, side = Math.floor(r() * 4);
    const m = this.mol(kind, 0, 0);
    const u = r();
    if (side === 0) { m.x = 4; m.y = u * this.h; m.vx = Math.abs(m.vx); }
    else if (side === 1) { m.x = this.w - 4; m.y = u * this.h; m.vx = -Math.abs(m.vx); }
    else if (side === 2) { m.y = 4; m.x = u * this.w; m.vy = Math.abs(m.vy); }
    else { m.y = this.h - 4; m.x = u * this.w; m.vy = -Math.abs(m.vy); }
    this.mols.push(m);
  }
  private free(kind: 'S' | 'I') {
    let n = 0;
    for (const m of this.mols) if (m.kind === kind && m.e < 0) n++;
    return n;
  }
  /** Hold `n` free molecules of a kind: add or remove free ones to match. */
  set(kind: 'S' | 'I', n: number) {
    this.want[kind] = n;
    this.owed[kind] = 0;
    let have = this.free(kind);
    while (have < n) { this.mols.push(this.mol(kind)); have++; }
    for (let i = this.mols.length - 1; i >= 0 && have > n; i--) {
      const m = this.mols[i];
      if (m.kind === kind && m.e < 0) { this.mols.splice(i, 1); have--; }
    }
  }
  setEnzymes(n: number) {
    const r = this.rnd;
    while (this.enz.length > n) {
      const e = this.enz.pop()!;
      if (e.m) { e.m.e = -1; e.m.shy = 0.3; }
    }
    while (this.enz.length < n) {
      let x = 0, y = 0;
      for (let k = 0; k < 60; k++) {
        x = 40 + r() * (this.w - 80);
        y = 40 + r() * (this.h - 80);
        if (this.enz.every((e) => Math.hypot(e.x - x, e.y - y) > 3 * K.enzR)) break;
      }
      const a = r() * 6.28;
      this.enz.push({ x, y, vx: 14 * Math.cos(a), vy: 14 * Math.sin(a), ang: r() * 6.28, w: (r() - 0.5) * 0.6, m: null, busy: 0 });
    }
    this.mols.forEach((m) => { if (m.e >= this.enz.length) m.e = -1; });
  }
  reset(nS: number, nE: number, nI: number) {
    this.rnd = rng(1);
    this.mols = [];
    this.enz = [];
    this.made = [];
    this.t = 0;
    this.total = 0;
    this.setEnzymes(nE);
    this.set('S', nS);
    this.set('I', nI);
  }

  /** The pocket's mouth on enzyme e. */
  pocket(e: Enz) {
    return { x: e.x + Math.cos(e.ang) * (K.enzR - 5), y: e.y + Math.sin(e.ang) * (K.enzR - 5) };
  }

  step(dt: number) {
    const r = this.rnd, W = this.w, H = this.h;
    this.t += dt;
    // enzymes drift, turn and bounce
    for (const e of this.enz) {
      e.x += e.vx * dt; e.y += e.vy * dt; e.ang += e.w * dt;
      if (e.x < K.enzR) { e.x = K.enzR; e.vx = Math.abs(e.vx); }
      if (e.x > W - K.enzR) { e.x = W - K.enzR; e.vx = -Math.abs(e.vx); }
      if (e.y < K.enzR) { e.y = K.enzR; e.vy = Math.abs(e.vy); }
      if (e.y > H - K.enzR) { e.y = H - K.enzR; e.vy = -Math.abs(e.vy); }
      if (e.m) e.busy += dt;
    }
    for (let i = 0; i < this.enz.length; i++)
      for (let j = i + 1; j < this.enz.length; j++) {
        const a = this.enz[i], b = this.enz[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 2 * K.enzR + 6 && d > 0) {
          const nx = dx / d, ny = dy / d, push = (2 * K.enzR + 6 - d) / 2;
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
          [a.vx, a.vy, b.vx, b.vy] = [b.vx, b.vy, a.vx, a.vy];
        }
      }

    // what the bound molecules do: let go, or get changed
    for (const e of this.enz) {
      const m = e.m;
      if (!m) continue;
      m.age += dt;
      const p = this.pocket(e);
      const g = Math.min(1, m.age / 0.15);
      m.x = m.fx + (p.x - m.fx) * g;
      m.y = m.fy + (p.y - m.fy) * g;
      const off = m.kind === 'S' ? K.koff : K.kiOff;
      const u = r();
      if (m.kind === 'S' && u < K.kcat * dt) {
        // the substrate leaves as product, flying out of the pocket
        m.kind = 'P';
        this.release(e, m);
        this.made.push(this.t);
        this.total++;
      } else if (u > 1 - off * dt) {
        this.release(e, m);
        this.owed[m.kind as 'S' | 'I']++;
      }
    }

    // free molecules fly, turn a little, bounce, and bind on contact
    for (const m of this.mols) {
      if (m.e >= 0) continue;
      m.age += dt;
      m.spin += dt * 2;
      if (m.shy > 0) m.shy -= dt;
      if (m.kind !== 'P') {
        const turn = (r() - 0.5) * 2.4 * Math.sqrt(dt), c = Math.cos(turn), s = Math.sin(turn);
        [m.vx, m.vy] = [m.vx * c - m.vy * s, m.vx * s + m.vy * c];
      }
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.x < 4) { m.x = 4; m.vx = Math.abs(m.vx); }
      if (m.x > W - 4) { m.x = W - 4; m.vx = -Math.abs(m.vx); }
      if (m.y < 4) { m.y = 4; m.vy = Math.abs(m.vy); }
      if (m.y > H - 4) { m.y = H - 4; m.vy = -Math.abs(m.vy); }
      if (m.kind === 'P') continue;
      for (let k = 0; k < this.enz.length; k++) {
        const e = this.enz[k], dx = m.x - e.x, dy = m.y - e.y, d2 = dx * dx + dy * dy;
        if (d2 > K.capture * K.capture) continue;
        // one chance per contact: only while closing in, and a miss bounces off
        const d = Math.sqrt(d2) || 1, nx = dx / d, ny = dy / d, vn = (m.vx - e.vx) * nx + (m.vy - e.vy) * ny;
        if (vn >= 0) continue;
        if (!e.m && m.shy <= 0 && r() < K.stick) {
          e.m = m;
          e.busy = 0;
          m.e = k;
          m.age = 0;
          m.fx = m.x;
          m.fy = m.y;
          this.topUp(m.kind as 'S' | 'I');
          break;
        }
        // a busy enzyme, a missed chance or a just-released molecule: bounce off
        m.vx -= 2 * vn * nx; m.vy -= 2 * vn * ny;
      }
    }
    // products drift out and are gone after a while
    this.mols = this.mols.filter((m) => m.kind !== 'P' || m.age < 2.6);
    // forget products older than a minute
    while (this.made.length && this.made[0] < this.t - 60) this.made.shift();
  }

  private release(e: Enz, m: Mol) {
    const out = { x: Math.cos(e.ang), y: Math.sin(e.ang) };
    const p = this.pocket(e);
    m.e = -1;
    m.age = 0;
    m.x = p.x; m.y = p.y;
    const sp = m.kind === 'P' ? K.speed * 0.5 : K.speed;
    m.vx = out.x * sp + e.vx; m.vy = out.y * sp + e.vy;
    m.shy = 0.25;
    e.m = null;
  }
  /** A bound molecule is replaced by a fresh one flowing in, unless one came back free earlier. */
  private topUp(kind: 'S' | 'I') {
    if (this.owed[kind] > 0) this.owed[kind]--;
    else if (this.want[kind] > 0) this.inflow(kind);
  }

  /** Products per second over the last `win` seconds (or since `since`). */
  rate(win: number, since = 0) {
    const from = Math.max(this.t - win, since), span = this.t - from;
    if (span < 0.5) return NaN;
    let n = 0;
    for (let i = this.made.length - 1; i >= 0 && this.made[i] > from; i--) n++;
    return n / span;
  }
  busy() {
    let n = 0;
    for (const e of this.enz) if (e.m?.kind === 'S') n++;
    return n;
  }
  blocked() {
    let n = 0;
    for (const e of this.enz) if (e.m?.kind === 'I') n++;
    return n;
  }
}
