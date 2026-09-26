import type { GameData, Item, ItemId, OutputStack, Recipe } from '@/shared/data/types';

// Read-only selectors over GameData shared by graph, inspector and pickers.

/** The main product is the guaranteed output; side/fail products carry chance < 1. */
export const mainOutput = (recipe: Recipe): OutputStack | undefined =>
  recipe.outputs.find((o) => o.chance === 1) ?? recipe.outputs[0];

/** Recipes the planner may pick for an item; `special` ones are out of MVP scope. */
export const recipesProducing = (data: GameData, item: ItemId): Recipe[] =>
  Object.values(data.recipes).filter((r) => !r.special && r.outputs.some((o) => o.item === item));

export const fuelItems = (data: GameData): Item[] => Object.values(data.items).filter((i) => i.heatValue > 0);

export const fertilizerItems = (data: GameData): Item[] =>
  Object.values(data.items).filter((i) => i.nutrientValue > 0);

export const upgradeValue = (data: GameData, id: GameData['upgrades'][number]['id'], level: number) => {
  const track = data.upgrades.find((u) => u.id === id);
  return track?.values[Math.min(level, track.maxLevel)] ?? 1;
};
