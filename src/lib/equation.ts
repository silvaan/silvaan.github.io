// The equation that the simulation is about.
//
// Every page states its rule as a line of real typeset maths in which each
// term is painted the same colour it has on the canvas, so a term can be found
// in the picture by its colour alone. Under it goes the same line with the
// current numbers in it.

import katex from 'katex';

/** A piece of one line: TeX on its own, or TeX in one of the sim's colours. */
export type Part = string | [tex: string, colour: string];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Brace depth a piece of TeX leaves open (escaped braces don't count). */
function openBraces(tex: string) {
  let d = 0;
  for (let i = 0; i < tex.length; i++) {
    if (tex[i] === '\\') { i++; continue; }
    if (tex[i] === '{') d++;
    else if (tex[i] === '}') d--;
  }
  return d;
}

/** A colour KaTeX's \textcolor accepts: #rrggbb from rgb(...) when needed. */
function texColour(c: string) {
  const m = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return c;
  return '#' + [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('');
}

const TEX = { throwOnError: false, displayMode: false, output: 'html' } as const;

/** Render lines into a bar; the first two are TeX, anything after is prose. */
function render(bar: HTMLElement, lines: Part[][]) {
  bar.textContent = '';
  lines.forEach((parts, i) => {
    const line = document.createElement('div');
    line.className = `eq-line eq-${i}`;
    const shown = parts.filter((p) => (typeof p === 'string' ? p : p[0])); // a part a sim decided not to show this frame

    // A part that opens a brace another part closes (a colour inside a
    // fraction, say) cannot be typeset on its own: set the whole line as one
    // formula, with the colours as \textcolor.
    if (i < 2 && shown.some((p) => openBraces(typeof p === 'string' ? p : p[0]) !== 0)) {
      const tex = shown
        .map((p) => (typeof p === 'string' ? p : `\\textcolor{${texColour(p[1])}}{${p[0]}}`))
        .join(' ');
      const span = document.createElement('span');
      katex.render(tex, span, TEX);
      line.appendChild(span);
      bar.appendChild(line);
      return;
    }

    for (const p of shown) {
      const tex = typeof p === 'string' ? p : p[0];
      const colour = typeof p === 'string' ? '' : p[1];
      const span = document.createElement('span');
      if (colour) span.style.color = colour;
      if (i < 2) katex.render(tex, span, TEX);
      else span.innerHTML = esc(tex);
      line.appendChild(span);
    }
    bar.appendChild(line);
  });
}

/** Sims that animate call the setter every frame, so only rebuild on a change. */
function cached(bar: HTMLElement) {
  let last = '';
  return (lines: Part[][]) => {
    const key = JSON.stringify(lines);
    if (key === last) return;
    last = key;
    render(bar, lines);
  };
}

/**
 * The standard format: the equation lives in the stage header, left of the
 * toolbar. `rule` is the law in symbols, `live` the same law with the current
 * numbers in it. Anything else the sim wants to say goes in its result strip.
 */
export function equation() {
  const stage = document.querySelector('.sim-stage');
  if (!stage) return () => {};
  const bar = document.createElement('div');
  bar.className = 'sim-eq';
  // The header row is built by the stage chrome; whichever of the two runs
  // first, the bar ends up inside it.
  const slot = stage.querySelector('.stage-eq');
  if (slot) slot.appendChild(bar);
  else stage.insertBefore(bar, stage.firstChild);
  const set = cached(bar);
  return (lines: { rule: Part[]; live?: Part[] }) =>
    set(lines.live ? [lines.rule, lines.live] : [lines.rule]);
}

/**
 * The older format: a centred bar pinned at the top of the stage, taking up
 * to three positional lines (rule, numbers, and a sentence of prose). Pages
 * still on this format keep working; new pages use `equation()`.
 */
export function equationBar(stage?: Element | null) {
  const host = stage ?? document.querySelector('.sim-stage');
  if (!host) return () => {};
  const bar = document.createElement('div');
  bar.className = 'sim-eq';
  // into the stage header when the chrome has already built one
  const slot = host.querySelector(':scope > .stage-head > .stage-eq');
  if (slot) slot.appendChild(bar);
  else host.insertBefore(bar, host.firstChild);
  return cached(bar);
}
