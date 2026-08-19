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
    '/simulations/statistics/marginal-distribution':
      '/simulations/statistics/joint-distribution',
    '/simulations/deep-learning/optimizers-3d': '/simulations/deep-learning/optimizers',
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
