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
      {
        slug: 'lagrange-multipliers',
        title: 'Lagrange Multipliers',
        description:
          'Optimize along a constraint and watch the objective contour kiss the constraint curve, exactly where the two gradients line up.',
        href: '/simulations/calculus/lagrange-multipliers',
        status: 'live',
      },
      {
        slug: 'tangent-plane',
        title: 'Tangent Plane & Directional Derivative',
        description:
          'Ride a point over a 3D surface with its tangent plane attached, and watch the slope change with direction, steepest along the gradient.',
        href: '/simulations/calculus/tangent-plane',
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
        slug: 'random-walk',
        title: 'Random Walk & Diffusion',
        description:
          'Thousands of aimless walkers spread from a point into a Gaussian whose width grows like the square root of time, the particle view of diffusion.',
        href: '/simulations/statistics/random-walk',
        status: 'live',
      },
      {
        slug: 'monte-carlo',
        title: 'Monte Carlo Estimation of π',
        description:
          'Throw random darts at a square with a circle inside and count the hits. The fraction inside estimates π, converging slowly as 1/√n.',
        href: '/simulations/statistics/monte-carlo',
        status: 'live',
      },
      {
        slug: 'bayes-theorem',
        title: "Bayes' Theorem",
        description:
          'See why a 90% accurate test for a rare disease is usually wrong when it says positive. 1,000 people as dots make the posterior obvious.',
        href: '/simulations/statistics/bayes-theorem',
        status: 'live',
      },
      {
        slug: 'mle',
        title: 'Maximum Likelihood',
        description:
          'Slide a Gaussian over sample data and watch the likelihood rise and fall. The best fit lands exactly on the sample mean and standard deviation.',
        href: '/simulations/statistics/mle',
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
      {
        slug: 'wasserstein',
        title: 'Wasserstein Distance',
        description:
          'Measure the distance between two distributions as the least work to reshape one into the other, the area between their CDFs.',
        href: '/simulations/statistics/wasserstein',
        status: 'live',
      },
    ],
  },
  {
    slug: 'machine-learning',
    title: 'Machine Learning',
    description: 'Clustering, model fitting and the ideas that turn data into predictions.',
    icon: 'M4.4 7 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0 M4.4 14 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0 M9.9 10.5 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0 M16.4 8 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0 M16.4 15 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0',
    simulators: [
      {
        slug: 'kmeans',
        title: 'k-Means Clustering',
        description:
          'Assign points to the nearest center, move each center to its mean, repeat. Watch clusters snap into place, and sometimes into the wrong place.',
        href: '/simulations/machine-learning/kmeans',
        status: 'live',
      },
      {
        slug: 'dbscan',
        title: 'DBSCAN',
        description:
          'Density-based clustering that finds arbitrary shapes and flags outliers as noise, with no need to choose the number of clusters up front.',
        href: '/simulations/machine-learning/dbscan',
        status: 'live',
      },
      {
        slug: 'hierarchical',
        title: 'Hierarchical Clustering',
        description:
          'Merge the closest groups over and over to build a dendrogram, then slice it at any height to read off clusters at that scale.',
        href: '/simulations/machine-learning/hierarchical',
        status: 'live',
      },
      {
        slug: 'overfitting',
        title: 'Overfitting & Regularization',
        description:
          'Raise a polynomial’s degree until it threads every training point yet fails on new data, then tame it with regularization.',
        href: '/simulations/machine-learning/overfitting',
        status: 'live',
      },
      {
        slug: 'activations',
        title: 'Activation Functions',
        description:
          'Compare sigmoid, tanh, ReLU and friends alongside their derivatives, and see where flat slopes make gradients vanish.',
        href: '/simulations/machine-learning/activations',
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
      {
        slug: 'neural-net',
        title: 'Neural Network Playground',
        description:
          'Train a small neural network to separate two classes of dots and watch its decision boundary bend and fold in real time.',
        href: '/simulations/deep-learning/neural-net',
        status: 'live',
      },
      {
        slug: 'image-convolution',
        title: 'Image Convolution',
        description:
          'Slide a kernel over an image to detect edges, blur or sharpen, and see how stride, padding and dilation reshape the output feature map.',
        href: '/simulations/deep-learning/image-convolution',
        status: 'live',
      },
    ],
  },
  {
    slug: 'generative-ai',
    title: 'Generative AI',
    description: 'How models learn to produce new text, one token at a time.',
    icon: 'M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z M18.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z',
    simulators: [
      {
        slug: 'autoregressive',
        title: 'Autoregressive Models',
        description:
          'Predict the next character from the text so far, sample it, append, repeat. The same next-token loop that powers large language models.',
        href: '/simulations/generative-ai/autoregressive',
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
        slug: 'em-waves',
        title: 'Electromagnetic Waves in 3D',
        description:
          'Drag charges through space and watch retarded E and B fields ripple outward. Build a dipole antenna and tune the medium to change wave speed and impedance.',
        href: '/simulations/physics/em-waves',
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
      {
        slug: 'wave-equation',
        title: 'Wave Equation',
        description:
          'Pluck a string and watch the pulse travel and reflect. The contrast with heat: waves keep their shape and carry energy instead of smearing out.',
        href: '/simulations/physics/wave-equation',
        status: 'live',
      },
      {
        slug: 'wave-interference',
        title: 'Wave Interference',
        description:
          'Two sources of ripples cross and combine into bright and dark fringes. Drag the sources to see the pattern behind the double-slit experiment.',
        href: '/simulations/physics/wave-interference',
        status: 'live',
      },
      {
        slug: 'schrodinger',
        title: 'Schrödinger Equation',
        description:
          'Launch a quantum wave packet at a barrier taller than its energy and watch part of it tunnel through, the wave nature of matter in action.',
        href: '/simulations/physics/schrodinger',
        status: 'live',
      },
      {
        slug: 'special-relativity',
        title: 'Special Relativity',
        description:
          'Boost to a moving frame on a spacetime diagram and watch its axes skew: relativity of simultaneity, time dilation and length contraction, all at once.',
        href: '/simulations/physics/special-relativity',
        status: 'live',
      },
      {
        slug: 'schwarzschild',
        title: 'General Relativity: Schwarzschild',
        description:
          'Fall down the curved-space funnel of a black hole. Clocks run slow deep in the well and a proper meter swallows less coordinate distance near the horizon.',
        href: '/simulations/physics/schwarzschild',
        status: 'live',
      },
    ],
  },
];

export function getArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}
