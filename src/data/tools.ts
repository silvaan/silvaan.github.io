// Metadata describing the "Tools" section: areas and their simulators.
// Each simulator's `href` points to a real page under src/pages/simulations/<area>/<sim>.astro

export interface Simulator {
  slug: string;
  title: string;
  description: string;
  href: string;
  status?: 'live' | 'soon';
}

export interface Area {
  slug: string;
  title: string;
  description: string;
  icon: string; // inline SVG path data (24x24 viewBox)
  simulators: Simulator[];
}

export const AREAS: Area[] = [
  {
    slug: 'calculus',
    title: 'Calculus',
    description: 'Limits, derivatives, integrals and the geometry behind them.',
    icon: 'M3 3v18h18 M7 16c2-9 5-9 7 0s4 6 5 0',
    simulators: [
      {
        slug: 'riemann-sum',
        title: 'Riemann Sums',
        description:
          'Approximate the area under a curve with rectangles and watch it converge to the integral.',
        href: '/simulations/calculus/riemann-sum',
        status: 'live',
      },
      {
        slug: 'scalar-fields',
        title: 'Scalar Fields & Gradients',
        description:
          'Drag a tiny probe through a 3D density cloud. An arrow shows the direction of steepest increase, with the gradient magnitude alongside.',
        href: '/simulations/calculus/scalar-fields',
        status: 'live',
      },
    ],
  },
  {
    slug: 'linear-algebra',
    title: 'Linear Algebra',
    description: 'Vectors, matrices and the transformations they encode.',
    icon: 'M4 4h7v7H4z M13 13h7v7h-7z M11 4l9 9 M4 11l9 9',
    simulators: [
      {
        slug: 'linear-transformation',
        title: '2D Linear Transformations',
        description:
          'Drag the matrix entries and see how the plane, grid and basis vectors deform.',
        href: '/simulations/linear-algebra/linear-transformation',
        status: 'live',
      },
    ],
  },
  {
    slug: 'deep-learning',
    title: 'Deep Learning',
    description: 'Optimization, neural networks and the math that trains them.',
    icon: 'M12 3v4 M12 17v4 M5 7l3 2 M16 15l3 2 M5 17l3-2 M16 9l3-2 M12 9a3 3 0 100 6 3 3 0 000-6z',
    simulators: [
      {
        slug: 'gradient-descent',
        title: 'Gradient Descent',
        description:
          'Tune the learning rate and starting point to watch optimization roll downhill — or diverge.',
        href: '/simulations/deep-learning/gradient-descent',
        status: 'live',
      },
    ],
  },
  {
    slug: 'physics',
    title: 'Physics',
    description: 'Fields and the equations that move energy through space.',
    icon: 'M13 2 L4 14 h6 l-1 8 9-12 h-6 z',
    simulators: [
      {
        slug: 'em-fields',
        title: 'Electric & Magnetic Fields',
        description:
          'Orbit a 3D scene of charges and currents, switching between electric field lines and the magnetic field around a wire.',
        href: '/simulations/physics/em-fields',
        status: 'live',
      },
      {
        slug: 'heat-equation',
        title: 'Heat Equation',
        description:
          'Watch temperature diffuse across a room from a radiator and a cold window, and paint in your own heat.',
        href: '/simulations/physics/heat-equation',
        status: 'live',
      },
    ],
  },
];

export function getArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}
