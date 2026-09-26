import type { ElkPoint } from 'elkjs/lib/elk-api';

const RADIUS = 10;

/** SVG path through orthogonal points with rounded corners (radius shrinks on short segments). */
export function roundedPath(points: ElkPoint[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [p, c, n] = [points[i - 1]!, points[i]!, points[i + 1]!];
    const r = Math.min(RADIUS, Math.hypot(c.x - p.x, c.y - p.y) / 2, Math.hypot(n.x - c.x, n.y - c.y) / 2);
    const inX = c.x - Math.sign(c.x - p.x) * r;
    const inY = c.y - Math.sign(c.y - p.y) * r;
    const outX = c.x + Math.sign(n.x - c.x) * r;
    const outY = c.y + Math.sign(n.y - c.y) * r;
    d += ` L ${inX} ${inY} Q ${c.x} ${c.y} ${outX} ${outY}`;
  }
  const last = points.at(-1)!;
  return `${d} L ${last.x} ${last.y}`;
}
