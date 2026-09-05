// The two MNIST classifiers the simulation shows, already trained.
//
// Training happened once, offline, on the real 60,000 MNIST images; what ships
// here is only the weights, quantised to a byte each, and the forward pass.
// Every intermediate is handed back so the page can draw what each layer did
// rather than only the answer.

import weights from '../data/mnist-weights.json';

export const ACCURACY = { mlp: weights.mlp.acc as number, cnn: weights.cnn.acc as number };
export const MLP_ARCH = weights.mlp.arch as number[];
export const CNN = weights.cnn.shape as {
  c1: number; c2: number; k: number; h1: number; p1: number; h2: number; p2: number; flat: number;
};

/** int8 with one scale per tensor, which costs nothing an inference can notice. */
function unpack(t: { scale: number; b64: string }): Float32Array {
  const bin = atob(t.b64);
  const out = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = (bin.charCodeAt(i) - 128) * t.scale;
  return out;
}
const M = (weights.mlp.t as { scale: number; b64: string }[]).map(unpack);
const C = (weights.cnn.t as { scale: number; b64: string }[]).map(unpack);

/** Twenty real test images, two of each digit, for the page to start from. */
export function samples(): { img: Float32Array; label: number }[] {
  const s = weights.samples as { n: number; labels: number[]; b64: string };
  const bin = atob(s.b64);
  return Array.from({ length: s.n }, (_, k) => {
    const img = new Float32Array(784);
    for (let i = 0; i < 784; i++) img[i] = bin.charCodeAt(k * 784 + i) / 255;
    return { img, label: s.labels[k] };
  });
}

function softmax(z: Float32Array) {
  let mx = -Infinity;
  for (const v of z) mx = Math.max(mx, v);
  const p = new Float32Array(z.length);
  let s = 0;
  for (let i = 0; i < z.length; i++) { p[i] = Math.exp(z[i] - mx); s += p[i]; }
  for (let i = 0; i < z.length; i++) p[i] /= s;
  return p;
}

export type MlpRun = { h1: Float32Array; h2: Float32Array; p: Float32Array };

export function mlpForward(x: Float32Array): MlpRun {
  const [W1, B1, W2, B2, W3, B3] = M;
  const [n0, n1, n2, n3] = MLP_ARCH;
  const h1 = new Float32Array(n1), h2 = new Float32Array(n2), z = new Float32Array(n3);
  for (let j = 0; j < n1; j++) {
    let s = B1[j];
    const off = j * n0;
    for (let i = 0; i < n0; i++) s += W1[off + i] * x[i];
    h1[j] = s > 0 ? s : 0;
  }
  for (let j = 0; j < n2; j++) {
    let s = B2[j];
    const off = j * n1;
    for (let i = 0; i < n1; i++) s += W2[off + i] * h1[i];
    h2[j] = s > 0 ? s : 0;
  }
  for (let j = 0; j < n3; j++) {
    let s = B3[j];
    const off = j * n2;
    for (let i = 0; i < n2; i++) s += W3[off + i] * h2[i];
    z[j] = s;
  }
  return { h1, h2, p: softmax(z) };
}

/** What one first-layer unit is looking for, as a picture of its weights. */
export function mlpUnitImage(unit: number): Float32Array {
  const W1 = M[0];
  const out = new Float32Array(784);
  for (let i = 0; i < 784; i++) out[i] = W1[unit * 784 + i];
  return out;
}

/** The weights arriving at one unit, for the deeper layers where they are not a picture. */
export function mlpWeightsInto(layer: number, unit: number): Float32Array {
  if (layer === 1) return M[2].slice(unit * MLP_ARCH[1], (unit + 1) * MLP_ARCH[1]);
  if (layer === 2) return M[4].slice(unit * MLP_ARCH[2], (unit + 1) * MLP_ARCH[2]);
  // layer -1: the dense layer that ends the convolutional network
  return C[4].slice(unit * CNN.flat, (unit + 1) * CNN.flat);
}

export type CnnRun = {
  a1: Float32Array; // c1 × h1 × h1, after ReLU
  p1: Float32Array; // c1 × p1 × p1, after max pooling
  a2: Float32Array; // c2 × h2 × h2
  p2: Float32Array; // c2 × p2 × p2
  p: Float32Array;
};

export function cnnForward(x: Float32Array): CnnRun {
  const [W1, b1, W2, b2, W3, b3] = C;
  const { c1, c2, k, h1, p1, h2, p2, flat } = CNN;
  const A1 = new Float32Array(c1 * h1 * h1);
  for (let c = 0; c < c1; c++)
    for (let y = 0; y < h1; y++)
      for (let xx = 0; xx < h1; xx++) {
        let s = b1[c];
        for (let ky = 0; ky < k; ky++)
          for (let kx = 0; kx < k; kx++) s += W1[c * 9 + ky * k + kx] * x[(y + ky) * 28 + (xx + kx)];
        A1[c * h1 * h1 + y * h1 + xx] = s > 0 ? s : 0;
      }
  const P1 = new Float32Array(c1 * p1 * p1);
  for (let c = 0; c < c1; c++)
    for (let y = 0; y < p1; y++)
      for (let xx = 0; xx < p1; xx++) {
        let best = -Infinity;
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++)
            best = Math.max(best, A1[c * h1 * h1 + (y * 2 + dy) * h1 + (xx * 2 + dx)]);
        P1[c * p1 * p1 + y * p1 + xx] = best;
      }
  const A2 = new Float32Array(c2 * h2 * h2);
  for (let c = 0; c < c2; c++)
    for (let y = 0; y < h2; y++)
      for (let xx = 0; xx < h2; xx++) {
        let s = b2[c];
        for (let d = 0; d < c1; d++)
          for (let ky = 0; ky < k; ky++)
            for (let kx = 0; kx < k; kx++)
              s += W2[((c * c1 + d) * k + ky) * k + kx] * P1[d * p1 * p1 + (y + ky) * p1 + (xx + kx)];
        A2[c * h2 * h2 + y * h2 + xx] = s > 0 ? s : 0;
      }
  const P2 = new Float32Array(flat);
  for (let c = 0; c < c2; c++)
    for (let y = 0; y < p2; y++)
      for (let xx = 0; xx < p2; xx++) {
        let best = -Infinity;
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++)
            best = Math.max(best, A2[c * h2 * h2 + (y * 2 + dy) * h2 + (xx * 2 + dx)]);
        P2[c * p2 * p2 + y * p2 + xx] = best;
      }
  const z = new Float32Array(10);
  for (let j = 0; j < 10; j++) {
    let s = b3[j];
    const off = j * flat;
    for (let i = 0; i < flat; i++) s += W3[off + i] * P2[i];
    z[j] = s;
  }
  return { a1: A1, p1: P1, a2: A2, p2: P2, p: softmax(z) };
}

/** One first-layer filter as a 3 by 3 picture. */
export function cnnFilter(c: number): Float32Array {
  return C[0].slice(c * 9, c * 9 + 9);
}

/** The kernel a second-layer map applies to one of the maps below it. */
export function cnnFilter2(out: number, into: number): Float32Array {
  const off = (out * CNN.c1 + into) * 9;
  return C[2].slice(off, off + 9);
}

/**
 * MNIST is not raw ink: every digit was cropped to its bounding box, scaled so
 * the longer side is 20 pixels, and placed by its centre of mass in the middle
 * of a 28 by 28 field. Anything drawn by hand has to be put through the same
 * treatment or the model is being asked about pictures it never saw.
 */
export function normalise(src: Float32Array, size: number): Float32Array {
  let x0 = size, y0 = size, x1 = -1, y1 = -1;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (src[y * size + x] > 0.08) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const out = new Float32Array(784);
  if (x1 < 0) return out;

  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const scale = 20 / Math.max(bw, bh);
  const tw = Math.max(1, Math.round(bw * scale)), th = Math.max(1, Math.round(bh * scale));
  // area average, so thinning a thick stroke keeps its weight
  const box = new Float32Array(tw * th);
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++) {
      const sx0 = x0 + (x * bw) / tw, sx1 = x0 + ((x + 1) * bw) / tw;
      const sy0 = y0 + (y * bh) / th, sy1 = y0 + ((y + 1) * bh) / th;
      let s = 0, n = 0;
      for (let yy = Math.floor(sy0); yy < Math.ceil(sy1); yy++)
        for (let xx = Math.floor(sx0); xx < Math.ceil(sx1); xx++) {
          if (yy < 0 || xx < 0 || yy >= size || xx >= size) continue;
          s += src[yy * size + xx];
          n++;
        }
      box[y * tw + x] = n ? s / n : 0;
    }

  let mx = 0, my = 0, m = 0;
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++) {
      const v = box[y * tw + x];
      mx += x * v;
      my += y * v;
      m += v;
    }
  const cx = m ? mx / m : tw / 2, cy = m ? my / m : th / 2;
  const ox = Math.round(14 - cx), oy = Math.round(14 - cy);
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++) {
      const px = x + ox, py = y + oy;
      if (px < 0 || py < 0 || px > 27 || py > 27) continue;
      out[py * 28 + px] = Math.min(1, box[y * tw + x]);
    }
  return out;
}
