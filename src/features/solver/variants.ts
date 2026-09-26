import type { GameData, Item, ItemId, Recipe, RecipeId } from '@/shared/data/types';
import { solve } from './solve';
import type { TechGate } from './tech';
import { SolverError, type FactoryPlan, type SolveResult, type UpgradeLevels } from './types';

/** Items some usable (non-special, non-hidden) recipe outputs. */
export function producibleItems(data: GameData): Set<ItemId> {
  return new Set(
    Object.values(data.recipes)
      .filter((r) => !r.special && !r.hidden)
      .flatMap((r) => r.outputs.map((o) => o.item)),
  );
}

export interface VariantChoice {
  recipeFor: Record<ItemId, RecipeId>;
  /** The item's recipe first, then the chosen upstream recipes. Empty for raw items. */
  path: RecipeId[];
}

/** Recipes making `item` as their main output; default (non-alternate) first, then by id. */
export function mainProducers(data: GameData, item: ItemId, gate: TechGate): Recipe[] {
  return Object.values(data.recipes)
    .filter((r) => !r.special && !r.hidden && gate.recipe(r.id) && r.outputs[0]?.item === item)
    .sort((a, b) => Number(a.alternate) - Number(b.alternate) || (a.id < b.id ? -1 : 1));
}

// tools/normalize generates one `Paradox_<item>` recipe (item → Mors) per obtainable item; the id prefix is
// the only marker the data carries.
export const PARADOX_PREFIX = 'Paradox_';

/**
 * 136 interchangeable Paradox rows would crowd out every other variant, so they collapse into two
 * representatives: the default the planner picks (first: non-alternate), and the cheapest whose
 * inputs can all be bought (raw with a buy price — raw items without one, like hidden amulets, are
 * not obtainable). Cheapest in copper is not cheapest in machines (paradox time varies per item),
 * hence both.
 */
function collapseParadox(data: GameData, recipes: Recipe[]): Recipe[] {
  const paradox = recipes.filter((r) => r.id.startsWith(PARADOX_PREFIX));
  if (paradox.length < 2) return recipes;
  const buyable = (r: Recipe) => r.inputs.every((s) => data.items[s.item]?.raw && data.items[s.item]!.buyPrice !== null);
  const cost = (r: Recipe) => r.inputs.reduce((sum, s) => sum + Math.max(data.items[s.item]!.buyPrice ?? data.items[s.item]!.value, 1) * s.qty, 0);
  const def = paradox[0]!;
  const cheapest = paradox.filter(buyable).sort((a, b) => cost(a) - cost(b) || (a.id < b.id ? -1 : 1))[0];
  const reps = cheapest && cheapest !== def ? [def, cheapest] : [def];
  const at = recipes.indexOf(def);
  const rest = recipes.filter((r) => !r.id.startsWith(PARADOX_PREFIX));
  return [...rest.slice(0, at), ...reps, ...rest.slice(at)];
}

/** The item's recipes × alternatives of their direct inputs, in odometer order so defaults come first. */
export function variantChoices(data: GameData, item: Item, max: number, gate: TechGate): VariantChoice[] {
  if (item.raw) return [{ recipeFor: {}, path: [] }];
  const out: VariantChoice[] = [];
  for (const r of collapseParadox(data, mainProducers(data, item.id, gate))) {
    const slots = [...new Set(r.inputs.map((s) => s.item))]
      .filter((i) => i !== item.id)
      .map((i) => ({ item: i, options: collapseParadox(data, mainProducers(data, i, gate)) }))
      .filter((s) => s.options.length >= 2);
    const pick = slots.map(() => 0);
    for (;;) {
      if (out.length >= max) return out;
      const recipeFor: Record<ItemId, RecipeId> = { [item.id]: r.id };
      const path = [r.id];
      slots.forEach((s, k) => {
        const chosen = s.options[pick[k]!]!.id;
        recipeFor[s.item] = chosen;
        path.push(chosen);
      });
      out.push({ recipeFor, path });
      let k = slots.length - 1;
      while (k >= 0 && pick[k] === slots[k]!.options.length - 1) pick[k--] = 0;
      if (k < 0) break;
      pick[k]!++;
    }
  }
  return out;
}

/** A hybrid plan with every optional choice empty. */
export function probePlan(patch: Partial<FactoryPlan>): FactoryPlan {
  return {
    targets: [],
    mode: 'targets',
    supplies: [],
    maximize: null,
    recipeFor: {},
    buildingFor: {},
    imports: [],
    fuel: null,
    fuelFor: {},
    fertilizer: null,
    fertilizerFor: {},
    optimize: null,
    ...patch,
  };
}

/** Solve, or null when this path cannot work (closed loop, unreachable input, locked tech). */
export async function trySolve(data: GameData, plan: FactoryPlan, levels: UpgradeLevels): Promise<SolveResult | null> {
  try {
    return await solve(data, plan, levels);
  } catch (e) {
    if (!(e instanceof SolverError) || e.code === 'internal') throw e;
    return null;
  }
}

/** Exact and built (ceil) machine counts, heaters included. */
export function machineTotals(res: SolveResult): { exact: number; ceil: number } {
  return {
    exact: res.nodes.reduce((sum, n) => sum + n.machinesExact + (n.heater?.countExact ?? 0), 0),
    ceil: res.nodes.reduce((sum, n) => sum + n.machines + (n.heater?.count ?? 0), 0),
  };
}
