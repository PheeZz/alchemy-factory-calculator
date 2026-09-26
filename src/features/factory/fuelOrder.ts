import type { Item } from '@/shared/data/types';
import type { FuelRank } from '@/features/solver';

/** Ranked fuels in ranking order, then unranked ones (chains the ranker could not solve) by name. */
export function orderFuels(items: Item[], ranks: FuelRank[] | null, name: (key: string) => string): Item[] {
  const pos = new Map(ranks?.map((r, i) => [r.item, i]));
  return [...items].sort((a, b) => {
    const pa = pos.get(a.id) ?? Infinity;
    const pb = pos.get(b.id) ?? Infinity;
    return pa !== pb ? pa - pb : name(a.nameKey).localeCompare(name(b.nameKey));
  });
}
