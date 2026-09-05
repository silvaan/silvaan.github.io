// Handwritten-looking digits, the shape MNIST has, generated in the page.
//
// The real MNIST files are 11 MB and would have to be fetched, so the glyphs
// are drawn from the system font instead and then knocked about the way a
// handwritten sample is: rotated a little, shifted, thickened or thinned. What
// comes out is the same thing every simulation here needs, a 28 by 28 grey
// image of a digit, without the page having to download anything.

export type Digit = { img: Float64Array; label: number };

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `count` digits at `size` by `size`, values in 0..1. Pass `only` to restrict
 * which digits appear, which keeps a latent space readable.
 */
export function digitSet(count: number, size = 28, seed = 1, only?: number[]): Digit[] {
  const pool = only ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const rnd = mulberry32(seed);
  const pad = 8; // room to rotate in before the glyph is cropped
  const S = size + pad * 2;
  const off = document.createElement('canvas');
  off.width = S;
  off.height = S;
  const c = off.getContext('2d', { willReadFrequently: true })!;

  const out: Digit[] = [];
  for (let n = 0; n < count; n++) {
    const label = pool[Math.floor(rnd() * pool.length)];
    c.fillStyle = '#000';
    c.fillRect(0, 0, S, S);
    c.save();
    c.translate(S / 2 + (rnd() - 0.5) * 2.5, S / 2 + (rnd() - 0.5) * 2.5);
    c.rotate((rnd() - 0.5) * 0.42);
    // a little shear reads as slant, which is most of what varies in handwriting
    c.transform(1, 0, (rnd() - 0.5) * 0.34, 1, 0, 0);
    const scale = 0.78 + rnd() * 0.24;
    c.scale(scale, scale * (0.92 + rnd() * 0.18));
    c.fillStyle = '#fff';
    c.strokeStyle = '#fff';
    c.lineWidth = 1 + rnd() * 2.4;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `${rnd() < 0.5 ? '600' : '400'} ${Math.round(size * 0.96)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    c.fillText(String(label), 0, 0);
    c.strokeText(String(label), 0, 0);
    c.restore();

    const data = c.getImageData(pad, pad, size, size).data;
    const img = new Float64Array(size * size);
    for (let i = 0; i < img.length; i++) img[i] = data[i * 4] / 255;
    blur(img, size);
    out.push({ img, label });
  }
  return out;
}

/** One light smoothing pass, so the strokes have MNIST's soft edges. */
function blur(img: Float64Array, size: number) {
  const src = img.slice();
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let s = 0, w = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy < 0 || xx < 0 || yy >= size || xx >= size) continue;
          const k = dy === 0 && dx === 0 ? 4 : 1;
          s += src[yy * size + xx] * k;
          w += k;
        }
      img[y * size + x] = Math.min(1, s / w);
    }
}

/** One digit, centred and clean, for a page that only needs a picture. */
export function oneDigit(label: number, size = 28, seed = 3): Float64Array {
  const rnd = mulberry32(seed);
  const pad = 8, S = size + pad * 2;
  const off = document.createElement('canvas');
  off.width = S;
  off.height = S;
  const c = off.getContext('2d', { willReadFrequently: true })!;
  c.fillStyle = '#000';
  c.fillRect(0, 0, S, S);
  c.save();
  c.translate(S / 2, S / 2);
  c.rotate((rnd() - 0.5) * 0.2);
  c.fillStyle = '#fff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `600 ${Math.round(size * 1.0)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  c.fillText(String(label), 0, 0);
  c.restore();
  const data = c.getImageData(pad, pad, size, size).data;
  const img = new Float64Array(size * size);
  for (let i = 0; i < img.length; i++) img[i] = data[i * 4] / 255;
  blur(img, size);
  return img;
}
