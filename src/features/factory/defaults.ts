import type { GameData, Item } from '@/shared/data/types';
import type { FactoryPlan } from '@/features/solver/types';

const obtainable = (data: GameData, item: Item) =>
  item.raw || Object.values(data.recipes).some((r) => !r.special && !r.hidden && r.outputs.some((o) => o.item === item.id));

/**
 * Default fuel: the obtainable solid fuel that sacrifices the least sale value per unit of heat
 * (lowest value / heatValue). Liquids are skipped: steam heats through boilers, not furnace slots.
 */
export function defaultFuel(data: GameData): string | null {
  const fuels = Object.values(data.items)
    .filter((i) => i.heatValue > 0 && !i.liquid && obtainable(data, i))
    .sort((a, b) => a.value / a.heatValue - b.value / b.heatValue || a.id.localeCompare(b.id));
  return fuels[0]?.id ?? null;
}

/** Default fertilizer: the game's starter fertilizer when present, else none. */
export const defaultFertilizer = (data: GameData): string | null =>
  data.items.BasicFertilizer ? 'BasicFertilizer' : null;

export const planDefaults = (data: GameData): Partial<FactoryPlan> => ({
  fuel: defaultFuel(data),
  fertilizer: defaultFertilizer(data),
});
