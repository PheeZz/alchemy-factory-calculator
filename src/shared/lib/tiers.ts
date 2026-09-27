export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';
export const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];

const LIMITS: [number, Tier][] = [
  [1.5, 'S'],
  [3, 'A'],
  [10, 'B'],
  [30, 'C'],
];

/**
 * Tier by how many times worse than the best value (≤1.5× S, ≤3× A, ≤10× B, ≤30× C, else D).
 * A free (0) cost is always S; a non-positive "higher is better" value is D.
 */
export function tierFor(value: number | null, best: number | null, higher: boolean): Tier | null {
  if (value === null) return null;
  if (!higher && value === 0) return 'S';
  if (best === null || best <= 0) return null;
  const ratio = higher ? (value > 0 ? best / value : Infinity) : value / best;
  return LIMITS.find(([limit]) => ratio <= limit)?.[1] ?? 'D';
}

export interface TierRow<T> {
  item: T;
  value: number | null;
  tier: Tier | null;
}

/** Rows grouped S→D, best first inside a group; rows without a value go last, untiered. */
export function groupByTier<T>(items: T[], valueOf: (t: T) => number | null, higher: boolean): { tier: Tier | null; rows: TierRow<T>[] }[] {
  const values = items.map(valueOf);
  const known = values.filter((x): x is number => x !== null);
  const positive = known.filter((x) => x > 0);
  const best = higher ? (known.length ? Math.max(...known) : null) : positive.length ? Math.min(...positive) : null;
  const rows = items
    .map((item, i): TierRow<T> => ({ item, value: values[i]!, tier: tierFor(values[i]!, best, higher) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) return a.value === null ? (b.value === null ? 0 : 1) : -1;
      return higher ? b.value - a.value : a.value - b.value;
    });
  return [...TIERS, null].map((tier) => ({ tier, rows: rows.filter((r) => r.tier === tier) })).filter((g) => g.rows.length > 0);
}
