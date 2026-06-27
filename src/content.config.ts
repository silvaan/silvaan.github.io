import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// All markdown/mdx posts live in the top-level `posts/` folder.
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.string().default('General'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
