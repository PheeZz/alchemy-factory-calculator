import type { GameData, ItemId, Recipe } from '@/shared/data/types';
import type { SolveNode } from '@/features/solver/types';
import { withCatalyst } from '@/features/solver';

export interface ItemRate {
  item: ItemId;
  perMin: number;
}

/**
 * Per-minute flows of a solved node as the solver ran it: a catalyst reshapes the batch (eternal
 * drops inputs, fertile doubles outputs…), so the plain recipe would misstate them. The catalyst
 * itself is left out: the inspector lists it on its own line. Yield-skill outputs get the alchemy multiplier.
 */
export function recipeRates(data: GameData, recipe: Recipe, node: SolveNode, alchemyMult: number) {
  const outMult = recipe.yieldSkill ? alchemyMult : 1;
  const batch = withCatalyst(data, recipe, node.catalyst?.item);
  return {
    inputs: batch.inputs
      .filter((s) => s !== batch.catalyst)
      .map((s): ItemRate => ({ item: s.item, perMin: s.qty * node.batchesPerMin })),
    outputs: batch.outputs.map((s): ItemRate => ({ item: s.item, perMin: s.qty * outMult * node.batchesPerMin })),
  };
}
