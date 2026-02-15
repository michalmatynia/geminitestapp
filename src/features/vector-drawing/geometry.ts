import type { VectorPoint, VectorShape } from './types';

const distanceSq = (a: VectorPoint, b: VectorPoint): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

const perpendicularDistanceSq = (p: VectorPoint, a: VectorPoint, b: VectorPoint): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return distanceSq(p, a);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + clamped * dx, y: a.y + clamped * dy };
  return distanceSq(p, proj);
};

export const smoothPoints = (points: VectorPoint[], iterations: number = 1): VectorPoint[] => {
  if (points.length < 3) return points;
  let result = [...points];
  for (let iter = 0; iter < iterations; iter += 1) {
    const next: VectorPoint[] = [result[0]!];
    for (let i = 0; i < result.length - 1; i += 1) {
      const p0 = result[i]!;
      const p1 = result[i + 1]!;
      const q = { x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y };
      const r = { x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y };
      next.push(q, r);
    }
    next.push(result[result.length - 1]!);
    result = next;
  }
  return result;
};

export const simplifyPoints = (points: VectorPoint[], tolerance: number = 0.0025): VectorPoint[] => {
  if (points.length < 3) return points;
  const tolSq = tolerance * tolerance;

  const simplify = (pts: VectorPoint[], start: number, end: number, keep: boolean[]): void => {
    let maxDist = 0;
    let index = 0;
    const a = pts[start]!;
    const b = pts[end]!;
    for (let i = start + 1; i < end; i += 1) {
      const dist = perpendicularDistanceSq(pts[i], a, b);
      if (dist > maxDist) {
        index = i;
        maxDist = dist;
      }
    }
    if (maxDist > tolSq) {
      keep[index] = true;
      simplify(pts, start, index, keep);
      simplify(pts, index, end, keep);
    }
  };

  const keep: boolean[] = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  simplify(points, 0, points.length - 1, keep);
  return points.filter((_: VectorPoint, idx: number) => keep[idx]);
};

export const smoothShape = (shape: VectorShape, iterations: number = 1): VectorShape => ({
  ...shape,
  points: smoothPoints(shape.points, iterations),
});

export const simplifyShape = (shape: VectorShape, tolerance: number = 0.0025): VectorShape => ({
  ...shape,
  points: simplifyPoints(shape.points, tolerance),
});
