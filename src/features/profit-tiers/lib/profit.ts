import type { ProfitVariant } from '@/features/solver';
import { groupByTier } from '@/shared/lib/tiers';

export type ProfitMetric = 'marginMachine' | 'marginItem' | 'multiplier';

/** All three are "more is better"; a machine-less resale has no per-machine margin (untiered). */
export function profitValue(v: ProfitVariant, m: ProfitMetric): number | null {
  if (m === 'marginMachine') return v.marginPerMachine;
  if (m === 'marginItem') return v.marginPerItem;
  return v.valueMultiplier;
}

export const groupProfit = (variants: ProfitVariant[], metric: ProfitMetric) =>
  groupByTier(variants, (v) => profitValue(v, metric), true);

export const profitKey = (v: ProfitVariant) => `${v.item}:${v.path.join('>')}`;
