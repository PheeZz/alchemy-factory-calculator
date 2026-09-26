import type { GameData } from '@/shared/data/types';
import type { FuelVariant } from '@/features/solver';
import { chooseFuel } from '@/features/factory/fuelActions';
import { useFactoryStore } from '@/features/factory/store';
import { useViewStore } from '@/shared/lib/view';

/** Puts a variant into the active factory: its fuel plus the recipe path that makes it. */
export function applyVariant(data: GameData, v: FuelVariant) {
  const s = useFactoryStore.getState();
  s.mergeRecipes(v.recipeFor);
  chooseFuel(data, null, v.fuel);
  useViewStore.getState().setView('calculator');
}
