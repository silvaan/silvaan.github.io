// Keeps a sim page still while the sim runs.
//
// Numbers in the panel, the headline strip and the legend are rewritten many
// times a second. Each time one gets a character longer, everything after it
// moves; each time the result sentence wraps onto another line, the page
// grows and a scrollbar flickers in and out. The fix is the same everywhere:
// a box may grow to fit what it has shown, but never shrinks back while the
// layout stays the same. A box grows at most a few times, early on, and after
// that nothing moves. When the viewport width changes, all holds are dropped
// and measured again.

/** Text that changes in place: hold its width. */
const WIDTH = [
  '.sim-panel b[id]',
  '.sim-panel output',
  '.sim-panel .readout b',
  '.sim-panel .actions button',
  '.result-strip strong',
  '.scene-caption .legend span',
].join(', ');

/** Boxes whose height follows their text: hold their height. */
const HEIGHT = ['.stage-head', '.result-strip', '.scene-caption'].join(', ');

export function holdLayout(root: ParentNode = document) {
  const held = new Set<HTMLElement>();
  let queued = new Set<HTMLElement>();
  let raf = 0;

  function holdWidth(el: HTMLElement) {
    if (!el.isConnected || !el.offsetParent) return;
    const w = el.getBoundingClientRect().width;
    const prev = parseFloat(el.style.minWidth) || 0;
    if (w > prev + 0.5) {
      el.style.minWidth = `${Math.ceil(w)}px`;
      held.add(el);
    }
  }

  function holdHeight(el: HTMLElement) {
    if (!el.isConnected || !el.offsetParent) return;
    const h = el.getBoundingClientRect().height;
    const prev = parseFloat(el.style.minHeight) || 0;
    if (h > prev + 0.5) {
      el.style.minHeight = `${Math.ceil(h)}px`;
      held.add(el);
    }
  }

  function flush() {
    raf = 0;
    const batch = queued;
    queued = new Set();
    // measure everything first, then write, so one batch costs one layout
    const widths = [...batch].map((el) => [el, el.isConnected && el.offsetParent ? el.getBoundingClientRect().width : 0] as const);
    for (const [el, w] of widths) {
      const prev = parseFloat(el.style.minWidth) || 0;
      if (w > prev + 0.5) {
        el.style.minWidth = `${Math.ceil(w)}px`;
        held.add(el);
      }
    }
  }

  // inline text never takes a min-width; make the held elements boxes
  const prime = (el: HTMLElement) => {
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
  };

  root.querySelectorAll<HTMLElement>(WIDTH).forEach((el) => {
    prime(el);
    holdWidth(el);
  });

  new MutationObserver((records) => {
    for (const r of records) {
      const node = r.target.nodeType === 1 ? (r.target as HTMLElement) : r.target.parentElement;
      const el = node?.closest<HTMLElement>(WIDTH);
      if (!el) continue;
      if (!el.style.display) prime(el);
      queued.add(el);
    }
    if (queued.size && !raf) raf = requestAnimationFrame(flush);
  }).observe(root instanceof Document ? root.body : (root as Element), {
    subtree: true,
    childList: true,
    characterData: true,
  });

  const heights = new ResizeObserver((entries) => {
    for (const e of entries) holdHeight(e.target as HTMLElement);
  });
  root.querySelectorAll<HTMLElement>(HEIGHT).forEach((el) => heights.observe(el));

  // A different width is a different layout (a resized window, classroom
  // mode, a phone turned sideways): forget everything and measure again.
  const frame = document.querySelector<HTMLElement>('.sim') ?? document.body;
  let width = frame.getBoundingClientRect().width;
  new ResizeObserver(() => {
    const w = frame.getBoundingClientRect().width;
    if (Math.abs(w - width) < 1) return;
    width = w;
    for (const el of held) {
      el.style.minWidth = '';
      el.style.minHeight = '';
    }
    held.clear();
    requestAnimationFrame(() => {
      root.querySelectorAll<HTMLElement>(WIDTH).forEach(holdWidth);
      root.querySelectorAll<HTMLElement>(HEIGHT).forEach(holdHeight);
    });
  }).observe(frame);

  return {
    /** Drop every hold, e.g. after switching to a mode with different text. */
    release() {
      for (const el of held) {
        el.style.minWidth = '';
        el.style.minHeight = '';
      }
      held.clear();
    },
  };
}

/** Make an ordered list as tall as its tallest item, so stepping through it
 *  one item at a time never changes its height. */
export function holdTallest(list: HTMLElement, items: HTMLElement[], showing: string) {
  const measure = () => {
    list.style.minHeight = '';
    let tallest = 0;
    const was = items.map((li) => li.classList.contains(showing));
    for (const li of items) {
      items.forEach((x) => x.classList.toggle(showing, x === li));
      tallest = Math.max(tallest, list.getBoundingClientRect().height);
    }
    items.forEach((x, i) => x.classList.toggle(showing, was[i]));
    list.style.minHeight = `${Math.ceil(tallest)}px`;
  };
  measure();
  document.fonts?.ready.then(measure);
  // narrower means more lines: measure again whenever the list changes width
  let width = list.getBoundingClientRect().width;
  new ResizeObserver(() => {
    const w = list.getBoundingClientRect().width;
    if (Math.abs(w - width) < 1) return;
    width = w;
    measure();
  }).observe(list);
}
