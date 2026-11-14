import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SIMS, TRAILS } from '../data/explore';

// The search dialog fetches this once, the first time it opens.
export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const items = [
    ...SIMS.map((s) => ({
      kind: 'sim',
      title: s.title,
      area: s.area.title,
      color: s.color,
      text: s.description,
      href: s.href,
      thumb: s.thumb?.dark,
      thumbLight: s.thumb?.light,
      added: s.added,
    })),
    ...TRAILS.map((t) => ({
      kind: 'path',
      title: t.title,
      area: 'Path',
      color: '',
      text: t.blurb,
      href: `/simulations#path-${t.slug}`,
    })),
    ...posts.map((p) => ({
      kind: 'note',
      title: p.data.title,
      area: 'Note',
      color: '',
      text: p.data.description ?? '',
      href: `/posts/${p.id}`,
    })),
  ];
  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json' },
  });
};
