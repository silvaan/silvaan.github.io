// Zoom and pan over a stage the page draws in its own fixed coordinates.
//
// The wheel (or a pinch) zooms about the pointer, a drag pans, a double-click
// goes home. A page with something to turn (a 3D cloud) can claim plain drags
// for that through `canTurn`; a shift-drag or a right-drag still pans. The page
// sends every on-stage position through `X()` / `Y()`, so dots and labels keep
// their size while the space between them grows.

export function stageCamera(
  canvas: HTMLCanvasElement,
  W: number,
  H: number,
  o: { canTurn?: () => boolean; turn?: (dx: number, dy: number) => void } = {}
) {
  /** screen = position · z + (x, y). The wheel sets the goal and the view eases to it. */
  const cam = { z: 1, x: 0, y: 0 };
  const goal = { z: 1, x: 0, y: 0 };
  const Z_MIN = 0.4, Z_MAX = 12;

  const local = (e: { clientX: number; clientY: number }) => {
    const b = canvas.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / b.width) * W, y: ((e.clientY - b.top) / b.height) * H };
  };

  function zoomAbout(t: typeof cam, mx: number, my: number, k: number) {
    const z = Math.min(Z_MAX, Math.max(Z_MIN, t.z * k));
    t.x = mx - ((mx - t.x) * z) / t.z;
    t.y = my - ((my - t.y) * z) / t.z;
    t.z = z;
  }
  /** Drags and pinches move the view at once, with no easing behind the finger. */
  function now(f: (t: typeof cam) => void) {
    f(cam);
    f(goal);
  }

  const pts = new Map<number, { x: number; y: number }>();
  let mode: 'none' | 'pan' | 'turn' | 'pinch' = 'none';
  let pinch = { d: 1, x: 0, y: 0 };
  const twoFinger = () => {
    const [a, b] = [...pts.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    const p = local(e);
    pts.set(e.pointerId, p);
    canvas.setPointerCapture(e.pointerId);
    if (pts.size === 2) {
      mode = 'pinch';
      pinch = twoFinger();
    } else if (pts.size === 1) {
      mode = o.canTurn?.() && e.button === 0 && !e.shiftKey ? 'turn' : 'pan';
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const last = pts.get(e.pointerId);
    if (!last) return;
    const p = local(e);
    pts.set(e.pointerId, p);
    if (mode === 'pinch' && pts.size === 2) {
      const q = twoFinger();
      now((t) => { t.x += q.x - pinch.x; t.y += q.y - pinch.y; zoomAbout(t, q.x, q.y, q.d / pinch.d); });
      pinch = q;
    } else if (mode === 'turn') {
      o.turn?.(p.x - last.x, p.y - last.y);
    } else if (mode === 'pan') {
      now((t) => { t.x += p.x - last.x; t.y += p.y - last.y; });
      canvas.style.cursor = 'grabbing';
    }
  });
  const up = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    // lifting one finger of a pinch leaves the other panning
    mode = pts.size === 1 ? 'pan' : 'none';
    if (!pts.size) canvas.style.cursor = '';
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const p = local(e);
      zoomAbout(goal, p.x, p.y, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false }
  );
  canvas.addEventListener('dblclick', () => home());

  function home() {
    goal.z = 1; goal.x = 0; goal.y = 0;
  }

  let before = 0;
  return {
    X: (x: number) => x * cam.z + cam.x,
    Y: (y: number) => y * cam.z + cam.y,
    get z() { return cam.z; },
    /** A drag or pinch is under way: hovering waits. */
    get busy() { return mode !== 'none'; },
    /** Moved off home, so the page can say how to come back. */
    get away() { return Math.abs(goal.z - 1) > 1e-3 || Math.abs(goal.x) > 0.5 || Math.abs(goal.y) > 0.5; },
    home,
    /** Ease toward the goal; call once a frame. Runs on wall time, so it also eases while the story is paused. */
    tick() {
      const t = performance.now(), dt = before ? Math.min(0.05, (t - before) / 1000) : 0;
      before = t;
      const k = 1 - Math.exp(-dt * 14);
      cam.z += (goal.z - cam.z) * k;
      cam.x += (goal.x - cam.x) * k;
      cam.y += (goal.y - cam.y) * k;
    },
  };
}
