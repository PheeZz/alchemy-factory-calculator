import type { BuildingId, GameData, Stack } from '@/shared/data/types';
import type { SolveResult } from './types';

export interface BuildListEntry {
  building: BuildingId;
  /** Built count (machines rounded up per node, heaters included). */
  count: number;
  unitCost: Stack[];
  unitMoney: number;
  totalCost: Stack[];
  totalMoney: number;
}

/**
 * Checklist of what to build, from totals.machines (heaters included). Belts and pipes are not in
 * it: they cost per tile (1 Plank / 1 Iron Ingot) and the solver knows no lengths.
 */
export function buildList(data: GameData, result: SolveResult): BuildListEntry[] {
  return result.totals.machines.map(({ building, count }) => {
    const b = data.buildings[building];
    const unitCost = b?.buildCost ?? [];
    const unitMoney = b?.buildCostMoney ?? 0;
    return {
      building,
      count,
      unitCost,
      unitMoney,
      totalCost: unitCost.map((s) => ({ item: s.item, qty: s.qty * count })),
      totalMoney: unitMoney * count,
    };
  });
}
