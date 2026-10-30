// Trains an autoencoder off the main thread, so the page can animate while it
// learns. It is sent the pictures and a job; it reports snapshots of the codes
// as they move, then the weights and a mosaic of what every part of the map
// decodes to.

import { AE } from './autoencoder';

export type Job = { L: number; steps: number; every: number; shown: number; focal: number };
export type Snap = { step: number; codes: Float32Array; recon: Float32Array; error: number };
export type Done = {
  weights: Float32Array;
  error: number;
  /** The part of the map drawn: x0, x1, y0, y1 of the first two numbers. */
  box: number[];
  /** n × n decoded pictures, row by row from the top. */
  n: number;
  mosaic: Float32Array;
  done: true;
};

const N = 18;
let X: Float32Array[] = [];

self.onmessage = (e: MessageEvent<{ pictures: Float32Array[]; job: Job }>) => {
  X = e.data.pictures;
  run(e.data.job);
};

const post = (m: object, t: Transferable[]) => (self as unknown as Worker).postMessage(m, t);

function snap(net: AE, j: Job) {
  const codes = new Float32Array(j.shown * j.L), c = new Float32Array(j.L);
  for (let k = 0; k < j.shown; k++) {
    net.encode(X[k], c);
    codes.set(c, k * j.L);
  }
  net.encode(X[j.focal], c);
  const s: Snap = { step: net.steps, codes, recon: Float32Array.from(net.decode(c)), error: net.error(X, 7) };
  post(s, [s.codes.buffer, s.recon.buffer]);
}

function finish(net: AE, j: Job) {
  const L = j.L, c = new Float32Array(L);
  const lo = Array(L).fill(Infinity), hi = Array(L).fill(-Infinity), mean = Array(L).fill(0);
  for (const x of X) {
    net.encode(x, c);
    for (let i = 0; i < L; i++) {
      lo[i] = Math.min(lo[i], c[i]);
      hi[i] = Math.max(hi[i], c[i]);
      mean[i] += c[i] / X.length;
    }
  }
  for (let i = 0; i < L; i++) {
    const pad = (hi[i] - lo[i]) * 0.12 + 0.05;
    lo[i] -= pad;
    hi[i] += pad;
  }
  const box = [lo[0], hi[0], lo[1], hi[1]];
  const mosaic = new Float32Array(N * N * 256), z = new Float32Array(L), img = new Float32Array(256);
  for (let gy = 0; gy < N; gy++)
    for (let gx = 0; gx < N; gx++) {
      z[0] = box[0] + ((gx + 0.5) / N) * (box[1] - box[0]);
      z[1] = box[3] - ((gy + 0.5) / N) * (box[3] - box[2]);
      for (let i = 2; i < L; i++) z[i] = mean[i];
      net.decode(z, img);
      mosaic.set(img, (gy * N + gx) * 256);
    }
  const d: Done = { weights: net.weights(), error: net.error(X), box, n: N, mosaic, done: true };
  post(d, [d.weights.buffer, d.mosaic.buffer]);
}

function run(j: Job) {
  const net = new AE(X[0].length, j.L, 3, 48);
  snap(net, j);
  while (net.steps < j.steps) {
    net.step(X, 12);
    if (net.steps % j.every === 0) snap(net, j);
  }
  finish(net, j);
}
