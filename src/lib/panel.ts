// Wiring for the standard control panel: segmented buttons, sliders with a
// live value, the Run / Step / Reset transport, and the result strip.

export const el = (id: string) => document.getElementById(id) as HTMLElement;

/** A `.seg` group: one active button at a time, mirrored to aria-pressed. */
export function segmented(id: string, onPick: (value: string, btn: HTMLButtonElement) => void) {
  const host = el(id);
  const btns = Array.from(host.querySelectorAll('button'));
  const value = (b: HTMLButtonElement) => Object.values(b.dataset)[0] ?? '';
  const set = (active: HTMLButtonElement | null) =>
    btns.forEach((b) => {
      const on = b === active;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  set(btns.find((b) => b.classList.contains('active')) ?? null);
  host.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (!btn) return;
    set(btn);
    onPick(value(btn), btn);
  });
  return {
    clear: () => set(null),
    select: (v: string) => set(btns.find((b) => value(b) === v) ?? null),
    value: () => {
      const b = btns.find((x) => x.classList.contains('active'));
      return b ? value(b) : '';
    },
  };
}

/**
 * A range input with the `<b id="{id}val">` readout the Slider component
 * renders next to it. `onInput` receives the numeric value; `fmt` decides how
 * the readout prints it. Returns a setter that moves the slider from code.
 */
export function slider(
  id: string,
  onInput: (value: number) => void,
  fmt: (value: number) => string = (v) => String(v)
) {
  const input = el(id) as HTMLInputElement;
  const out = el(id + 'val');
  const show = (v: number) => { if (out) out.textContent = fmt(v); };
  input.addEventListener('input', () => {
    const v = +input.value;
    show(v);
    onInput(v);
  });
  show(+input.value);
  return (v: number) => {
    input.value = String(v);
    show(+input.value);
  };
}

/** A checkbox by id, calling back with its state on change. */
export function check(id: string, onChange: (on: boolean) => void) {
  const input = el(id) as HTMLInputElement;
  input.addEventListener('change', () => onChange(input.checked));
  return (on: boolean) => { input.checked = on; };
}

/**
 * Run / Step / Reset. The run button flips between "Run" and "Pause" and
 * carries aria-pressed; the keyboard shortcuts in the stage chrome click the
 * same ids, so the labels never drift from the state.
 */
export function transport(h: { onRun?: (running: boolean) => void; onStep?: () => void; onReset?: () => void }) {
  const run = document.getElementById('run') as HTMLButtonElement | null;
  let running = run?.textContent?.trim() === 'Pause';
  const paint = () => {
    if (!run) return;
    run.textContent = running ? 'Pause' : 'Run';
    run.setAttribute('aria-pressed', String(running));
  };
  paint();
  run?.addEventListener('click', () => {
    running = !running;
    paint();
    h.onRun?.(running);
  });
  document.getElementById('step')?.addEventListener('click', () => h.onStep?.());
  document.getElementById('reset')?.addEventListener('click', () => h.onReset?.());
  return {
    running: () => running,
    setRunning: (on: boolean) => { running = on; paint(); },
  };
}

/** The headline number under the stage. */
export function result(id = 'result') {
  const value = el(`${id}-value`), status = el(`${id}-status`), note = el(`${id}-note`);
  let last = '';
  return (r: { value: string; status?: string; note?: string; colour?: string }) => {
    const key = JSON.stringify(r);
    if (key === last) return;
    last = key;
    value.textContent = r.value;
    value.style.color = r.colour ?? '';
    if (status) status.textContent = r.status ?? '';
    if (note) note.textContent = r.note ?? '';
  };
}

/** Write a set of readout rows by id, skipping the DOM when nothing changed. */
export function readout() {
  const cache = new Map<string, string>();
  return (rows: Record<string, string>) => {
    for (const [id, text] of Object.entries(rows)) {
      if (cache.get(id) === text) continue;
      cache.set(id, text);
      const node = document.getElementById(id);
      if (node) node.textContent = text;
    }
  };
}

/**
 * Sliders for the entries of a matrix rendered by the Matrix component. Each
 * slider writes straight into `M`; the returned sync pushes `M` back into the
 * sliders and the printed cells after the sim changes it itself.
 */
export function matrix<K extends string>(M: Record<K, number>, keys: K[], onInput: (key: K) => void) {
  const setters = keys.map((k) => slider(k, (v) => { M[k] = v; onInput(k); }, (v) => v.toFixed(2)));
  return () =>
    keys.forEach((k, i) => {
      setters[i](M[k]);
      const cell = document.getElementById('m-' + k);
      if (cell) cell.textContent = M[k].toFixed(2);
    });
}
