import type { GameData, ItemId, Recipe } from '@/shared/data/types';
import { rankedRecipesFor } from './game';

export interface ItemUsage {
  /** Default recipe first (same rule as the solver), then alternates, then special (cauldron…) ones. */
  producedBy: Recipe[];
  consumedBy: Recipe[];
  /** Heat per item when it burns as fuel; 0 = not a fuel. */
  heat: number;
  /** Nutrients per item as fertilizer; 0 = not a fertilizer. */
  nutrient: number;
}

/** Everything the item card shows about one item. Hidden (cut) recipes are never listed. */
export function itemUsage(data: GameData, item: ItemId): ItemUsage {
  const info = Object.hasOwn(data.items, item) ? data.items[item] : undefined;
  if (!info) return { producedBy: [], consumedBy: [], heat: 0, nutrient: 0 };
  const visible = Object.values(data.recipes).filter((r) => !r.hidden);
  const special = visible.filter((r) => r.special && r.outputs.some((o) => o.item === item));
  return {
    producedBy: [...rankedRecipesFor(data, item), ...special],
    consumedBy: visible.filter((r) => r.inputs.some((s) => s.item === item)),
    heat: info.heatValue,
    nutrient: info.nutrientValue,
  };
}
