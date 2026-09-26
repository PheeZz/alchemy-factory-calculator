import type { GameData } from '@/shared/data/types';
import { defaultFuel } from '@/features/solver';
import type { UpgradeLevels } from '@/features/solver/types';
import { fuelRanksFor } from './solverClient';

/** Default fertilizer: the game's starter fertilizer when present, else none. */
export const defaultFertilizer = (data: GameData): string | null =>
  Object.hasOwn(data.items, 'BasicFertilizer') ? 'BasicFertilizer' : null;

export const maxLevelsOf = (data: GameData) =>
  Object.fromEntries(data.upgrades.map((t) => [t.id, t.maxLevel])) as UpgradeLevels;

/**
 * Plan defaults for new factories. Fuel comes from the solver's ranking (fewest machines per unit of
 * heat for the whole self-fuelled chain; Coal on real data). If ranking fails the fuel stays unset
 * and the player picks one; existing factories are never touched.
 */
export async function planDefaults(data: GameData, levels: UpgradeLevels) {
  const fertilizer = defaultFertilizer(data);
  const fuel = await fuelRanksFor(data, levels, fertilizer).then(
    (ranks) => defaultFuel(ranks, data),
    () => null,
  );
  return { fuel, fertilizer };
}
