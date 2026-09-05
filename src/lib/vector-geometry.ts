// Pure vector maths shared by the vector experiments. No DOM here, so the
// functions can be unit tested from node.

export type Vector3 = { x: number; y: number; z: number };

export const O: Vector3 = { x: 0, y: 0, z: 0 };
export const add = (p: Vector3, q: Vector3): Vector3 => ({ x: p.x + q.x, y: p.y + q.y, z: p.z + q.z });
export const sub = (p: Vector3, q: Vector3): Vector3 => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
export const mul = (p: Vector3, s: number): Vector3 => ({ x: p.x * s, y: p.y * s, z: p.z * s });
export const dot = (p: Vector3, q: Vector3) => p.x * q.x + p.y * q.y + p.z * q.z;
export const len = (p: Vector3) => Math.hypot(p.x, p.y, p.z);
export const unit = (p: Vector3): Vector3 => (len(p) > 1e-9 ? mul(p, 1 / len(p)) : { x: 1, y: 0, z: 0 });
export const cross = (p: Vector3, q: Vector3): Vector3 => ({
  x: p.y * q.z - p.z * q.y,
  y: p.z * q.x - p.x * q.z,
  z: p.x * q.y - p.y * q.x,
});

export const AXIS = ['x', 'y', 'z'] as const;
export const comp = (v: Vector3, i: number) => (i === 0 ? v.x : i === 1 ? v.y : v.z);

/** Angle between two vectors in degrees, or null when either is zero. */
export function angleBetween(a: Vector3, b: Vector3) {
  const la = len(a), lb = len(b);
  if (la < 1e-9 || lb < 1e-9) return null;
  return (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (la * lb)))) * 180) / Math.PI;
}

export function dotGeometry(a: Vector3, b: Vector3) {
  const lengthA = len(a);
  const lengthB = len(b);
  const raw = dot(a, b);
  // Suppress floating-point residue, not small nonzero geometric areas.
  const product = Math.abs(raw) <= 16 * Number.EPSILON * lengthA * lengthB ? 0 : raw;
  const projection = lengthA > 0 ? product / lengthA : 0;
  const angle = lengthA > 0 && lengthB > 0
    ? Math.acos(Math.max(-1, Math.min(1, product / (lengthA * lengthB)))) * 180 / Math.PI
    : null;
  return { lengthA, lengthB, product, projection, area: Math.abs(product), angle };
}

/**
 * The patch spanned by a and b, seen straight down each axis. Plane 0 is yz,
 * 1 is zx, 2 is xy: the cyclic order, which is where the sign pattern of the
 * cross product formula comes from. Each signed area is one component.
 */
export function componentPlanes(a: Vector3, b: Vector3) {
  return [
    { axes: ['y', 'z'], component: 'x', a: [a.y, a.z], b: [b.y, b.z] },
    { axes: ['z', 'x'], component: 'y', a: [a.z, a.x], b: [b.z, b.x] },
    { axes: ['x', 'y'], component: 'z', a: [a.x, a.y], b: [b.x, b.y] },
  ].map((plane) => ({ ...plane, area: plane.a[0] * plane.b[1] - plane.a[1] * plane.b[0] }));
}
