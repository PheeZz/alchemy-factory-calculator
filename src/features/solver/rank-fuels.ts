import type { BuildingId, GameData, Item, ItemId, RecipeId, Stack } from '@/shared/data/types';
import { getMultipliers } from '@/features/upgrades/multipliers';
import { techGate } from './tech';
import type { UpgradeLevels } from './types';
import { machineTotals, probePlan, producibleItems, trySolve, variantChoices, type VariantChoice } from './variants';

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
  /** Learned tech nodes; locked recipes are not offered as paths. Absent/null → all. */
  unlocked?: string[] | null;
  /** Heater building for heated machines; absent/null → defaultHeater(data). */
  heater?: BuildingId | null;
}

/** Heat/s each variant delivers; big enough that tiny chains don't round to noise. */
const PROBE_HEAT = 1000;
const DOMINANT_RAW_SHARE = 0.9;

function fuelCandidates(data: GameData): Item[] {
  const producible = producibleItems(data);
  return Object.values(data.items).filter((i) => i.heatValue > 0 && !i.liquid && (i.raw || producible.has(i.id)));
}

// Steam can't heat its own boilers; they burn the fuel under test so the variant stays self-contained.
function boilerFuel(data: GameData, heating: ItemId, fuel: ItemId): Record<RecipeId, ItemId> {
  if (!data.items[heating]?.liquid) return {};
  const boilers = Object.values(data.recipes).filter((r) => r.outputs.some((o) => o.item === heating));
  return Object.fromEntries(boilers.map((r) => [r.id, fuel]));
}

async function evaluate(
  data: GameData,
  levels: UpgradeLevels,
  fuel: Item,
  choice: VariantChoice,
  opts: FuelVariantOptions,
): Promise<FuelVariant | null> {
  const heatValue = fuel.heatValue * getMultipliers(data, levels).fuel;
  const heating = opts.heating === 'self' ? fuel.id : opts.heating;
  const rate = (PROBE_HEAT * 60) / heatValue;
  const res = await trySolve(
    data,
    probePlan({
      targets: [{ item: fuel.id, rate }],
      recipeFor: choice.recipeFor,
      fuel: heating,
      fuelFor: boilerFuel(data, heating, fuel.id),
      fertilizer: opts.fertilizer,
      heater: opts.heater ?? null,
      unlocked: opts.unlocked ?? null,
    }),
    levels,
  );
  if (!res) return null;
  const value = (s: Stack) => s.qty * (data.items[s.item]!.buyPrice ?? data.items[s.item]!.value);
  const rawValue = res.totals.rawMoneyPerMin;
  const top = [...res.totals.raw].sort((a, b) => value(b) - value(a))[0];
  const dominant = top && (rawValue > 0 ? value(top) / rawValue >= DOMINANT_RAW_SHARE : res.totals.raw.length === 1);
  const machines = machineTotals(res);
  return {
    fuel: fuel.id,
    recipeFor: choice.recipeFor,
    path: choice.path,
    heatValue,
    machinesPer1k: machines.exact,
    machinesCeilPer1k: machines.ceil,
    raw: res.totals.raw,
    rawValuePer1k: rawValue,
    fuelValuePer1k: rate * fuel.value,
    buildCostPer1k: res.totals.buildCost,
    heatPerRawItem: dominant ? (PROBE_HEAT * 60) / top.qty : null,
    selfHeated: heating === fuel.id,
  };
}

/**
 * Every production path of every solid fuel, each solved (hybrid, with the path's recipe choices)
 * for PROBE_HEAT heat/s leaving the chain. Sorted by machines, then raw value, then fuel and path.
 */
export async function rankFuelVariants(data: GameData, levels: UpgradeLevels, opts: FuelVariantOptions): Promise<FuelVariant[]> {
  const variants: FuelVariant[] = [];
  const gate = techGate(data, opts.unlocked);
  for (const fuel of fuelCandidates(data)) {
    for (const choice of variantChoices(data, fuel, opts.maxVariantsPerFuel ?? 8, gate)) {
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
