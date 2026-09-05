// Trains the two classifiers the MNIST simulation shows, then writes their
// weights out small enough to ship with the page. Run once, offline; the page
// itself only ever does a forward pass.
//
// Fetch the four idx files first, then run this from the repository root:
//
//   mkdir -p /tmp/mnist && cd /tmp/mnist
//   for f in train-images-idx3-ubyte train-labels-idx1-ubyte \
//            t10k-images-idx3-ubyte t10k-labels-idx1-ubyte; do
//     curl -sO "https://storage.googleapis.com/cvdf-datasets/mnist/$f.gz"
//     gunzip -f "$f.gz"
//   done
//   node scripts/train-mnist.mjs      # about three minutes
//
// It writes /tmp/mnist/mnist-weights.json; the twenty sample digits are added
// to that file separately before it is copied to src/data/.
import fs from 'node:fs';

const DIR = process.env.MNIST_DIR ?? '/tmp/mnist';

function readImages(file) {
  const b = fs.readFileSync(`${DIR}/${file}`);
  const n = b.readUInt32BE(4), h = b.readUInt32BE(8), w = b.readUInt32BE(12);
  const out = new Float32Array(n * h * w);
  for (let i = 0; i < out.length; i++) out[i] = b[16 + i] / 255;
  return { data: out, n, h, w };
}
function readLabels(file) {
  const b = fs.readFileSync(`${DIR}/${file}`);
  const n = b.readUInt32BE(4);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = b[8 + i];
  return out;
}

const tr = readImages('train-images-idx3-ubyte');
const trY = readLabels('train-labels-idx1-ubyte');
const te = readImages('t10k-images-idx3-ubyte');
const teY = readLabels('t10k-labels-idx1-ubyte');
console.log(`train ${tr.n} test ${te.n} at ${tr.h}x${tr.w}`);

// --- a seeded normal, so a rerun gives the same model -----------------------
let seed = 12345;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd());

// --- Adam over a flat parameter list ----------------------------------------
class Adam {
  constructor(tensors, lr = 0.002) {
    this.t = tensors;
    this.lr = lr;
    this.m = tensors.map((x) => new Float32Array(x.length));
    this.v = tensors.map((x) => new Float32Array(x.length));
    this.k = 0;
  }
  step(grads) {
    this.k++;
    const c1 = 1 - Math.pow(0.9, this.k), c2 = 1 - Math.pow(0.999, this.k);
    for (let i = 0; i < this.t.length; i++) {
      const w = this.t[i], g = grads[i], m = this.m[i], v = this.v[i];
      for (let j = 0; j < w.length; j++) {
        m[j] = 0.9 * m[j] + 0.1 * g[j];
        v[j] = 0.999 * v[j] + 0.001 * g[j] * g[j];
        w[j] -= (this.lr * (m[j] / c1)) / (Math.sqrt(v[j] / c2) + 1e-8);
      }
    }
  }
}

const softmax = (z) => {
  let mx = -Infinity;
  for (const v of z) mx = Math.max(mx, v);
  let s = 0;
  const p = new Float32Array(z.length);
  for (let i = 0; i < z.length; i++) { p[i] = Math.exp(z[i] - mx); s += p[i]; }
  for (let i = 0; i < z.length; i++) p[i] /= s;
  return p;
};

// ============================================================ MLP 784-40-20-10
function trainMLP({ epochs = 8, batch = 64, ntrain = 60000 } = {}) {
  const S = [784, 40, 20, 10];
  const W = [], B = [];
  for (let l = 0; l < 3; l++) {
    const w = new Float32Array(S[l + 1] * S[l]);
    const sd = Math.sqrt(2 / S[l]);
    for (let i = 0; i < w.length; i++) w[i] = gauss() * sd;
    W.push(w);
    B.push(new Float32Array(S[l + 1]));
  }
  const params = [W[0], B[0], W[1], B[1], W[2], B[2]];
  const opt = new Adam(params, 0.002);
  const grads = params.map((p) => new Float32Array(p.length));

  const a = [new Float32Array(784), new Float32Array(40), new Float32Array(20), new Float32Array(10)];

  const forward = (x) => {
    a[0].set(x);
    for (let l = 0; l < 3; l++) {
      const nIn = S[l], nOut = S[l + 1], w = W[l], b = B[l];
      for (let j = 0; j < nOut; j++) {
        let s = b[j];
        const off = j * nIn;
        for (let i = 0; i < nIn; i++) s += w[off + i] * a[l][i];
        a[l + 1][j] = l < 2 ? Math.max(0, s) : s;
      }
    }
    return softmax(a[3]);
  };

  const order = Array.from({ length: ntrain }, (_, i) => i);
  const steps = Math.floor((ntrain * epochs) / batch);
  let cursor = ntrain;
  for (let s = 0; s < steps; s++) {
    for (const g of grads) g.fill(0);
    for (let n = 0; n < batch; n++) {
      if (cursor >= ntrain) {
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        cursor = 0;
      }
      const idx = order[cursor++];
      const p = forward(tr.data.subarray(idx * 784, idx * 784 + 784));
      const d = [null, new Float32Array(40), new Float32Array(20), new Float32Array(10)];
      for (let j = 0; j < 10; j++) d[3][j] = (p[j] - (j === trY[idx] ? 1 : 0)) / batch;
      for (let l = 2; l >= 0; l--) {
        const nIn = S[l], nOut = S[l + 1];
        const gw = grads[l * 2], gb = grads[l * 2 + 1];
        for (let j = 0; j < nOut; j++) {
          const g = d[l + 1][j];
          if (g === 0) continue;
          const off = j * nIn;
          for (let i = 0; i < nIn; i++) gw[off + i] += g * a[l][i];
          gb[j] += g;
        }
        if (l > 0) {
          const dp = d[l];
          for (let j = 0; j < nOut; j++) {
            const g = d[l + 1][j];
            if (g === 0) continue;
            const off = j * nIn;
            for (let i = 0; i < nIn; i++) dp[i] += W[l][off + i] * g;
          }
          for (let i = 0; i < nIn; i++) if (a[l][i] <= 0) dp[i] = 0;
        }
      }
    }
    opt.step(grads);
    if (s % 500 === 0) console.log(`  mlp step ${s}/${steps}`);
  }

  let ok = 0;
  for (let i = 0; i < te.n; i++) {
    const p = forward(te.data.subarray(i * 784, i * 784 + 784));
    let b = 0;
    for (let j = 1; j < 10; j++) if (p[j] > p[b]) b = j;
    if (b === teY[i]) ok++;
  }
  console.log(`  mlp test accuracy ${((ok / te.n) * 100).toFixed(2)}%`);
  return { W, B, acc: ok / te.n };
}

// ==================================== CNN 8 conv, pool, 16 conv, pool, dense
const C1 = 8, C2 = 16, K = 3;
const H1 = 26, P1 = 13, H2 = 11, P2 = 5, FLAT = C2 * P2 * P2;

function trainCNN({ epochs = 4, batch = 32, ntrain = 24000 } = {}) {
  const W1 = new Float32Array(C1 * K * K), b1 = new Float32Array(C1);
  const W2 = new Float32Array(C2 * C1 * K * K), b2 = new Float32Array(C2);
  const W3 = new Float32Array(10 * FLAT), b3 = new Float32Array(10);
  for (let i = 0; i < W1.length; i++) W1[i] = gauss() * Math.sqrt(2 / 9);
  for (let i = 0; i < W2.length; i++) W2[i] = gauss() * Math.sqrt(2 / (C1 * 9));
  for (let i = 0; i < W3.length; i++) W3[i] = gauss() * Math.sqrt(2 / FLAT);
  const params = [W1, b1, W2, b2, W3, b3];
  const opt = new Adam(params, 0.002);
  const grads = params.map((p) => new Float32Array(p.length));

  const z1 = new Float32Array(C1 * H1 * H1), a1 = new Float32Array(C1 * H1 * H1);
  const p1 = new Float32Array(C1 * P1 * P1), i1 = new Int32Array(C1 * P1 * P1);
  const z2 = new Float32Array(C2 * H2 * H2), a2 = new Float32Array(C2 * H2 * H2);
  const p2 = new Float32Array(FLAT), i2 = new Int32Array(FLAT);
  const logit = new Float32Array(10);

  function forward(x) {
    for (let c = 0; c < C1; c++)
      for (let y = 0; y < H1; y++)
        for (let xx = 0; xx < H1; xx++) {
          let s = b1[c];
          for (let ky = 0; ky < K; ky++)
            for (let kx = 0; kx < K; kx++) s += W1[c * 9 + ky * K + kx] * x[(y + ky) * 28 + (xx + kx)];
          const o = c * H1 * H1 + y * H1 + xx;
          z1[o] = s;
          a1[o] = s > 0 ? s : 0;
        }
    for (let c = 0; c < C1; c++)
      for (let y = 0; y < P1; y++)
        for (let xx = 0; xx < P1; xx++) {
          let best = -Infinity, bi = 0;
          for (let dy = 0; dy < 2; dy++)
            for (let dx = 0; dx < 2; dx++) {
              const o = c * H1 * H1 + (y * 2 + dy) * H1 + (xx * 2 + dx);
              if (a1[o] > best) { best = a1[o]; bi = o; }
            }
          const o = c * P1 * P1 + y * P1 + xx;
          p1[o] = best;
          i1[o] = bi;
        }
    for (let c = 0; c < C2; c++)
      for (let y = 0; y < H2; y++)
        for (let xx = 0; xx < H2; xx++) {
          let s = b2[c];
          for (let d = 0; d < C1; d++)
            for (let ky = 0; ky < K; ky++)
              for (let kx = 0; kx < K; kx++)
                s += W2[((c * C1 + d) * K + ky) * K + kx] * p1[d * P1 * P1 + (y + ky) * P1 + (xx + kx)];
          const o = c * H2 * H2 + y * H2 + xx;
          z2[o] = s;
          a2[o] = s > 0 ? s : 0;
        }
    for (let c = 0; c < C2; c++)
      for (let y = 0; y < P2; y++)
        for (let xx = 0; xx < P2; xx++) {
          let best = -Infinity, bi = 0;
          for (let dy = 0; dy < 2; dy++)
            for (let dx = 0; dx < 2; dx++) {
              const o = c * H2 * H2 + (y * 2 + dy) * H2 + (xx * 2 + dx);
              if (a2[o] > best) { best = a2[o]; bi = o; }
            }
          const o = c * P2 * P2 + y * P2 + xx;
          p2[o] = best;
          i2[o] = bi;
        }
    for (let j = 0; j < 10; j++) {
      let s = b3[j];
      const off = j * FLAT;
      for (let i = 0; i < FLAT; i++) s += W3[off + i] * p2[i];
      logit[j] = s;
    }
    return softmax(logit);
  }

  const dp2 = new Float32Array(FLAT), da2 = new Float32Array(C2 * H2 * H2);
  const dp1 = new Float32Array(C1 * P1 * P1), da1 = new Float32Array(C1 * H1 * H1);

  const order = Array.from({ length: ntrain }, (_, i) => i);
  const steps = Math.floor((ntrain * epochs) / batch);
  let cursor = ntrain;
  for (let s = 0; s < steps; s++) {
    for (const g of grads) g.fill(0);
    for (let n = 0; n < batch; n++) {
      if (cursor >= ntrain) {
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        cursor = 0;
      }
      const idx = order[cursor++];
      const x = tr.data.subarray(idx * 784, idx * 784 + 784);
      const p = forward(x);
      dp2.fill(0); da2.fill(0); dp1.fill(0); da1.fill(0);

      const dl = new Float32Array(10);
      for (let j = 0; j < 10; j++) dl[j] = (p[j] - (j === trY[idx] ? 1 : 0)) / batch;
      for (let j = 0; j < 10; j++) {
        const g = dl[j], off = j * FLAT;
        for (let i = 0; i < FLAT; i++) {
          grads[4][off + i] += g * p2[i];
          dp2[i] += W3[off + i] * g;
        }
        grads[5][j] += g;
      }
      for (let i = 0; i < FLAT; i++) da2[i2[i]] += dp2[i];
      for (let i = 0; i < da2.length; i++) if (z2[i] <= 0) da2[i] = 0;

      for (let c = 0; c < C2; c++)
        for (let y = 0; y < H2; y++)
          for (let xx = 0; xx < H2; xx++) {
            const g = da2[c * H2 * H2 + y * H2 + xx];
            if (g === 0) continue;
            grads[3][c] += g;
            for (let d = 0; d < C1; d++)
              for (let ky = 0; ky < K; ky++)
                for (let kx = 0; kx < K; kx++) {
                  const wi = ((c * C1 + d) * K + ky) * K + kx;
                  const pi = d * P1 * P1 + (y + ky) * P1 + (xx + kx);
                  grads[2][wi] += g * p1[pi];
                  dp1[pi] += W2[wi] * g;
                }
          }
      for (let i = 0; i < dp1.length; i++) da1[i1[i]] += dp1[i];
      for (let i = 0; i < da1.length; i++) if (z1[i] <= 0) da1[i] = 0;

      for (let c = 0; c < C1; c++)
        for (let y = 0; y < H1; y++)
          for (let xx = 0; xx < H1; xx++) {
            const g = da1[c * H1 * H1 + y * H1 + xx];
            if (g === 0) continue;
            grads[1][c] += g;
            for (let ky = 0; ky < K; ky++)
              for (let kx = 0; kx < K; kx++)
                grads[0][c * 9 + ky * K + kx] += g * x[(y + ky) * 28 + (xx + kx)];
          }
    }
    opt.step(grads);
    if (s % 200 === 0) console.log(`  cnn step ${s}/${steps}`);
  }

  let ok = 0;
  for (let i = 0; i < te.n; i++) {
    const p = forward(te.data.subarray(i * 784, i * 784 + 784));
    let b = 0;
    for (let j = 1; j < 10; j++) if (p[j] > p[b]) b = j;
    if (b === teY[i]) ok++;
  }
  console.log(`  cnn test accuracy ${((ok / te.n) * 100).toFixed(2)}%`);
  return { W1, b1, W2, b2, W3, b3, acc: ok / te.n };
}

// --- shipping the weights ---------------------------------------------------
/** One tensor as int8 with a single scale: small enough to ship, exact enough to infer with. */
function pack(arr) {
  let mx = 0;
  for (const v of arr) mx = Math.max(mx, Math.abs(v));
  const scale = mx / 127 || 1;
  const q = Buffer.alloc(arr.length);
  for (let i = 0; i < arr.length; i++) q[i] = Math.round(arr[i] / scale) + 128;
  return { scale, b64: q.toString('base64') };
}

console.log('training the mlp');
const mlp = trainMLP();
console.log('training the cnn');
const cnn = trainCNN();

const out = {
  note: 'Trained on MNIST offline; the page only runs the forward pass.',
  mlp: {
    arch: [784, 40, 20, 10],
    acc: +(mlp.acc * 100).toFixed(2),
    t: [pack(mlp.W[0]), pack(mlp.B[0]), pack(mlp.W[1]), pack(mlp.B[1]), pack(mlp.W[2]), pack(mlp.B[2])],
  },
  cnn: {
    shape: { c1: C1, c2: C2, k: K, h1: H1, p1: P1, h2: H2, p2: P2, flat: FLAT },
    acc: +(cnn.acc * 100).toFixed(2),
    t: [pack(cnn.W1), pack(cnn.b1), pack(cnn.W2), pack(cnn.b2), pack(cnn.W3), pack(cnn.b3)],
  },
};
fs.writeFileSync(`${DIR}/mnist-weights.json`, JSON.stringify(out));
console.log('wrote', (fs.statSync(`${DIR}/mnist-weights.json`).size / 1024).toFixed(0), 'KB');
