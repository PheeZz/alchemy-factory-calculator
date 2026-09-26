import type { GameData, Item, ItemId, OutputStack, Recipe } from '@/shared/data/types';

// Read-only selectors over GameData shared by graph, inspector and pickers.

/** The main product is the guaranteed output; side/fail products carry chance < 1. */
export const mainOutput = (recipe: Recipe): OutputStack | undefined =>
  recipe.outputs.find((o) => o.chance === 1) ?? recipe.outputs[0];

/** Recipes the planner may pick for an item; `special` and cut (`hidden`) ones are out of MVP scope. */
export const recipesProducing = (data: GameData, item: ItemId): Recipe[] =>
  Object.values(data.recipes).filter((r) => !r.special && !r.hidden && r.outputs.some((o) => o.item === item));

/** Sale value of the inputs spent per unit of `item`: what the recipe "burns" to make it. */
export const inputValuePerOutput = (data: GameData, recipe: Recipe, item: ItemId) => {
  const out = recipe.outputs.filter((o) => o.item === item).reduce((a, o) => a + o.qty, 0);
  const spent = recipe.inputs.reduce((a, s) => a + s.qty * (data.items[s.item]?.value ?? 0), 0);
  return out > 0 ? spent / out : Infinity;
};

const defaultRank = (r: Recipe, item: ItemId) => (r.alternate ? 2 : 0) + (r.outputs[0]?.item === item ? 0 : 1);

/**
 * Display order for alternatives: the solver's default first (same rule as its producer index:
 * main output, non-alternate, then id), then the rest by rank and by cheapest inputs per output.
 */
export function rankedRecipesFor(data: GameData, item: ItemId): Recipe[] {
  const list = recipesProducing(data, item);
  const byDefault = [...list].sort((a, b) => defaultRank(a, item) - defaultRank(b, item) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const def = byDefault[0];
  const rest = list
    .filter((r) => r !== def)
    .map((r) => ({ r, rank: defaultRank(r, item), cost: inputValuePerOutput(data, r, item) }))
    .sort((a, b) => a.rank - b.rank || a.cost - b.cost || a.r.id.localeCompare(b.r.id))
    .map((x) => x.r);
  return def ? [def, ...rest] : [];
}

const producible = (data: GameData, id: ItemId) =>
  Object.values(data.recipes).some((r) => !r.special && !r.hidden && r.outputs.some((o) => o.item === id));

/**
 * Fuels a player can sensibly pick. A liquid with no producer (Steam: raw, heated by boilers) would
 * be imported for free and make heat costless, so it is left out.
 */
export const fuelItems = (data: GameData): Item[] =>
  Object.values(data.items).filter((i) => i.heatValue > 0 && !(i.liquid && !producible(data, i.id)));

export const fertilizerItems = (data: GameData): Item[] =>
  Object.values(data.items).filter((i) => i.nutrientValue > 0);

export const upgradeValue = (data: GameData, id: GameData['upgrades'][number]['id'], level: number) => {
  const track = data.upgrades.find((u) => u.id === id);
  return track?.values[Math.min(level, track.maxLevel)] ?? 1;
};

/** Buildings that heat other machines (Stone Stove, Furnace, Steam Heater Pad). */
export const heaterBuildings = (data: GameData) => Object.values(data.buildings).filter((b) => (b.heatSlots ?? 0) > 0);

/**
 * Same compatibility rule as the solver's heater pick: liquid fuel (steam) enters through pipe ports,
 * solid fuel through belt ports. No fuel known → any heater.
 */
export const heatersFor = (data: GameData, fuel: ItemId | null | undefined) => {
  const f = fuel ? data.items[fuel] : undefined;
  return heaterBuildings(data).filter((b) => !f || b.ports.some((p) => p.pipe === f.liquid && p.dir !== 'out'));
};
