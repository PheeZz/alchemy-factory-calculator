import type { BuildingId, GameData, Item, ItemId, RecipeId, Stack } from '@/shared/data/types';
import { techGate } from './tech';
import type { UpgradeLevels } from './types';
import { machineTotals, probePlan, producibleItems, trySolve, variantChoices } from './variants';

export interface ProfitVariant {
  item: ItemId;
  recipeFor: Record<ItemId, RecipeId>;
  /** The item's recipe first, then the chosen upstream recipes. Empty = buy and resell. */
  path: RecipeId[];
  /** Shop price per item (item.value), copper. */
  salePrice: number;
  /** Exact machines (heaters included) per 1 item/min. */
  machinesPerItem: number;
  /** Raw items bought per item. */
  rawPerItem: Stack[];
  /** Σ raw × (buyPrice ?? value) per item: includes the raws of the fuel the chain makes and burns. */
  rawCostPerItem: number;
  /** salePrice − rawCostPerItem. */
  marginPerItem: number;
  /** salePrice / rawCostPerItem; null when the chain buys nothing. */
  valueMultiplier: number | null;
  /** Copper/min one machine of the chain earns: sale and margin; null for a machine-less resale. */
  salePerMachine: number | null;
  marginPerMachine: number | null;
  /** Burned fuel per item, and its sale value (opportunity cost, already paid for via rawCostPerItem). */
  fuelPerItem: Stack[];
  fuelValuePerItem: number;
  /** Value of the surplus the chain leaves over per item (not in the margin). */
  byproductValuePerItem: number;
  heatPerSecPerItem: number;
}

export interface ProfitVariantOptions {
  fuel: ItemId | null;
  /** Fuel per recipe, e.g. boilers when `fuel` is Steam. */
  fuelFor?: Record<RecipeId, ItemId>;
  fertilizer: ItemId | null;
  heater?: BuildingId | null;
  unlocked?: string[] | null;
  /** Paths per item (default 4). */
  maxVariantsPerItem?: number;
}

/** Items/min each variant is solved for; per-item metrics divide it out (the model is linear). */
const PROBE_RATE = 60;

function candidates(data: GameData): Item[] {
  const producible = producibleItems(data);
  // Raw items only resell if they can be bought at all; the others are hidden or cauldron-only.
  return Object.values(data.items).filter(
    (i) => i.sellType && i.value > 0 && (i.raw ? i.buyPrice !== null : producible.has(i.id)),
  );
}

/**
 * Every production path of every shop-sellable item, solved (hybrid, with the path's recipe
 * choices) at PROBE_RATE/min and reported per item and per machine. Sorted by margin per machine
 * (machine-less resale last), then margin per item.
 */
export async function rankProfitVariants(data: GameData, levels: UpgradeLevels, opts: ProfitVariantOptions): Promise<ProfitVariant[]> {
  const gate = techGate(data, opts.unlocked);
  const out: ProfitVariant[] = [];
  for (const item of candidates(data)) {
    for (const choice of variantChoices(data, item, opts.maxVariantsPerItem ?? 4, gate)) {
      const res = await trySolve(
        data,
        probePlan({
          targets: [{ item: item.id, rate: PROBE_RATE }],
          recipeFor: choice.recipeFor,
          fuel: opts.fuel,
          fuelFor: opts.fuelFor ?? {},
          fertilizer: opts.fertilizer,
          heater: opts.heater ?? null,
          unlocked: opts.unlocked ?? null,
        }),
        levels,
      );
      if (!res) continue;
      const per = (qty: number) => qty / PROBE_RATE;
      const machinesPerItem = per(machineTotals(res).exact);
      const rawCostPerItem = per(res.totals.rawMoneyPerMin);
      const marginPerItem = item.value - rawCostPerItem;
      const fuel = new Map<ItemId, number>();
      for (const n of res.nodes) if (n.fuel) fuel.set(n.fuel.item, (fuel.get(n.fuel.item) ?? 0) + n.fuel.rate);
      const fuelPerItem = [...fuel].map(([f, qty]) => ({ item: f, qty: per(qty) }));
      out.push({
        item: item.id,
        recipeFor: choice.recipeFor,
        path: choice.path,
        salePrice: item.value,
        machinesPerItem,
        rawPerItem: res.totals.raw.map((s) => ({ item: s.item, qty: per(s.qty) })),
        rawCostPerItem,
        marginPerItem,
        valueMultiplier: rawCostPerItem > 0 ? item.value / rawCostPerItem : null,
        salePerMachine: machinesPerItem > 0 ? item.value / machinesPerItem : null,
        marginPerMachine: machinesPerItem > 0 ? marginPerItem / machinesPerItem : null,
        fuelPerItem,
        fuelValuePerItem: fuelPerItem.reduce((sum, s) => sum + s.qty * data.items[s.item]!.value, 0),
        byproductValuePerItem: per(res.totals.surplus.reduce((sum, s) => sum + s.qty * data.items[s.item]!.value, 0)),
        heatPerSecPerItem: per(res.totals.heatPerSec),
      });
    }
  }
  const key = (v: ProfitVariant) => `${v.item}:${v.path.join('>')}`;
  return out.sort(
    (a, b) =>
      (b.marginPerMachine ?? -Infinity) - (a.marginPerMachine ?? -Infinity) || b.marginPerItem - a.marginPerItem || (key(a) < key(b) ? -1 : 1),
  );
}
