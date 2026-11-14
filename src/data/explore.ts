// Everything the site needs to help people find their way around the
// simulators, kept apart from tools.ts so the catalogue stays plain data:
// a colour per area, hand-made paths through related sims, the date each sim
// went live (read from git) and whether a thumbnail exists for it.

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { AREAS, type Area, type Simulator } from './tools';

/** One accent per area, used for the eyebrow, icons, dots and card edges. */
export const AREA_COLOR: Record<string, string> = {
  calculus: '#818cf8',
  'linear-algebra': '#c084fc',
  statistics: '#f472b6',
  'machine-learning': '#fb923c',
  'deep-learning': '#38bdf8',
  'computer-vision': '#2dd4bf',
  'generative-ai': '#f87171',
  biology: '#4ade80',
  physics: '#fbbf24',
  cosmology: '#e879f9',
  electronics: '#a3e635',
};

/** Cosmology used to share the eye icon with Computer Vision. */
const ICON_OVERRIDE: Record<string, string> = {
  cosmology:
    'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M12 3c5 0 9 4 9 9 M12 21c-5 0-9-4-9-9 M5.6 6.4C8 4.4 12 5 14 8 M18.4 17.6C16 19.6 12 19 10 16',
};

export function areaColor(slug: string) {
  return AREA_COLOR[slug] ?? '#818cf8';
}
export function areaIcon(area: Area) {
  return ICON_OVERRIDE[area.slug] ?? area.icon;
}

export interface SimEntry extends Simulator {
  area: Area;
  /** `<area>/<slug>`, the path under /simulations. */
  key: string;
  color: string;
  /** ISO date the page first appeared in git; undefined when uncommitted. */
  added?: string;
  thumb?: { dark: string; light: string };
  og?: string;
}

/* ---------- when each sim went live ---------- */

function readDates(): Map<string, string> {
  const dates = new Map<string, string>();
  try {
    const log = execSync(
      'git log --diff-filter=A --format=%x01%aI --name-only -- src/pages/simulations',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 << 20 }
    );
    // newest first, so the last date seen for a file is the first time it was added
    for (const block of log.split('\x01')) {
      const [date, ...files] = block.trim().split('\n');
      for (const f of files) {
        const m = f.match(/^src\/pages\/simulations\/(.+)\.astro$/);
        if (m) dates.set(m[1], date.slice(0, 10));
      }
    }
  } catch {
    /* no git (or a shallow clone): no dates, no "new" badges */
  }
  return dates;
}

const DATES = readDates();
const today = new Date().toISOString().slice(0, 10);

/* ---------- the flat catalogue ---------- */

function thumbFor(key: string) {
  const dark = `/thumbs/${key}.webp`;
  const light = `/thumbs/${key}-light.webp`;
  return existsSync(`public${dark}`) ? { dark, light: existsSync(`public${light}`) ? light : dark } : undefined;
}

export const SIMS: SimEntry[] = AREAS.flatMap((area) =>
  area.simulators
    .filter((s) => s.status !== 'soon')
    .map((s) => {
      const key = s.href.replace('/simulations/', '');
      const og = `/og/${key}.jpg`;
      return {
        ...s,
        area,
        key,
        color: areaColor(area.slug),
        // a page that is live but not committed yet is as new as it gets
        added: DATES.get(key) ?? (DATES.size ? today : undefined),
        thumb: thumbFor(key),
        og: existsSync(`public${og}`) ? og : undefined,
      };
    })
);

const BY_KEY = new Map(SIMS.map((s) => [s.key, s]));
export function sim(key: string) {
  return BY_KEY.get(key);
}

/** Most recently added first. */
export function newest(n: number) {
  return SIMS.filter((s) => s.added)
    .sort((a, b) => (b.added! < a.added! ? -1 : b.added! > a.added! ? 1 : 0))
    .slice(0, n);
}

/** A sim counts as new for three weeks after it went live. */
export function isNew(s: SimEntry) {
  if (!s.added) return false;
  return Date.now() - new Date(s.added).valueOf() < 21 * 864e5;
}

/* ---------- paths ---------- */

export interface Trail {
  slug: string;
  title: string;
  blurb: string;
  steps: string[];
}

/** Hand-made routes through sims that build on each other, across areas. */
export const TRAILS: Trail[] = [
  {
    slug: 'derivatives',
    title: 'Derivatives from scratch',
    blurb: 'From one secant line to the shape of a surface.',
    steps: [
      'calculus/derivative-limit',
      'calculus/derivative-rules',
      'calculus/curvature',
      'calculus/taylor-series',
      'calculus/partial-derivatives',
      'calculus/hessian',
      'calculus/lagrange-multipliers',
    ],
  },
  {
    slug: 'integral-theorems',
    title: 'The great integral theorems',
    blurb: 'One idea, four times: the inside cancels and only the edge is left.',
    steps: [
      'calculus/fundamental-theorem',
      'calculus/line-integral',
      'calculus/divergence-curl',
      'calculus/stokes-theorem',
      'calculus/gauss-theorem',
    ],
  },
  {
    slug: 'matrices',
    title: 'Matrices as motion',
    blurb: 'A matrix is a way to move the plane. Everything else follows.',
    steps: [
      'linear-algebra/linear-transformation',
      'linear-algebra/matrix-multiplication',
      'linear-algebra/determinant',
      'linear-algebra/eigenvectors',
      'linear-algebra/svd',
      'machine-learning/pca',
    ],
  },
  {
    slug: 'learning',
    title: 'How a network learns',
    blurb: 'Bend space, measure the error, follow the gradient downhill.',
    steps: [
      'deep-learning/space-warping',
      'deep-learning/neural-net',
      'deep-learning/backpropagation',
      'deep-learning/optimizers',
      'deep-learning/batch-noise',
      'deep-learning/signal-propagation',
    ],
  },
  {
    slug: 'attention',
    title: 'The road to attention',
    blurb: 'Every piece a transformer needs, one sim at a time.',
    steps: [
      'linear-algebra/dot-product',
      'deep-learning/softmax',
      'deep-learning/embeddings',
      'deep-learning/positional-encoding',
      'deep-learning/attention',
      'generative-ai/autoregressive',
    ],
  },
  {
    slug: 'data-shape',
    title: 'Seeing the shape of data',
    blurb: 'Squash many dimensions into two without lying too much.',
    steps: [
      'statistics/covariance',
      'machine-learning/pca',
      'machine-learning/perplexity',
      'machine-learning/tsne',
      'machine-learning/umap',
    ],
  },
  {
    slug: 'evolution',
    title: 'Evolution by numbers',
    blurb: 'Populations, chance and selection, written as simple rules.',
    steps: [
      'biology/population-growth',
      'biology/genetic-drift',
      'biology/natural-selection',
      'biology/predator-prey',
      'biology/epidemics',
    ],
  },
  {
    slug: 'waves',
    title: 'Waves everywhere',
    blurb: 'A string, a room full of Wi-Fi, and the same equation underneath.',
    steps: [
      'physics/wave-equation',
      'physics/normal-modes',
      'physics/wave-interference',
      'physics/em-waves',
      'physics/wifi-house',
    ],
  },
  {
    slug: 'quantum',
    title: 'Quantum, step by step',
    blurb: 'Waves of probability, measurement, spin and qubits.',
    steps: [
      'physics/schrodinger',
      'physics/wavefunction-collapse',
      'physics/stern-gerlach',
      'physics/atomic-orbitals',
      'physics/quantum-gates',
    ],
  },
  {
    slug: 'spacetime',
    title: 'Bending spacetime',
    blurb: 'From moving clocks to black holes to the expanding universe.',
    steps: [
      'physics/special-relativity',
      'physics/schwarzschild',
      'physics/black-hole',
      'cosmology/hubble-expansion',
      'cosmology/observable-universe',
    ],
  },
].map((t) => ({ ...t, steps: t.steps.filter((k) => BY_KEY.has(k)) }));

/** The paths a sim belongs to, with its neighbours on each. */
export function trailsFor(key: string) {
  return TRAILS.filter((t) => t.steps.includes(key)).map((t) => {
    const i = t.steps.indexOf(key);
    return {
      trail: t,
      index: i,
      prev: i > 0 ? sim(t.steps[i - 1]) : undefined,
      next: i < t.steps.length - 1 ? sim(t.steps[i + 1]) : undefined,
    };
  });
}

/** The sims either side of this one in its own area, wrapping round. */
export function areaNeighbours(key: string) {
  const s = sim(key);
  if (!s) return {};
  const list = SIMS.filter((x) => x.area.slug === s.area.slug);
  const i = list.indexOf(s);
  return {
    prev: list[(i - 1 + list.length) % list.length],
    next: list[(i + 1) % list.length],
  };
}
