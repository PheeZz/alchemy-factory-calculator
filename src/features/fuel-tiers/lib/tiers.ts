import type { FuelVariant } from '@/features/solver';
import { groupByTier as groupGeneric } from '@/shared/lib/tiers';

export { tierFor, type Tier } from '@/shared/lib/tiers';

export type TierMetric = 'machines' | 'price' | 'perRaw';

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

export const groupByTier = (variants: FuelVariant[], metric: TierMetric) =>
  groupGeneric(variants, (v) => metricValue(v, metric), higherIsBetter(metric)).map((g) => ({
    tier: g.tier,
    rows: g.rows.map((r) => ({ variant: r.item, value: r.value, tier: r.tier })),
  }));

export const variantKey = (v: FuelVariant) => `${v.fuel}:${v.path.join('>')}`;
