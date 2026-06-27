# silvaan.xyz

Personal site for interactive math notes and simulations, built with
[Astro](https://astro.build/). Dark theme, posts as the home page (Lilian
Weng style), and a **Tools** section with simulators grouped by area.

## Requirements

This project needs **Node ≥ 22.12** (see `.nvmrc`). With nvm:

```bash
nvm use        # or: nvm install 22.12.0
```

## Commands

| Command           | Action                                      |
| ----------------- | ------------------------------------------- |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start the dev server at `localhost:4321`    |
| `npm run build`   | Build the production site to `./dist/`      |
| `npm run preview` | Preview the build locally                   |

## Project structure

```
posts/                      # Markdown/MDX posts (the home feed)
public/                     # Static assets (favicon, images)
src/
  components/               # Header, Footer, BaseHead, FormattedDate
  data/tools.ts            # Areas + simulators metadata for /simulations
  layouts/                 # BaseLayout, PostLayout, SimLayout
  pages/
    [...page].astro        # Home: paginated list of posts
    posts/[...slug].astro  # Individual post pages
    tags/                  # Tag index + per-tag pages
    simulations/           # Simulations index, area pages, and simulators
    archive.astro          # Flat index of every post
    contact.astro
  styles/global.css        # Dark theme + all styling
  consts.ts                # Site title, nav links, social
  content.config.ts        # Posts collection schema
```

## Writing a post

Create a markdown file in `posts/`. The filename becomes the URL slug.

```markdown
---
title: "My post title"
description: "Optional one-line summary shown in the feed."
date: 2026-06-26
category: "Calculus"          # one category per post
tags: ["integration", "limits"]
draft: false                   # set true to hide
---

Body in Markdown. Math with `$inline$` and `$$display$$` (KaTeX).
```

## Adding a simulator

1. Add an entry under the right area in `src/data/tools.ts` (or add a new
   area). Set its `href`.
2. Create the page at `src/pages/simulations/<area>/<sim>.astro` using
   `SimLayout` and a client-side `<script>` (see existing simulators).

The current simulators:

- **Calculus** → Riemann Sums
- **Linear Algebra** → 2D Linear Transformations
- **Deep Learning** → Gradient Descent
```
