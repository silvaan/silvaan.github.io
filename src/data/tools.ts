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
        slug: 'derivative-limit',
        title: 'Derivative as a Limit',
        description:
          'Slide the secant line as h shrinks to zero and watch it settle into the tangent and the derivative born from a limit.',
        href: '/simulations/calculus/derivative-limit',
        status: 'live',
      },
      {
        slug: 'riemann-sum',
        title: 'Riemann Sums',
        description:
          'Approximate the area under a curve with rectangles and watch it converge to the integral.',
        href: '/simulations/calculus/riemann-sum',
        status: 'live',
      },
      {
        slug: 'taylor-series',
        title: 'Taylor Series',
        description:
          'Add polynomial terms one by one and watch the approximation hug a curve near a point, then fall apart past its radius of convergence.',
        href: '/simulations/calculus/taylor-series',
        status: 'live',
      },
      {
        slug: 'fourier-series',
        title: 'Fourier Series',
        description:
          'Stack rotating circles (epicycles) to build a square, sawtooth or triangle wave from pure sine harmonics.',
        href: '/simulations/calculus/fourier-series',
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
      {
        slug: 'eigenvectors',
        title: 'Eigenvectors & Eigenvalues',
        description:
          'Spin a vector around the circle and watch where the matrix sends it. When the input and output line up, you have found an eigenvector.',
        href: '/simulations/linear-algebra/eigenvectors',
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
          'Tune the learning rate and starting point to watch optimization roll downhill, or diverge.',
        href: '/simulations/deep-learning/gradient-descent',
        status: 'live',
      },
      {
        slug: 'optimizers',
        title: 'Optimizer Showdown',
        description:
          'Race SGD, Momentum, NAG, RMSProp and Adam down a 3D loss surface and watch how differently they descend.',
        href: '/simulations/deep-learning/optimizers',
        status: 'live',
      },
      {
        slug: 'optimizers-3d',
        title: 'Optimizers in a 3D Field',
        description:
          'Same optimizer race, but the loss is a volumetric density cloud and the balls move freely through 3D space toward the densest cores.',
        href: '/simulations/deep-learning/optimizers-3d',
        status: 'live',
      },
    ],
  },
  {
    slug: 'statistics',
    title: 'Statistics',
    description: 'Randomness, distributions and the patterns that emerge from them.',
    icon: 'M3 20h18 M3 20c4 0 5-13 9-13s5 13 9 13',
    simulators: [
      {
        slug: 'central-limit-theorem',
        title: 'Central Limit Theorem',
        description:
          'Average samples from any distribution and watch the means pile up into a Gaussian, faster as the sample size grows.',
        href: '/simulations/statistics/central-limit-theorem',
        status: 'live',
      },
      {
        slug: 'least-squares',
        title: 'Least Squares',
        description:
          'Drag data points and fit the best line live. The residuals are drawn as literal squares, least squares minimises their total area.',
        href: '/simulations/statistics/least-squares',
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
