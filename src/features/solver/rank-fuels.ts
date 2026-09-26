import type { BuildingId, GameData, Item, ItemId, Recipe, RecipeId, Stack } from '@/shared/data/types';
import { getMultipliers } from '@/features/upgrades/multipliers';
import { solve } from './solve';
import { SolverError, type UpgradeLevels } from './types';

export interface FuelRank {
  item: ItemId;
  /** Machines (exact) of the self-fuelled chain per 1 heat/s delivered. */
  machinesPerHeat: number;
  /** Raw items/min imported per 1 heat/s delivered. */
  rawPerHeat: number;
}

export interface FuelVariant {
  fuel: ItemId;
  /** Recipe choices defining the path, e.g. { CokePowder: 'CokePowder', Coke: 'Coke_Alt' }. */
  recipeFor: Record<ItemId, RecipeId>;
  /** For display: the fuel's recipe first, then the chosen upstream recipes. Empty for raw fuels. */
  path: RecipeId[];
  /** Heat per item, fuel multiplier applied. */
  heatValue: number;
  /** Exact machines per 1000 heat/s delivered net, heaters (exact share) included. */
  machinesPer1k: number;
  /** Σ ceil(machines) per node, plus whole heaters. */
  machinesCeilPer1k: number;
  /** Raw items/min per 1000 heat/s. */
  raw: Stack[];
  /** Σ raw × (buyPrice ?? value), copper/min. */
  rawValuePer1k: number;
  /** Sale value given up by burning the fuel instead of selling it: fuel/min × item.value, copper/min. */
  fuelValuePer1k: number;
  buildCostPer1k: Stack[];
  /** Net heat per raw item when one raw carries ≥ 90 % of the raw value, else null. */
  heatPerRawItem: number | null;
  /** The chain's own heat is paid with this fuel. */
  selfHeated: boolean;
}

export interface FuelVariantOptions {
  fertilizer: ItemId | null;
  /** 'self': the chain burns the fuel it makes; an item id: every heated machine burns that instead. */
  heating: 'self' | ItemId;
  maxVariantsPerFuel?: number;
  /** Heater building for heated machines; absent/null → defaultHeater(data). */
  heater?: BuildingId | null;
}

/** Heat/s each variant delivers; big enough that tiny chains don't round to noise. */
const PROBE_HEAT = 1000;
const DOMINANT_RAW_SHARE = 0.9;

function fuelCandidates(data: GameData): Item[] {
  const producible = new Set(
    Object.values(data.recipes)
      .filter((r) => !r.special && !r.hidden)
      .flatMap((r) => r.outputs.map((o) => o.item)),
  );
  return Object.values(data.items).filter((i) => i.heatValue > 0 && !i.liquid && (i.raw || producible.has(i.id)));
}

/** Recipes making `item` as their main output; default (non-alternate) first, then by id. */
function mainProducers(data: GameData, item: ItemId): Recipe[] {
  return Object.values(data.recipes)
    .filter((r) => !r.special && !r.hidden && r.outputs[0]?.item === item)
    .sort((a, b) => Number(a.alternate) - Number(b.alternate) || (a.id < b.id ? -1 : 1));
}

// tools/normalize generates one `Paradox_<item>` recipe (item → Mors) per obtainable item; the id prefix is
// the only marker the data carries.
const PARADOX_PREFIX = 'Paradox_';

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

/** Fuel recipe × alternatives of its direct inputs, in odometer order so defaults come first. */
function variantChoices(data: GameData, fuel: Item, max: number): { recipeFor: Record<ItemId, RecipeId>; path: RecipeId[] }[] {
  if (fuel.raw) return [{ recipeFor: {}, path: [] }];
  const out: { recipeFor: Record<ItemId, RecipeId>; path: RecipeId[] }[] = [];
  for (const r of collapseParadox(data, mainProducers(data, fuel.id))) {
    const slots = [...new Set(r.inputs.map((s) => s.item))]
      .filter((i) => i !== fuel.id)
      .map((i) => ({ item: i, options: collapseParadox(data, mainProducers(data, i)) }))
      .filter((s) => s.options.length >= 2);
    const pick = slots.map(() => 0);
    for (;;) {
      if (out.length >= max) return out;
      const recipeFor: Record<ItemId, RecipeId> = { [fuel.id]: r.id };
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

async function evaluate(
  data: GameData,
  levels: UpgradeLevels,
  fuel: Item,
  choice: { recipeFor: Record<ItemId, RecipeId>; path: RecipeId[] },
  opts: FuelVariantOptions,
): Promise<FuelVariant | null> {
  const heatValue = fuel.heatValue * getMultipliers(data, levels).fuel;
  const heating = opts.heating === 'self' ? fuel.id : opts.heating;
  const rate = (PROBE_HEAT * 60) / heatValue;
  try {
    const res = await solve(
      data,
      {
        targets: [{ item: fuel.id, rate }],
        mode: 'targets',
        supplies: [],
        maximize: null,
        recipeFor: choice.recipeFor,
        buildingFor: {},
        imports: [],
        fuel: heating,
        fuelFor: {},
        fertilizer: opts.fertilizer,
        fertilizerFor: {},
        optimize: null,
        heater: opts.heater ?? null,
      },
      levels,
    );
    const value = (s: Stack) => s.qty * (data.items[s.item]!.buyPrice ?? data.items[s.item]!.value);
    const rawValue = res.totals.rawMoneyPerMin;
    const top = [...res.totals.raw].sort((a, b) => value(b) - value(a))[0];
    const dominant = top && (rawValue > 0 ? value(top) / rawValue >= DOMINANT_RAW_SHARE : res.totals.raw.length === 1);
    return {
      fuel: fuel.id,
      recipeFor: choice.recipeFor,
      path: choice.path,
      heatValue,
      machinesPer1k: res.nodes.reduce((sum, n) => sum + n.machinesExact + (n.heater?.countExact ?? 0), 0),
      machinesCeilPer1k: res.nodes.reduce((sum, n) => sum + n.machines + (n.heater?.count ?? 0), 0),
      raw: res.totals.raw,
      rawValuePer1k: rawValue,
      fuelValuePer1k: rate * fuel.value,
      buildCostPer1k: res.totals.buildCost,
      heatPerRawItem: dominant ? (PROBE_HEAT * 60) / top.qty : null,
      selfHeated: heating === fuel.id,
    };
  } catch (e) {
    // A path that cannot be solved (closed loop, unreachable input) is simply not a candidate.
    if (!(e instanceof SolverError) || e.code === 'internal') throw e;
    return null;
  }
}

/**
 * Every production path of every solid fuel, each solved (hybrid, with the path's recipe choices)
 * for PROBE_HEAT heat/s leaving the chain. Sorted by machines, then raw value, then fuel and path.
 */
export async function rankFuelVariants(data: GameData, levels: UpgradeLevels, opts: FuelVariantOptions): Promise<FuelVariant[]> {
  const variants: FuelVariant[] = [];
  for (const fuel of fuelCandidates(data)) {
    for (const choice of variantChoices(data, fuel, opts.maxVariantsPerFuel ?? 8)) {
      const v = await evaluate(data, levels, fuel, choice, opts);
      if (v) variants.push(v);
    }
  }
  const id = (v: FuelVariant) => `${v.fuel}:${v.path.join('>')}`;
  return variants.sort(
    (a, b) => a.machinesPer1k - b.machinesPer1k || a.rawValuePer1k - b.rawValuePer1k || (id(a) < id(b) ? -1 : 1),
  );
}

const rawCount = (v: FuelVariant) => v.raw.reduce((sum, s) => sum + s.qty, 0);

/**
 * Best self-heated path per solid fuel, as machines and raw items per 1 heat/s. Sorted by machines,
 * then raw input, then id. `fertilizer` feeds any nurseries in a fuel's chain.
 */
export async function rankFuels(data: GameData, levels: UpgradeLevels, fertilizer: ItemId | null = null): Promise<FuelRank[]> {
  const best = new Map<ItemId, FuelVariant>();
  for (const v of await rankFuelVariants(data, levels, { fertilizer, heating: 'self' })) {
    const cur = best.get(v.fuel);
    if (!cur || v.machinesPer1k < cur.machinesPer1k || (v.machinesPer1k === cur.machinesPer1k && rawCount(v) < rawCount(cur))) {
      best.set(v.fuel, v);
    }
  }
  return [...best.values()]
    .map((v) => ({ item: v.fuel, machinesPerHeat: v.machinesPer1k / PROBE_HEAT, rawPerHeat: rawCount(v) / PROBE_HEAT }))
    .sort((a, b) => a.machinesPerHeat - b.machinesPerHeat || a.rawPerHeat - b.rawPerHeat || (a.item < b.item ? -1 : 1));
}

/** Default fuel for a factory: the best-ranked fuel that has to be made (raw fuels rank first on
 * zero machines but are the costlier heat per ore); falls back to the best raw one. */
export function defaultFuel(ranks: FuelRank[], data: GameData): ItemId | null {
  return (ranks.find((r) => !data.items[r.item]?.raw) ?? ranks[0])?.item ?? null;
}
