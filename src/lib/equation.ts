// The equation that the simulation is about, pinned above the stage.
//
// Every calculus page states its rule as a line of real typeset maths in which
// each term is painted the same colour it has on the canvas, so a term can be
// found in the picture by its colour alone. Under it goes the same line with the
// current numbers in it, and under that one plain sentence.

import katex from 'katex';

/** A piece of one line: TeX on its own, or TeX in one of the sim's colours. */
export type Part = string | [tex: string, colour: string];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Insert the bar at the top of the sim stage. The returned setter takes up to
 * three lines: the rule, the same rule with numbers, and a sentence.
 *
 * The first two lines are TeX, rendered with KaTeX one part at a time so each
 * part can carry its own colour. The last line is ordinary prose.
 */
export function equationBar(stage?: Element | null) {
  const host = stage ?? document.querySelector('.sim-stage');
  if (!host) return () => {};
  const bar = document.createElement('div');
  bar.className = 'sim-eq';
  host.insertBefore(bar, host.firstChild);

  // Sims that animate call this every frame, so only rebuild on a change.
  let last = '';
  return (lines: Part[][]) => {
    const key = JSON.stringify(lines);
    if (key === last) return;
    last = key;

    bar.textContent = '';
    lines.forEach((parts, i) => {
      const line = document.createElement('div');
      line.className = `eq-line eq-${i}`;
      for (const p of parts) {
        const tex = typeof p === 'string' ? p : p[0];
        if (!tex) continue; // a part a sim decided not to show this frame
        const colour = typeof p === 'string' ? '' : p[1];
        const span = document.createElement('span');
        if (colour) span.style.color = colour;
        if (i < 2)
          katex.render(tex, span, {
            throwOnError: false,
            displayMode: false,
            output: 'html',
          });
        else span.innerHTML = esc(tex);
        line.appendChild(span);
      }
      bar.appendChild(line);
    });
  };
}
