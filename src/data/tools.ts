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
        slug: 'partial-derivatives',
        title: 'Partial Derivatives',
        description:
          'Slide a vertical plane through a surface and the surface becomes one ordinary curve. The slope of its tangent line is a partial derivative; pick the other plane for the other one.',
        href: '/simulations/calculus/partial-derivatives',
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
        slug: 'sum-rule',
        title: 'The Sum Rule',
        description:
          'Add two functions and their graphs stack. Stack the heights and you stack the growths, so the slopes simply add, with no leftover term anywhere.',
        href: '/simulations/calculus/sum-rule',
        status: 'live',
      },
      {
        slug: 'product-rule',
        title: 'The Product Rule',
        description:
          'A product is the area of a rectangle. Growing it adds two strips and one small corner, and only the corner is small enough to vanish in the limit.',
        href: '/simulations/calculus/product-rule',
        status: 'live',
      },
      {
        slug: 'chain-rule',
        title: 'The Chain Rule',
        description:
          'Each stage stretches a small step by its own factor, so stretching twice multiplies the factors. Watch why f′ has to be read at g(x) and nowhere else.',
        href: '/simulations/calculus/chain-rule',
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
        slug: 'laplace-transform',
        title: 'Laplace Transform',
        description:
          'Plot |F(s)| as a landscape over the complex plane: poles become spikes, the region of convergence a half-plane, and the Fourier transform the slice above the imaginary axis.',
        href: '/simulations/calculus/laplace-transform',
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
        slug: 'line-integral',
        title: 'Line Integrals',
        description:
          'Ride a bead along a curve through a field in 3D and add up only the part of the field that points your way. Bend the path and find out whether the total cared, which is the whole difference between a conservative field and a swirling one.',
        href: '/simulations/calculus/line-integral',
        status: 'live',
      },
      {
        slug: 'green-theorem',
        title: "Green's Theorem",
        description:
          'Chop a wobbly region into little squares and click any one to open it up. Each square carries its own spin, every shared edge is walked twice in opposite directions, and when they cancel only the rim is left.',
        href: '/simulations/calculus/green-theorem',
        status: 'live',
      },
      {
        slug: 'stokes-theorem',
        title: "Stokes' Theorem",
        description:
          'Tile a surface with little loops, click one to see its own spin, and watch every shared edge cancel in pairs until only the boundary curve is left. Then bend the surface into a dome, a bowl or a crumple: the answer refuses to move.',
        href: '/simulations/calculus/stokes-theorem',
        status: 'live',
      },
      {
        slug: 'gauss-theorem',
        title: "Gauss's Divergence Theorem",
        description:
          'Fill a lumpy region with little boxes, cut it open and click one to count what leaks out of its walls. Every inner wall is shared by two boxes and cancels, so the whole sum collapses onto the outer skin alone.',
        href: '/simulations/calculus/gauss-theorem',
        status: 'live',
      },
      {
        slug: 'divergence',
        title: 'Divergence',
        description:
          'Place a tiny material patch in a vector field and watch it expand near sources, contract near sinks, or deform at zero divergence.',
        href: '/simulations/calculus/divergence',
        status: 'live',
      },
      {
        slug: 'curl',
        title: 'Curl',
        description:
          'Drop a paddle wheel into a vector field and watch local circulation make it spin, revealing the magnitude and sign of curl.',
        href: '/simulations/calculus/curl',
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
        title: 'Linear Transformations',
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
      {
        slug: 'dot-product',
        title: 'The Dot Product',
        description:
          'One length times the shadow the other casts on it, and the component formula falling out of that picture: break one vector into its three axis steps and add up the shadow each one casts.',
        href: '/simulations/linear-algebra/dot-product',
        status: 'live',
      },
      {
        slug: 'cross-product',
        title: 'The Cross Product',
        description:
          'Two vectors span a patch of area. Its size is the length of the answer and its tilt is the direction, and every component of the formula is the signed area of that patch\u2019s shadow on one of the walls.',
        href: '/simulations/linear-algebra/cross-product',
        status: 'live',
      },
      {
        slug: 'span',
        title: 'Span',
        description:
          'Drag two vectors and see everywhere their scaled sums can reach, the whole plane, or a single line when they line up.',
        href: '/simulations/linear-algebra/span',
        status: 'live',
      },
      {
        slug: 'svd',
        title: 'Singular Value Decomposition',
        description:
          'Watch any matrix turn a circle into an ellipse as rotate, stretch, rotate, the geometry of A = U Σ Vᵀ.',
        href: '/simulations/linear-algebra/svd',
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
        title: 'Random Walk',
        description:
          'Thousands of aimless walkers spread from a point into a Gaussian whose width grows like the square root of time, the particle view of diffusion.',
        href: '/simulations/statistics/random-walk',
        status: 'live',
      },
      {
        slug: 'joint-distribution',
        title: 'Joint Probability',
        description:
          'Two numbers out of one experiment, laid out as a table of squares whose areas add to one. Drag a box over the pairs you care about and the probability is the area you enclosed; tilt the link between them and watch P(A and B) part company with P(A)P(B).',
        href: '/simulations/statistics/joint-distribution',
        status: 'live',
      },
      {
        slug: 'marginal-distribution',
        title: 'Marginals & Conditionals',
        description:
          'A marginal is a column of the joint table added up, so the other variable disappears. A conditional is that same column divided by its own total, so it adds to one again. Watch one column do both at once.',
        href: '/simulations/statistics/marginal-distribution',
        status: 'live',
      },
      {
        slug: 'probability-density',
        title: 'Probability Density',
        description:
          'No single value has any probability, only stretches do, so a density is the height whose area is that probability. Drag an interval across six different densities, or a circle across a density on the plane, and read off the integral.',
        href: '/simulations/statistics/probability-density',
        status: 'live',
      },
      {
        slug: 'monte-carlo',
        title: 'Monte Carlo',
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
        title: 'k-Means',
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
        title: 'Overfitting',
        description:
          'Raise a polynomial’s degree until it threads every training point yet fails on new data, then tame it with regularization.',
        href: '/simulations/machine-learning/overfitting',
        status: 'live',
      },
      {
        slug: 'curse-of-dimensionality',
        title: 'The Curse of Dimensionality',
        description:
          'Add axes and space stops behaving: data thins out until every point is alone, a ball keeps its volume in a paper-thin crust, near and far collapse into the same distance, and any two directions you pick meet at 90°.',
        href: '/simulations/machine-learning/curse-of-dimensionality',
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
        slug: 'space-warping',
        title: 'How Layers Bend Space',
        description:
          'Every hidden layer is two units wide, so the space it makes can be drawn. Train on XOR, rings or spirals and step through the layers to watch the grid stretch and fold until one straight line separates the classes.',
        href: '/simulations/deep-learning/space-warping',
        status: 'live',
      },
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
        title: 'Optimizers',
        description:
          'Race SGD, Momentum, NAG, RMSProp and Adam down a 3D loss surface and watch how differently they descend.',
        href: '/simulations/deep-learning/optimizers',
        status: 'live',
      },
      {
        slug: 'optimizers-3d',
        title: 'Optimizers in 3D',
        description:
          'Same optimizer race, but the loss is a volumetric density cloud and the balls move freely through 3D space toward the densest cores.',
        href: '/simulations/deep-learning/optimizers-3d',
        status: 'live',
      },
      {
        slug: 'neural-net',
        title: 'Neural Networks',
        description:
          'Train a small neural network to separate two classes of dots and watch its decision boundary bend and fold in real time.',
        href: '/simulations/deep-learning/neural-net',
        status: 'live',
      },
      {
        slug: 'cosine-similarity',
        title: 'Embeddings & Cosine Similarity',
        description:
          'Every word is an arrow, and meaning is the direction it points. Drag a query around and watch which word it lines up with, then see why the raw dot product prefers long vectors and the cosine does not.',
        href: '/simulations/deep-learning/cosine-similarity',
        status: 'live',
      },
      {
        slug: 'attention',
        title: 'Attention as a Soft Lookup',
        description:
          'A dictionary returns one value; attention returns a blend of all of them, weighted by how well each key matches the query. The values here are colours, so the blend is something you can see, and temperature slides you between a hard lookup and a grey average.',
        href: '/simulations/deep-learning/attention',
        status: 'live',
      },
      {
        slug: 'self-attention',
        title: 'Self-Attention',
        description:
          'Every token in a sentence writes a query, every token answers with a key, and the whole thing becomes one matrix of weights. Pick a token to see what it looks at, switch heads to see different jobs, and turn on the causal mask to see the future disappear.',
        href: '/simulations/deep-learning/self-attention',
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
    description: 'How models learn the shape of data and generate new samples from it.',
    icon: 'M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z M18.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z',
    simulators: [
      {
        slug: 'data-manifold',
        title: 'The Data Manifold',
        description:
          'Explore the enormous space of possible pixel arrays and see how real images occupy only a thin, structured region where probability concentrates.',
        href: '/simulations/generative-ai/data-manifold',
        status: 'live',
      },
      {
        slug: 'bpe-tokenizer',
        title: 'Byte Pair Encoding',
        description:
          'Build a tokenizer by counting: glue the commonest pair of neighbouring symbols into one, over and over, and watch the vocabulary grow from bare letters into whole words. Then hand it a sentence it has never seen and see where it cuts.',
        href: '/simulations/generative-ai/bpe-tokenizer',
        status: 'live',
      },
      {
        slug: 'autoregressive',
        title: 'Autoregressive Models',
        description:
          'A 40-word vocabulary, a probability for every one of them at every step, and temperature, top-k and top-p deciding which survive to be sampled. The same next-token loop that powers large language models, small enough to see whole.',
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
        title: 'Electromagnetic Waves',
        description:
          'Drag charges through space and watch retarded E and B fields ripple outward. Build a dipole antenna and tune the medium to change wave speed and impedance.',
        href: '/simulations/physics/em-waves',
        status: 'live',
      },
      {
        slug: 'entropy',
        title: 'Entropy',
        description:
          'Count the arrangements behind what you can see. Entropy is a census, S = k ln Ω, and that counting alone is enough to make time run one way.',
        href: '/simulations/physics/entropy',
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
        slug: 'phonons',
        title: 'Phonons',
        description:
          'Every mass obeys Hooke’s law and pulls only on its neighbours. Out comes a pulse travelling at a speed nobody wrote down, and a shortest possible wavelength that no continuous material would have.',
        href: '/simulations/physics/phonons',
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
        slug: 'ideal-gas',
        title: 'Ideal Gas',
        description:
          'A few hundred molecules bouncing in a box, and nothing else. Pressure is the drumming of their impacts, temperature is how fast they are, and PV = NkT is what the counting adds up to.',
        href: '/simulations/physics/ideal-gas',
        status: 'live',
      },
      {
        slug: 'stationary-action',
        title: 'Stationary Action',
        description:
          'Bend the path a particle takes between two fixed events and watch its action get worse. The path is painted with its own Lagrangian, the shaded area under L is the action, and rolling that downhill is Newton in disguise.',
        href: '/simulations/physics/stationary-action',
        status: 'live',
      },
      {
        slug: 'band-theory',
        title: 'Band Theory',
        description:
          'Bring a line of atoms together and every level splits into a band. Which bands are full, and how wide the gap is, decides on its own whether you are holding a metal, a semiconductor or a rock.',
        href: '/simulations/physics/band-theory',
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
        slug: 'fission',
        title: 'Nuclear Fission',
        description:
          'One neutron splits one nucleus and two more fly out. Turn the enrichment, the size and the control rods and watch the chain die, hold steady, or run away, the same knobs that separate a warm reactor from Chernobyl and from Hiroshima.',
        href: '/simulations/physics/fission',
        status: 'live',
      },
      {
        slug: 'fusion',
        title: 'Nuclear Fusion',
        description:
          'Slam light nuclei together hard enough to tunnel through their own repulsion. Crank the temperature, the density and the confinement and chase the one line every star and every reactor has to cross: power out beating power lost.',
        href: '/simulations/physics/fusion',
        status: 'live',
      },
      // Hidden from the listings for now. The page itself still exists at
      // src/pages/simulations/physics/quantum-fields.astro; re-add this entry
      // to bring it back.
      // {
      //   slug: 'quantum-fields',
      //   title: 'Quantum Fields',
      //   description:
      //     'Split a field into waves and it becomes a grid of oscillators, one per momentum. Quantise them and the energy comes in steps: those steps are the particles, and one mass slider sets their weight, their reach and their speed.',
      //   href: '/simulations/physics/quantum-fields',
      //   status: 'live',
      // },
      {
        slug: 'special-relativity',
        title: 'Special Relativity',
        description:
          'Boost to a moving frame on a spacetime diagram and watch its axes skew: relativity of simultaneity, time dilation and length contraction, all at once.',
        href: '/simulations/physics/special-relativity',
        status: 'live',
      },
      {
        slug: 'four-vectors',
        title: 'Four-Vectors',
        description:
          'One arrow in spacetime, read by many observers. Boost and both shadows change while the length refuses to: proper time, the speed of light, the rest mass.',
        href: '/simulations/physics/four-vectors',
        status: 'live',
      },
      {
        slug: 'schwarzschild',
        title: 'General Relativity',
        description:
          'Fall down the curved-space funnel of a black hole. Clocks run slow deep in the well and a proper meter swallows less coordinate distance near the horizon.',
        href: '/simulations/physics/schwarzschild',
        status: 'live',
      },
    ],
  },
  {
    slug: 'electronics',
    title: 'Electronics',
    description:
      'The components a circuit is built from, opened up: charge, fields and carriers doing the work.',
    icon: 'M6 6h12v12H6z M9 3v3 M15 3v3 M9 18v3 M15 18v3 M3 9h3 M3 15h3 M18 9h3 M18 15h3',
    simulators: [
      {
        slug: 'semiconductors',
        title: 'Diodes & Transistors',
        description:
          'Pick a diode or a transistor and watch electrons and holes move through it while you drive the external circuit. A one-way valve, then a valve with a knob, both made of a barrier you can raise and lower.',
        href: '/simulations/electronics/semiconductors',
        status: 'live',
      },
      {
        slug: 'capacitor',
        title: 'Capacitor',
        description:
          'Every charge is a ball you can count. Drive the source by hand or with AC, and watch electrons get dragged off one plate, round the circuit, onto the other, building the field that finally pushes back.',
        href: '/simulations/electronics/capacitor',
        status: 'live',
      },
      {
        slug: 'inductor',
        title: 'Inductor',
        description:
          'A flywheel for charge. Shove the source by hand and the electrons will not jump, only ramp, and when you cut them off the collapsing field produces hundreds of times the battery voltage to keep them moving.',
        href: '/simulations/electronics/inductor',
        status: 'live',
      },
    ],
  },
];

export function getArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}
