// Builds the catalogue files for the Cosmology simulations from the published
// surveys, so nothing under public/data/cosmos is edited by hand.
//
//   node scripts/build-cosmos-data.mjs [cache-dir]
//
// Downloads (once, into cache-dir) and converts:
//   HYG v4.0 star database (Hipparcos + Yale + Gliese), CC BY-SA 4.0, astronexus
//   McConnachie (2012) Local Group catalogue, VizieR J/AJ/144/4
//   2MASS Redshift Survey (Huchra et al. 2012), VizieR J/ApJS/199/26
//   SDSS DR16 quasar catalogue (Lyke et al. 2020), VizieR VII/289
//
// Every position is equatorial J2000 Cartesian: x towards RA 0 Dec 0, z towards
// the north celestial pole. Stars are in parsecs, galaxies and quasars in Mpc.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const CACHE = path.resolve(process.argv[2] ?? 'node_modules/.cache/cosmos');
const OUT = path.resolve('public/data/cosmos');
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const VIZ = 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-out.max=unlimited&';
const SOURCES = {
  'hyg.csv.gz': 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v40.csv.gz',
  'mcc.tsv': VIZ + '-source=J/AJ/144/4/catalog&-out=Name,MType,RAJ2000,DEJ2000,D,VMag,R2',
  '2mrs.tsv': VIZ + '-source=J/ApJS/199/26/table3&-out=RAJ2000,DEJ2000,Ktmag,cz,type,CAT',
  'dr16q.tsv': VIZ + '-source=VII/289&-out=RAJ2000,DEJ2000,z&z=>0.05',
};

async function get(name) {
  const file = path.join(CACHE, name);
  if (!fs.existsSync(file)) {
    console.log('downloading', name);
    const res = await fetch(SOURCES[name]);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const buf = fs.readFileSync(file);
  return (name.endsWith('.gz') ? zlib.gunzipSync(buf) : buf).toString('utf8');
}

// --- Planck 2018 cosmology, for turning redshift into distance -------------
const C = 299792.458, H0 = 67.66, OM = 0.3111, OR = 9.1e-5, OL = 1 - OM - OR;
const E = (z) => Math.sqrt(OR * (1 + z) ** 4 + OM * (1 + z) ** 3 + OL);
/** Comoving distance today, Mpc. */
function comoving(z) {
  const n = Math.max(64, Math.ceil(z * 200));
  let s = 0;
  for (let i = 0; i < n; i++) s += 1 / E(((i + 0.5) / n) * z);
  return (C / H0) * (s * z) / n;
}

const RAD = Math.PI / 180;
const cart = (raDeg, decDeg, d) => {
  const a = raDeg * RAD, b = decDeg * RAD;
  return [d * Math.cos(b) * Math.cos(a), d * Math.cos(b) * Math.sin(a), d * Math.sin(b)];
};
const sexa = (s, hours) => {
  const [a, b = 0, c = 0] = s.trim().split(/\s+/).map(Number);
  const sign = s.trim().startsWith('-') ? -1 : 1;
  const v = Math.abs(a) + b / 60 + c / 3600;
  return sign * v * (hours ? 15 : 1);
};

/** Rows of a VizieR TSV as objects, skipping the comment, unit and rule lines. */
function tsv(text) {
  const lines = text.split('\n').filter((l) => l && !l.startsWith('#'));
  const head = lines[0].split('\t').map((h) => h.trim());
  return lines.slice(3).map((l) => {
    const cells = l.split('\t');
    return Object.fromEntries(head.map((h, i) => [h, (cells[i] ?? '').trim()]));
  });
}

/** Header (u32 count, u32 stride in floats) then the floats. */
function writeF32(name, rows, stride) {
  const buf = Buffer.alloc(8 + rows.length * stride * 4);
  buf.writeUInt32LE(rows.length, 0);
  buf.writeUInt32LE(stride, 4);
  rows.forEach((r, i) => r.forEach((v, j) => buf.writeFloatLE(v, 8 + (i * stride + j) * 4)));
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(name, rows.length, (buf.length / 1024).toFixed(0) + ' KB');
}

// --- stars ----------------------------------------------------------------
{
  const text = await get('hyg.csv.gz');
  const lines = text.split('\n');
  const head = lines[0].split(',').map((h) => h.replace(/"/g, ''));
  const col = Object.fromEntries(head.map((h, i) => [h, i]));
  const rows = [], named = [];
  for (const line of lines.slice(1)) {
    if (!line) continue;
    // fields never contain commas except inside quotes, which HYG leaves empty or plain
    const f = line.split(',').map((s) => s.replace(/"/g, ''));
    const dist = +f[col.dist], mag = +f[col.mag];
    if (!(dist > 0) || dist >= 100000) continue;
    if (!(mag <= 8 || dist <= 50)) continue;
    const ci = f[col.ci] === '' ? 0.65 : +f[col.ci];
    rows.push([+f[col.x], +f[col.y], +f[col.z], +f[col.absmag], ci]);
    const name = f[col.proper];
    if (name && name !== 'Sol')
      named.push({ n: name, i: rows.length - 1, d: +dist.toPrecision(4), m: +mag.toFixed(2), s: f[col.spect] });
  }
  writeF32('stars.bin', rows, 5);
  fs.writeFileSync(path.join(OUT, 'stars.json'), JSON.stringify(named));
}

// --- Local Group ------------------------------------------------------------
{
  const rows = tsv(await get('mcc.tsv'));
  const out = [];
  for (const r of rows) {
    const d = +r.D;
    if (!r.D || !(d > 0)) continue; // the Milky Way itself has no distance
    const ra = sexa(r.RAJ2000, true), dec = sexa(r.DEJ2000, false);
    const [x, y, z] = cart(ra, dec, d / 1000);
    out.push({
      n: r.Name.replace(/\s+/g, ' '),
      t: r.MType.replace(/\?+/g, '').trim(),
      p: [x, y, z].map((v) => +v.toFixed(5)), // Mpc
      d: d, // kpc
      M: r.VMag === '' ? null : +r.VMag,
      r: r.R2 === '' ? null : +r.R2, // half-light radius, pc
    });
  }
  fs.writeFileSync(path.join(OUT, 'local-group.json'), JSON.stringify(out));
  console.log('local-group.json', out.length);
}

// --- 2MASS Redshift Survey --------------------------------------------------
{
  const rows = tsv(await get('2mrs.tsv'));
  const out = [], named = [];
  for (const r of rows) {
    const cz = +r.cz;
    if (!(cz > 300)) continue; // closer than this the Hubble flow is lost in peculiar motion; the Local Group file covers it
    const z = cz / C, d = comoving(z), K = +r.Ktmag;
    const [x, y, zz] = cart(+r.RAJ2000, +r.DEJ2000, d);
    // absolute K magnitude, a stand-in for stellar mass and so for size
    const dl = d * (1 + z);
    const MK = K - 5 * Math.log10(dl * 1e6 / 10);
    // morphology from the 2MRS type code: negative is early type, >=1 spiral
    const tcode = parseFloat(r.type);
    const early = Number.isFinite(tcode) && tcode <= 0 ? 1 : 0;
    out.push([x, y, zz, MK, early]);
    const cat = r.CAT;
    if (/^(MESSIER|NGC|IC)_/.test(cat) && (K < 7.5 || cat.startsWith('MESSIER')))
      named.push({ n: cat.replace('MESSIER_0', 'M').replace('MESSIER_', 'M').replace('_0', ' ').replace('_', ' ').replace(/ 0+/, ' '), i: out.length - 1, z: +z.toFixed(5) });
  }
  writeF32('galaxies.bin', out, 5);
  fs.writeFileSync(path.join(OUT, 'galaxies.json'), JSON.stringify(named));
}

// --- SDSS quasars -----------------------------------------------------------
{
  const rows = tsv(await get('dr16q.tsv'));
  // a fixed-seed subsample keeps the survey's footprint and redshift spread
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const keep = rows.filter((r) => +r.z > 0.05 && (+r.z > 5 || rnd() < 0.06));
  // tabulate distance once, the integral is the slow part
  const ztab = [], dtab = [];
  for (let z = 0; z <= 7.6; z += 0.005) { ztab.push(z); dtab.push(comoving(z)); }
  const dist = (z) => { const i = Math.min(ztab.length - 2, Math.floor(z / 0.005)); const f = (z - ztab[i]) / 0.005; return dtab[i] + f * (dtab[i + 1] - dtab[i]); };
  const out = keep.map((r) => [...cart(+r.RAJ2000, +r.DEJ2000, dist(+r.z)), +r.z]);
  writeF32('quasars.bin', out, 4);
}
