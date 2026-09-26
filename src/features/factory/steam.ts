import type { GameData, Item, RecipeId } from '@/shared/data/types';
import type { FactoryPlan } from '@/features/solver/types';

/** Heat carried by a liquid (Steam): it is made by boilers, which themselves need a solid fuel. */
export const isSteamLike = (item: Item | undefined) => !!item && item.liquid && item.heatValue > 0;

/** Recipes that produce a steam-like fuel (Steam Boiler Low/Mid/High). */
export const boilerRecipes = (data: GameData): RecipeId[] =>
  Object.values(data.recipes)
    .filter((r) => !r.special && !r.hidden && r.outputs.some((o) => isSteamLike(data.items[o.item])))
    .map((r) => r.id);

export const usesSteam = (data: GameData, plan: FactoryPlan) =>
  isSteamLike(data.items[plan.fuel ?? '']) || Object.values(plan.fuelFor).some((f) => isSteamLike(data.items[f]));

/**
 * Boiler fuel choices to add so a steam-heated plan stays solvable: every boiler without a solid
 * fuel of its own gets `recommended`. A player's explicit boiler pick is kept.
 */
export function boilerFuelPatch(data: GameData, plan: FactoryPlan, recommended: string | null): Record<RecipeId, string> {
  if (!recommended || isSteamLike(data.items[recommended]) || !usesSteam(data, plan)) return {};
  const patch: Record<RecipeId, string> = {};
  for (const r of boilerRecipes(data)) {
    const own = plan.fuelFor[r];
    if (!own || isSteamLike(data.items[own])) patch[r] = recommended;
  }
  return patch;
}
