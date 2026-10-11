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
          'A surface has a slope for every direction you could walk. Freeze one variable and slide a plane through it for ∂f/∂x or ∂f/∂y, then turn the plane to any direction u and watch D_u f = ∇f·u peak along the gradient.',
        href: '/simulations/calculus/partial-derivatives',
        status: 'live',
      },
      {
        slug: 'riemann-sum',
        title: 'Riemann Sums',
        description:
          'Approximate the area under a curve with rectangles, then add more and thinner ones and watch the staircase converge onto the integral.',
        href: '/simulations/calculus/riemann-sum',
        status: 'live',
      },
      {
        slug: 'derivative-rules',
        title: 'Derivative Rules',
        description:
          'Sum, product and chain in one place. Stacked graphs make the slopes add, a growing rectangle leaves two strips and a doomed corner, and a step stretched twice multiplies the factors.',
        href: '/simulations/calculus/derivative-rules',
        status: 'live',
      },
      {
        slug: 'curvature',
        title: 'Second Derivatives & Curvature',
        description:
          'Join the two points either side of you with a straight line. The curve misses the middle of it, and that gap is the second derivative. Halve the spacing and the gap falls to a quarter.',
        href: '/simulations/calculus/curvature',
        status: 'live',
      },
      {
        slug: 'integration-by-parts',
        title: 'Integration by Parts',
        description:
          'Two areas that tile one rectangle: the integral you were asked for and the one you are handed back. Choosing u is choosing which of the two you would rather do.',
        href: '/simulations/calculus/integration-by-parts',
        status: 'live',
      },
      {
        slug: 'differential-equations',
        title: 'Differential Equations',
        description:
          'An equation for the slope instead of the value. Draw it everywhere and the plane fills with segments; a solution is any curve that stays tangent to them the whole way.',
        href: '/simulations/calculus/differential-equations',
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
          'Multiply the signal by one frequency and add up the area. If the wave fits, the product sits above the axis; if it does not, the halves cancel to exactly zero. Every coefficient is that one measurement.',
        href: '/simulations/calculus/fourier-series',
        status: 'live',
      },
      {
        slug: 'laplace-transform',
        title: 'Laplace Transform',
        description:
          'Plot |F(s)| as a landscape over the complex plane, where poles become spikes and the Fourier transform is the slice above the imaginary axis.',
        href: '/simulations/calculus/laplace-transform',
        status: 'live',
      },
      {
        slug: 'hessian',
        title: 'The Hessian',
        description:
          'A surface bends by a different amount in every direction, and four numbers hold all of them. Its eigenvectors are the sharpest and gentlest directions, and their signs decide bowl, dome or saddle.',
        href: '/simulations/calculus/hessian',
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
          'Ride a bead along a curve through a field in 3D, adding up only the part of the field that points your way. Then bend the path and see whether the total cared.',
        href: '/simulations/calculus/line-integral',
        status: 'live',
      },
      {
        slug: 'stokes-theorem',
        title: "Stokes' Theorem",
        description:
          "Stretch any surface across a loop and chop it into patches. Neighbours walk every shared edge both ways, so the sum collapses onto the one curve around the edge. Lay it flat and this is Green's theorem; bend it and the answer refuses to move.",
        href: '/simulations/calculus/stokes-theorem',
        status: 'live',
      },
      {
        slug: 'gauss-theorem',
        title: "Gauss's Divergence Theorem",
        description:
          'Fill a lumpy region with little boxes and count what leaks out of each. Every inner wall is shared by two boxes and cancels, leaving only the outer skin.',
        href: '/simulations/calculus/gauss-theorem',
        status: 'live',
      },
      {
        slug: 'divergence-curl',
        title: 'Divergence & Curl',
        description:
          'Two numbers at every point of a flow. Drop in a material patch and its area grows or shrinks with the divergence; drop in a paddle wheel and it spins with the curl.',
        href: '/simulations/calculus/divergence-curl',
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
          'Drag the matrix entries and watch the plane deform with them, carrying the grid and the two basis vectors along for the ride.',
        href: '/simulations/linear-algebra/linear-transformation',
        status: 'live',
      },
      {
        slug: 'determinant',
        title: 'The Determinant',
        description:
          'One number for what a matrix does to area. Squash the parallelogram to nothing and the map has thrown a dimension away; push past that and the plane comes back inside out.',
        href: '/simulations/linear-algebra/determinant',
        status: 'live',
      },
      {
        slug: 'change-of-basis',
        title: 'Change of Basis',
        description:
          'The same arrow, watched through two different grids and written down as two different pairs of numbers. The dictionary between them is a matrix, the pairs it can reach are the span of the basis, and a transformation translated is the sandwich.',
        href: '/simulations/linear-algebra/change-of-basis',
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
        title: 'Dot Product',
        description:
          'One length times the shadow the other casts on it, with the component formula falling straight out of that one picture.',
        href: '/simulations/linear-algebra/dot-product',
        status: 'live',
      },
      {
        slug: 'cross-product',
        title: 'Cross Product',
        description:
          'Two vectors span a patch of area. Its size is the length of the answer, its tilt is the direction, and each component is a shadow of that patch.',
        href: '/simulations/linear-algebra/cross-product',
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
          'Add up n draws from any distribution, over and over. The sums and the means pile into a bell whatever the source looked like, and with ±1 coin steps each sum is a random walk spreading like √n.',
        href: '/simulations/statistics/central-limit-theorem',
        status: 'live',
      },
      {
        slug: 'joint-distribution',
        title: 'Joint, Marginals & Conditionals',
        description:
          'Every pair of values gets a square whose area is its probability. Drag a box over the table and read the joint, the marginals and a conditional off one selection.',
        href: '/simulations/statistics/joint-distribution',
        status: 'live',
      },
      {
        slug: 'probability-density',
        title: 'Probability Density',
        description:
          'No single value has any probability, only stretches do, so a density is the height whose area is that probability. Drag an interval and read off the integral.',
        href: '/simulations/statistics/probability-density',
        status: 'live',
      },
      {
        slug: 'monte-carlo',
        title: 'Monte Carlo',
        description:
          "Throw random darts at a box and count the hits: the fraction times the box is the area. Estimate π, the area under a curve or a ball's volume in ten dimensions, and watch the error fall like 1/√n.",
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
          'Slide a Gaussian over sample data and watch the likelihood rise and fall. The best fit lands on the sample mean and the spread that divides by n, not n − 1.',
        href: '/simulations/statistics/mle',
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
        slug: 'gaussian-mixture',
        title: 'Gaussian Mixtures',
        description:
          'k-means hands every point to one cluster and draws only circles. A mixture gives every point a share of each cluster instead, and lets a cluster stretch and tilt, so a point between two of them can finally say so.',
        href: '/simulations/machine-learning/gaussian-mixture',
        status: 'live',
      },
      {
        slug: 'dbscan',
        title: 'DBSCAN',
        description:
          'Density-based clustering that finds arbitrary shapes and flags outliers as noise, with no need to choose the number of clusters up front. A second view works out reachability and connectivity on small cases, one point at a time.',
        href: '/simulations/machine-learning/dbscan',
        status: 'live',
      },
      {
        slug: 'hierarchical',
        title: 'Hierarchical Clustering',
        description:
          'Merge the two closest groups over and over until everything is one, watch the dendrogram grow branch by branch, and drag a cut across it to choose the clusters.',
        href: '/simulations/machine-learning/hierarchical',
        status: 'live',
      },
      {
        slug: 'clustering-metrics',
        title: 'Clustering Metrics',
        description:
          'Silhouette, Davies–Bouldin and DBCV judge a clustering by its geometry alone; purity, the Rand index and ARI hold it up against the true classes. Split, scramble and hand-edit clusters and watch where the six scores part ways.',
        href: '/simulations/machine-learning/clustering-metrics',
        status: 'live',
      },
      {
        slug: 'linear-models',
        title: 'Linear Models',
        description:
          'Linear and logistic regression score the input with the same line, z = wx + b. Draw each residual as a literal square, snap to the least-squares optimum, and watch the same descent fit both models.',
        href: '/simulations/machine-learning/linear-models',
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
          'Add axes and space stops behaving: data thins out, a ball keeps its volume in a paper-thin crust, and near and far collapse into the same distance.',
        href: '/simulations/machine-learning/curse-of-dimensionality',
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
          'Every hidden layer is two units wide, so the space it makes can be drawn. Step through the layers and watch the grid fold until one line separates the classes.',
        href: '/simulations/deep-learning/space-warping',
        status: 'live',
      },
      {
        slug: 'backpropagation',
        title: 'Backpropagation',
        description:
          "One tiny network, one example, every number on screen. Push the input forward, send the error back down the same wires, then see why the activation's slope decides whether a gradient survives many layers.",
        href: '/simulations/deep-learning/backpropagation',
        status: 'live',
      },
      {
        slug: 'optimizers',
        title: 'Optimizers',
        description:
          'Six optimizers descend the same loss: a 1D slice where too big a learning rate overshoots and diverges, a surface you can click on, or a density cloud in three parameters.',
        href: '/simulations/deep-learning/optimizers',
        status: 'live',
      },
      {
        slug: 'batch-noise',
        title: 'Batch Size & Gradient Noise',
        description:
          'Nobody computes the real gradient. Watch which examples get drawn, watch each one pull the step its own way, and watch their average swing into line with the truth as the batch grows.',
        href: '/simulations/deep-learning/batch-noise',
        status: 'live',
      },
      {
        slug: 'signal-propagation',
        title: 'Initialisation & Normalisation',
        description:
          'Every layer multiplies the spread of the signal by a factor, and depth compounds it. Pick a weight scale and watch the activations survive, vanish or overflow, then normalise each layer and see the scale stop compounding.',
        href: '/simulations/deep-learning/signal-propagation',
        status: 'live',
      },
      {
        slug: 'softmax',
        title: 'Softmax & Temperature',
        description:
          'Raw scores become probabilities, and one number decides how strong an opinion that is. Drag the temperature from a single confident answer all the way to a five-way shrug.',
        href: '/simulations/deep-learning/softmax',
        status: 'live',
      },
      {
        slug: 'neural-net',
        title: 'Inside a Digit Classifier',
        description:
          'Draw a digit and watch a pretrained MNIST classifier read it, as a plain stack of layers or as a convolutional network. Every wire is lit by what it carries, and clicking a neuron opens it up to show the picture it looks for.',
        href: '/simulations/deep-learning/neural-net',
        status: 'live',
      },
      {
        slug: 'contrastive-learning',
        title: 'Contrastive Learning',
        description:
          'Nobody says where anything goes. Things of a kind are pulled together and everything else pushed apart, and the embedding arranges itself from that. Four losses say it four different ways, and you can watch each one push.',
        href: '/simulations/deep-learning/contrastive-learning',
        status: 'live',
      },
      {
        slug: 'cosine-similarity',
        title: 'Embeddings & Cosine Similarity',
        description:
          'Every word is an arrow and meaning is the direction it points. Rank the same words by cosine, by raw dot product and by straight-line distance, and watch the level sets turn from rays into rings.',
        href: '/simulations/deep-learning/cosine-similarity',
        status: 'live',
      },
      {
        slug: 'positional-encoding',
        title: 'Positional Encoding',
        description:
          'Attention reads a set, so order has to be written into the vectors. Added sinusoids make a score depend on where two words sit; rotary makes it depend on their offset alone.',
        href: '/simulations/deep-learning/positional-encoding',
        status: 'live',
      },
      {
        slug: 'convolution',
        title: 'Convolution',
        description:
          'A window of weights slides over a grid and each position gives one number. Padding, stride and dilation decide how many positions there are, and with several channels every filter reads all of them at once and sums the slices.',
        href: '/simulations/deep-learning/convolution',
        status: 'live',
      },
      {
        slug: 'receptive-field',
        title: 'Receptive Field',
        description:
          'Trace the cone of pixels one output cell can see. Depth adds to the window, stride multiplies it and costs resolution, doubling dilation grows it exponentially for free, and a repeated dilation leaves holes.',
        href: '/simulations/deep-learning/receptive-field',
        status: 'live',
      },
      {
        slug: 'autoencoder',
        title: 'Autoencoder & Latent Space',
        description:
          'Squeeze a picture through a gap of two numbers and force the network to rebuild it. Nothing says what the numbers should mean, and they come out as a map you can drag around.',
        href: '/simulations/deep-learning/autoencoder',
        status: 'live',
      },
    ],
  },
  {
    slug: 'computer-vision',
    title: 'Computer Vision',
    description: 'What can be measured in a picture, and what has to be guessed.',
    icon: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z M12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2',
    simulators: [
      {
        slug: 'image-representation',
        title: 'Image Representation',
        description:
          'A photograph in memory is a grid of whole numbers and nothing else. Move the magnifier and the same patch is a picture and its numbers at once, then take the numbers apart: one channel at a time, and fewer and fewer values each.',
        href: '/simulations/computer-vision/image-representation',
        status: 'live',
      },
      {
        slug: 'image-filters',
        title: 'Image Filters',
        description:
          'A filter is a small square of numbers. Slide it over a photograph and the same handful of weights will blur it, sharpen it or leave nothing but its edges. Pick one, resize it, or drag the weights until it is yours.',
        href: '/simulations/computer-vision/image-filters',
        status: 'live',
      },
      {
        slug: 'object-detection',
        title: 'Finding an Object',
        description:
          'A detector is a picture of the thing you want and a window that walks the scene asking how much this looks like that. Drag the window about, or set it sweeping, and watch a score appear at every position and every size before any box exists.',
        href: '/simulations/computer-vision/object-detection',
        status: 'live',
      },
      {
        slug: 'bounding-boxes',
        title: 'Boxes and Overlap',
        description:
          'A detector returns a heap of overlapping guesses, not one box per object. Two rules turn the heap into an answer: a number for how much two boxes are the same box, and a procedure that keeps the best and deletes its neighbours.',
        href: '/simulations/computer-vision/bounding-boxes',
        status: 'live',
      },
      {
        slug: 'shape-from-shading',
        title: 'Shape from Shading',
        description:
          'A photograph is flat, yet you see a surface in it. Brightness is decided by how each patch leans towards the light, and turning that around recovers the shape, provided you guess the light right.',
        href: '/simulations/computer-vision/shape-from-shading',
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
          'Every 28 × 28 image is a point in a 784-dimensional space, yet real images of one kind lie on a thin curved sheet inside it. Walk the sheet, average two images, add noise and pull it back.',
        href: '/simulations/generative-ai/data-manifold',
        status: 'live',
      },
      {
        slug: 'bpe-tokenizer',
        title: 'Byte Pair Encoding',
        description:
          'Glue the commonest pair of neighbouring symbols into one, over and over, and watch a vocabulary grow from bare letters into whole words.',
        href: '/simulations/generative-ai/bpe-tokenizer',
        status: 'live',
      },
      {
        slug: 'autoregressive',
        title: 'Autoregressive Models',
        description:
          'A 40-word vocabulary with a probability for every word at every step, and temperature, top-k and top-p deciding which of them survive to be sampled.',
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
        slug: 'em-waves',
        title: 'Electromagnetic Waves',
        description:
          'Shake a charge and watch its field ripple outward as a glowing shell, at the speed the medium allows. Build a dipole antenna to see its radiation glow as a doughnut round the wire, with E and B turning transverse in 3D, or switch to statics for Coulomb field lines and the magnetic circles round a wire.',
        href: '/simulations/physics/em-waves',
        status: 'live',
      },
      {
        slug: 'wifi-house',
        title: 'Wi-Fi in a House',
        description:
          "Maxwell's equations on the GPU over a whole house at the true Wi-Fi wavelength: watch 2.4 and 5 GHz spill through doorways, leave dead spots a few centimetres across and fade behind brick and concrete, with the signal a phone would read in every room.",
        href: '/simulations/physics/wifi-house',
        status: 'live',
      },
      {
        slug: 'entropy',
        title: 'Entropy',
        description:
          'Lift the wall and a gas fills its box. Flip every velocity and it flows home; nudge one particle by a billionth and it never does. Entropy counts arrangements, and chaos makes the count win.',
        href: '/simulations/physics/entropy',
        status: 'live',
      },
      {
        slug: 'heat-equation',
        title: 'Heat Equation',
        description:
          'Watch heat diffuse through a 3D room as glowing fog, from a radiator to a cold window, paint in your own heat or cold, and see a thermometer settle into steady state.',
        href: '/simulations/physics/heat-equation',
        status: 'live',
      },
      {
        slug: 'wave-equation',
        title: 'Wave Equation',
        description:
          'A drum skin where every point accelerates toward the average of its four neighbours. Put a probe anywhere and watch that pull live: down on a crest, up in a trough, nothing on a straight slope. Swap in the heat equation and the same pull only slides the point into place.',
        href: '/simulations/physics/wave-equation',
        status: 'live',
      },
      {
        slug: 'normal-modes',
        title: 'Normal Modes',
        description:
          'Every object has a few shapes it can hold while it vibrates, each ringing at its own note. Pluck it and the motion splits into those notes: whole multiples on a string, an untuned jumble on a drum.',
        href: '/simulations/physics/normal-modes',
        status: 'live',
      },
      {
        slug: 'phonons',
        title: 'Phonons',
        description:
          'Every mass obeys Hooke’s law and pulls only on its neighbours. Out comes a pulse travelling at a speed nobody wrote down, and a shortest possible wavelength.',
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
          'A few hundred atoms in a glass cylinder under a piston. Pressure is the drumming of their impacts, temperature is how fast they fly, and PV = NkT is what that adds up to: squeeze, heat or insulate and watch it hold.',
        href: '/simulations/physics/ideal-gas',
        status: 'live',
      },
      {
        slug: 'stationary-action',
        title: 'Stationary Action',
        description:
          'Bend the path a particle takes between two fixed events and watch its action get worse. Rolling that downhill turns out to be Newton in disguise.',
        href: '/simulations/physics/stationary-action',
        status: 'live',
      },
      {
        slug: 'band-theory',
        title: 'Band Theory',
        description:
          'Bring a line of atoms together and every level splits into a band. Which bands are full, and how wide the gap is, decides metal, semiconductor or rock.',
        href: '/simulations/physics/band-theory',
        status: 'live',
      },
      {
        slug: 'schrodinger',
        title: 'Quantum Tunnelling',
        description:
          'Fire a wave packet at a wall taller than its energy. Classically it bounces straight back; as a wave, part of it leaks through the wall and out the far side.',
        href: '/simulations/physics/schrodinger',
        status: 'live',
      },
      {
        slug: 'wavefunction-collapse',
        title: 'Wavefunction Collapse',
        description:
          'A matter wave spreads through space as a cloud of probability until a measurement finds it at one single point. Fire particles at a screen one by one and the interference fringes build up dot by dot.',
        href: '/simulations/physics/wavefunction-collapse',
        status: 'live',
      },
      {
        slug: 'atomic-orbitals',
        title: 'Atomic Orbitals',
        description:
          'The exact hydrogen orbitals drawn as glowing clouds of probability: shells and nodal planes, the phase winding of m, the signed lobes of chemistry, measurements that collapse the cloud to a point, and superpositions that slosh and emit light.',
        href: '/simulations/physics/atomic-orbitals',
        status: 'live',
      },
      {
        slug: 'stern-gerlach',
        title: 'Stern-Gerlach Experiment',
        description:
          'A beam of atoms should smear into a band and arrives as two spots. Chain the analysers, turn the next one, and measuring x wipes out what was known about z.',
        href: '/simulations/physics/stern-gerlach',
        status: 'live',
      },
      {
        slug: 'quantum-gates',
        title: 'Quantum Gates',
        description:
          'Build a circuit on two qubits and watch the amplitudes, their phases and both Bloch arrows move together. Then build the one circuit whose arrows shrink to nothing.',
        href: '/simulations/physics/quantum-gates',
        status: 'live',
      },
      {
        slug: 'fission',
        title: 'Nuclear Fission',
        description:
          'One neutron splits one nucleus and two more fly out. Turn the enrichment, the size and the control rods and watch the chain die, hold steady, or run away.',
        href: '/simulations/physics/fission',
        status: 'live',
      },
      {
        slug: 'fusion',
        title: 'Nuclear Fusion',
        description:
          'Slam light nuclei together hard enough to tunnel through their own repulsion, and chase the one line every star has to cross: power out beating power lost.',
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
      //     'A field fills all of space, and splitting it into waves turns it into a grid of independent oscillators, one per momentum. Excite a mode into a coherent state and a classical-looking wave appears whose energy comes in steps of ω: those steps are the particles. One mass slider decides how heavy they are, how far they reach and how fast they move.',
      //   href: '/simulations/physics/quantum-fields',
      //   status: 'live',
      // },
      {
        slug: 'special-relativity',
        title: 'Special Relativity',
        description:
          'Space and time are one fabric. Boost to a moving frame and its grid skews: clocks tick slow, rulers shrink, and simultaneity comes apart. Yet every arrow in spacetime keeps one length that all observers agree on.',
        href: '/simulations/physics/special-relativity',
        status: 'live',
      },
      {
        slug: 'schwarzschild',
        title: 'General Relativity',
        description:
          'See a black hole the way its light does: every pixel is a photon traced through curved spacetime, so the disk wraps over the top and the sky folds round a shadow 2.6 times the horizon. Then put a particle in orbit and watch it trace rosettes, plunge inside 3 rₛ, and its clock run slow.',
        href: '/simulations/physics/schwarzschild',
        status: 'live',
      },
      {
        slug: 'black-hole',
        title: 'Black Hole',
        description:
          'See a black hole the way its light does: every pixel is a photon traced through curved spacetime, so the disk wraps over the top and the sky folds round a shadow 2.6 times the horizon. Then put a particle in orbit and watch it trace rosettes, plunge inside 3 rₛ, and its clock run slow.',
        href: '/simulations/physics/black-hole',
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
        slug: 'resistor',
        title: 'Resistor',
        description:
          'The field pulls an electron along and the lattice knocks it back to random, over and over. The average of that stop-start crawl is the current, and the winnings the lattice keeps are the heat.',
        href: '/simulations/electronics/resistor',
        status: 'live',
      },
      {
        slug: 'semiconductors',
        title: 'Diodes & Transistors',
        description:
          'Pick a diode or a transistor and watch electrons and holes move through it: a one-way valve, then a valve with a knob, both built from a barrier you can raise.',
        href: '/simulations/electronics/semiconductors',
        status: 'live',
      },
      {
        slug: 'capacitor',
        title: 'Capacitor',
        description:
          'Every charge is a ball you can count. Drive the source by hand and watch electrons get dragged off one plate, round the circuit, and onto the other one.',
        href: '/simulations/electronics/capacitor',
        status: 'live',
      },
      {
        slug: 'inductor',
        title: 'Inductor',
        description:
          'A flywheel for charge. Shove the source and the electrons will not jump, only ramp, and cutting them off makes the collapsing field fight to keep them going.',
        href: '/simulations/electronics/inductor',
        status: 'live',
      },
      {
        slug: 'memristor',
        title: 'Memristor',
        description:
          'A resistor that remembers the charge that has been through it. Watch the boundary inside the film move as you drive it, and stay put when you stop.',
        href: '/simulations/electronics/memristor',
        status: 'live',
      },
      {
        slug: 'rlc',
        title: 'RC, RL and RLC Circuits',
        description:
          'A resistor, a coil and a capacitor in one loop. The two stores pass energy back and forth, so the circuit rings, and one number, the damping ratio ζ, decides whether it rings, settles as fast as it can or crawls. The same two poles decide which frequencies get through.',
        href: '/simulations/electronics/rlc',
        status: 'live',
      },
      {
        slug: 'transmission-line',
        title: 'Transmission Lines',
        description:
          'Close a switch on a two-wire line and watch the energy travel through the space between the wires, not down the copper, as a wave at v = 1/√(LC) that the load swallows, doubles or turns upside down.',
        href: '/simulations/electronics/transmission-line',
        status: 'live',
      },
      {
        slug: 'mosfet',
        title: 'MOSFET & CMOS Logic',
        description:
          'A plate of metal that conjures a wire underneath itself and never touches it. Then stack a p-type one on an n-type one and get a gate that costs power only while it changes its mind.',
        href: '/simulations/electronics/mosfet',
        status: 'live',
      },
    ],
  },
];

export function getArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}
