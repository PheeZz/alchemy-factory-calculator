import type { ItemId, Recipe } from '@/shared/data/types';
import type { SolveNode } from '@/features/solver/types';

export interface ItemRate {
  item: ItemId;
  perMin: number;
}

/** Per-minute recipe flows of a solved node; yield-skill recipes scale outputs by the alchemy multiplier. */
export function recipeRates(recipe: Recipe, node: SolveNode, alchemyMult: number) {
  const outMult = recipe.yieldSkill ? alchemyMult : 1;
  return {
    inputs: recipe.inputs.map((s): ItemRate => ({ item: s.item, perMin: s.qty * node.batchesPerMin })),
    outputs: recipe.outputs.map((s): ItemRate => ({ item: s.item, perMin: s.qty * outMult * node.batchesPerMin })),
  };
}
