import type { Delta } from '@/features/solver';

// Solver output is float LP arithmetic: a 1e-12 residue is "no change", not a regression.
const EPS = 1e-6;

export type Trend = 'better' | 'worse' | 'same';

/** Every compared quantity is a cost (machines, raw, fuel, heat, space, money): less is better. */
export const trend = (delta: number): Trend => (Math.abs(delta) < EPS ? 'same' : delta < 0 ? 'better' : 'worse');

/**
 * Table rows split for display: changed ones by |Δ| desc, unchanged ones apart (collapsed on
 * screen), rows absent from both plans dropped.
 */
export function splitRows<T extends Delta>(rows: T[]): { changed: T[]; unchanged: T[] } {
  const present = rows.filter((r) => Math.abs(r.a) >= EPS || Math.abs(r.b) >= EPS);
  return {
    changed: present.filter((r) => trend(r.delta) !== 'same').sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)),
    unchanged: present.filter((r) => trend(r.delta) === 'same'),
  };
}
