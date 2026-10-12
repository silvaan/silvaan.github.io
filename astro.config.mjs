import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  site: 'https://silvaan.xyz',
  integrations: [mdx(), sitemap()],
  // Simulators that were folded into a single richer page. The old slugs were
  // public, so they keep working and land on the mode that replaced them.
  redirects: {
    '/simulations/calculus/riemann-sum': '/simulations/calculus/fundamental-theorem',
    '/simulations/statistics/marginal-distribution':
      '/simulations/statistics/joint-distribution',
    '/simulations/deep-learning/optimizers-3d': '/simulations/deep-learning/optimizers',
    '/simulations/calculus/sum-rule': '/simulations/calculus/derivative-rules',
    '/simulations/calculus/product-rule': '/simulations/calculus/derivative-rules',
    '/simulations/calculus/chain-rule': '/simulations/calculus/derivative-rules',
    '/simulations/deep-learning/softmax-cross-entropy': '/simulations/deep-learning/softmax',
    '/simulations/deep-learning/mnist-classifier': '/simulations/deep-learning/neural-net',
    '/simulations/deep-learning/image-convolution': '/simulations/computer-vision/image-filters',
    '/simulations/deep-learning/residual': '/simulations/deep-learning',
    '/simulations/deep-learning/attention': '/simulations/deep-learning',
    '/simulations/deep-learning/self-attention': '/simulations/deep-learning',
    '/simulations/deep-learning/recurrence': '/simulations/deep-learning',
    '/simulations/calculus/green-theorem': '/simulations/calculus/stokes-theorem',
    '/simulations/calculus/divergence': '/simulations/calculus/divergence-curl',
    '/simulations/calculus/curl': '/simulations/calculus/divergence-curl',
    '/simulations/calculus/scalar-fields': '/simulations/calculus/partial-derivatives',
    '/simulations/linear-algebra/span': '/simulations/linear-algebra/change-of-basis',
    '/simulations/statistics/random-walk': '/simulations/statistics/central-limit-theorem',
    '/simulations/statistics/least-squares': '/simulations/machine-learning/linear-models',
    '/simulations/machine-learning/activations': '/simulations/deep-learning/backpropagation',
    '/simulations/deep-learning/gradient-descent': '/simulations/deep-learning/optimizers',
    '/simulations/deep-learning/initialisation': '/simulations/deep-learning/signal-propagation',
    '/simulations/deep-learning/normalisation': '/simulations/deep-learning/signal-propagation',
    '/simulations/deep-learning/convolution-arithmetic': '/simulations/deep-learning/convolution',
    '/simulations/deep-learning/convolution-channels': '/simulations/deep-learning/convolution',
    '/simulations/physics/four-vectors': '/simulations/physics/special-relativity',
    '/simulations/physics/em-fields': '/simulations/physics/em-waves',
  },
  markdown: {
    // Keep authored punctuation literal so `--`/`---` never become en/em dashes.
    smartypants: false,
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
