import type { GameData } from '@/shared/data/types';
import { fuelItems } from '@/entities/game';
import { boilerFuelPatch, isSteamLike } from './steam';
import { useFactoryStore } from './store';

/** After any fuel change: boilers of a steam-heated plan get a solid fuel so the plan stays solvable. */
export function ensureBoilerFuel(data: GameData): boolean {
  const s = useFactoryStore.getState();
  const plan = s.factories.find((f) => f.id === s.activeId)?.plan;
  if (!plan) return false;
  const recommended =
    s.planDefaults.fuel && !isSteamLike(data.items[s.planDefaults.fuel])
      ? s.planDefaults.fuel
      : (fuelItems(data).find((i) => !isSteamLike(i))?.id ?? null);
  const patch = boilerFuelPatch(data, plan, recommended);
  for (const [recipe, fuel] of Object.entries(patch)) s.setFuelFor(recipe, fuel);
  return Object.keys(patch).length > 0;
}

/** Factory fuel (`recipe` null) or a node override. */
export function chooseFuel(data: GameData, recipe: string | null, fuel: string | null) {
  const s = useFactoryStore.getState();
  if (recipe) s.setFuelFor(recipe, fuel);
  else s.setFuel(fuel);
  ensureBoilerFuel(data);
}
