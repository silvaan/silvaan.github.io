// Small canvas helpers every simulation ends up rewriting: the theme-aware
// ink, an arrow, and number formatting that reads well in a monospace label.

export { roundRect } from './theorem';

/** The stage palette, read from the canvas so light and dark both work. */
export function stageInk(canvas: HTMLCanvasElement) {
  const css = (name: string, fallback = '') =>
    getComputedStyle(canvas).getPropertyValue(name).trim() || fallback;
  return {
    css,
    /** Foreground at an opacity. */
    ink: (a: number) => `rgba(${css('--stage-ink', '232,233,236')},${a})`,
    /** Background colour at an opacity, for halos behind text and arrowheads. */
    inv: (a: number) => `rgba(${css('--stage-ink-inv', '13,14,18')},${a})`,
    bg: () => css('--stage-bg', '#0d0e12'),
  };
}

/** A straight arrow in screen space, in the current stroke and fill style. */
export function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size = 6) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(a - 0.4), y2 - size * Math.sin(a - 0.4));
  ctx.lineTo(x2 - size * Math.cos(a + 0.4), y2 - size * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
}

/** Fixed decimals with a real minus sign, and no "−0.000". */
export const fixed = (v: number, n = 2) =>
  (Math.abs(v) < 0.5 * 10 ** -n ? 0 : v).toFixed(n).replace('-', '−');

/** "+ 1.20" or "− 1.20", so a formula never reads "− −1.20". */
export const signed = (v: number, n = 2) => `${v < 0 ? '−' : '+'} ${fixed(Math.abs(v), n)}`;

/** Engineering notation: 0.00182 A → "1.82 mA". */
export function eng(v: number, unit: string, digits = 2): string {
  const a = Math.abs(v);
  if (a === 0) return `0 ${unit}`;
  const steps: [number, string][] = [
    [1e-15, 'f'], [1e-12, 'p'], [1e-9, 'n'], [1e-6, 'µ'], [1e-3, 'm'],
    [1, ''], [1e3, 'k'], [1e6, 'M'], [1e9, 'G'],
  ];
  let pick = steps[0];
  for (const s of steps) if (a >= s[0]) pick = s;
  return `${(v / pick[0]).toFixed(digits)} ${pick[1]}${unit}`;
}
