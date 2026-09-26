import type { Item, Recipe } from '../../src/shared/data/types';
import type { RawItem, RawVec } from './load';
import { fractionsOf } from './recipes';

/** Game money vector: X gold, Y silver, Z copper. */
export const copper = (v: RawVec) => v.X * 100_000 + v.Y * 1000 + v.Z;

export function normalizeItem(id: string, raw: RawItem, icon: string | null): Item {
  const fractions = fractionsOf(raw);
  return {
    id,
    nameKey: raw.DisplayName.Key ?? id,
    icon,
    // CostValue/StockCost are per whole item (Logs: 200 = StockCost); HeatValue is per part
    value: copper(raw.CostValue),
    buyPrice: raw.AllowPortalSupply ? copper(raw.StockCost) : null,
    heatValue: raw.HeatValue * fractions,
    nutrientValue: raw.NutrientValue,
    liquid: raw.IsLiquid,
    // a fractional item fills a slot with one whole item split into |MaximumStack| parts
    maxStack: raw.MaximumStack < 0 ? 1 : raw.MaximumStack,
    tags: raw.IngredientTags.map((t) => t.replace(/^Ingredient\.Type\./, '')),
    raw: true,
  };
}

/** Recipes the solver may use on its own: not special and reachable in a normal game. */
const isProductive = (r: Recipe) => r.special === null && r.unlockedBy !== null;

export function markRaw(items: Record<string, Item>, recipes: Recipe[]): void {
  const produced = new Set(recipes.filter(isProductive).flatMap((r) => r.outputs.map((o) => o.item)));
  for (const item of Object.values(items)) item.raw = !produced.has(item.id);
}
