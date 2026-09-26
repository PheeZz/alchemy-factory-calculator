import type { FuelVariant } from '@/features/solver';

export type TierMetric = 'machines' | 'price' | 'perRaw';
export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';
export const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];

/** Only "heat per raw item" is better when larger; the other two are costs. */
export const higherIsBetter = (m: TierMetric) => m === 'perRaw';

/**
 * Metric per 1000 heat/s. Heat price is the larger of what the raw inputs cost and what the fuel
 * would sell for: burning a fuel worth more than its inputs loses that sale.
 */
export function metricValue(v: FuelVariant, m: TierMetric): number | null {
  if (m === 'machines') return v.machinesPer1k;
  if (m === 'price') return Math.max(v.rawValuePer1k, v.fuelValuePer1k);
  return v.heatPerRawItem;
}

const LIMITS: [number, Tier][] = [
  [1.5, 'S'],
  [3, 'A'],
  [10, 'B'],
  [30, 'C'],
];

/** Tier by how many times worse than the best value; a free (0) cost is always S. */
export function tierFor(value: number | null, best: number | null, higher: boolean): Tier | null {
  if (value === null) return null;
  if (!higher && value === 0) return 'S';
  if (best === null || best <= 0) return null;
  const ratio = higher ? (value > 0 ? best / value : Infinity) : value / best;
  return LIMITS.find(([limit]) => ratio <= limit)?.[1] ?? 'D';
}

export interface TierRow {
  variant: FuelVariant;
  value: number | null;
  tier: Tier | null;
}

/** Rows grouped S→D, best first inside a group; variants without a value go last, untiered. */
export function groupByTier(variants: FuelVariant[], metric: TierMetric): { tier: Tier | null; rows: TierRow[] }[] {
  const higher = higherIsBetter(metric);
  const values = variants.map((v) => metricValue(v, metric));
  const known = values.filter((x): x is number => x !== null);
  const best = higher ? (known.length ? Math.max(...known) : null) : (known.filter((x) => x > 0).length ? Math.min(...known.filter((x) => x > 0)) : null);
  const rows = variants
    .map((variant, i): TierRow => ({ variant, value: values[i]!, tier: tierFor(values[i]!, best, higher) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) return a.value === null ? (b.value === null ? 0 : 1) : -1;
      return higher ? b.value - a.value : a.value - b.value;
    });
  return [...TIERS, null]
    .map((tier) => ({ tier, rows: rows.filter((r) => r.tier === tier) }))
    .filter((g) => g.rows.length > 0);
}

export const variantKey = (v: FuelVariant) => `${v.fuel}:${v.path.join('>')}`;
