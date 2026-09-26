import type { GameData, ItemId, RecipeId } from '@/shared/data/types';
import { getMultipliers } from '@/features/upgrades/multipliers';
import { techGate } from './tech';
import { PARADOX_PREFIX } from './variants';
import type { SolveResult, UpgradeLevels } from './types';

export interface ByproductConsumer {
  recipe: RecipeId;
  /** Main product of that recipe. */
  product: ItemId;
  /** Batches/min and machines (default building, current factory speed) to use up the whole surplus. */
  batchesPerMin: number;
  machinesExact: number;
  /** Other inputs that recipe also needs. */
  otherInputs: ItemId[];
}

export interface ByproductOption {
  item: ItemId;
  perMin: number;
  /** Copper/min if sold; null when no shop buys it. */
  saleValuePerMin: number | null;
  /** Heat/s it would give if burned (fuel multiplier applied); null when it is not a fuel. */
  heatPerSec: number | null;
  consumers: ByproductConsumer[];
}

export interface ByproductOptions {
  levels?: UpgradeLevels;
  unlocked?: string[] | null;
  /** Consumers per item (default 5). */
  limit?: number;
}

const NO_UPGRADES: UpgradeLevels = { conveyor: 0, factorySpeed: 0, alchemySkill: 0, fuelEfficiency: 0, fertilizerEfficiency: 0 };

/**
 * Ways to get rid of each surplus item of a result: sell it, burn it, or feed it to a recipe.
 * Consumers are usable (non-special, non-hidden, unlocked) recipes taking it as input: the ones
 * needing the fewest other inputs first, then the most valuable product; Paradox melting last.
 */
export function byproductOptions(data: GameData, result: SolveResult, opts: ByproductOptions = {}): ByproductOption[] {
  const mult = getMultipliers(data, opts.levels ?? NO_UPGRADES);
  const gate = techGate(data, opts.unlocked);
  const usable = Object.values(data.recipes).filter((r) => !r.special && !r.hidden && gate.recipe(r.id));
  return result.totals.surplus.map(({ item, qty: perMin }) => {
    const it = data.items[item]!;
    const consumers = usable
      .filter((r) => r.inputs.some((s) => s.item === item) && r.buildings.some(gate.building))
      .map((r): ByproductConsumer => {
        const building = data.buildings[r.buildings.find(gate.building)!];
        const perBatch = r.inputs.filter((s) => s.item === item).reduce((sum, s) => sum + s.qty, 0);
        const batchesPerMin = perMin / perBatch;
        return {
          recipe: r.id,
          product: r.outputs[0]!.item,
          batchesPerMin,
          machinesExact: (batchesPerMin * r.timeSec) / (60 * (building?.speedMult ?? 1) * mult.speed),
          otherInputs: [...new Set(r.inputs.map((s) => s.item).filter((i) => i !== item))],
        };
      })
      .sort(
        (a, b) =>
          // Any item melts into Mors in the Paradox Crucible: a last resort, not a use for it.
          Number(a.recipe.startsWith(PARADOX_PREFIX)) - Number(b.recipe.startsWith(PARADOX_PREFIX)) ||
          a.otherInputs.length - b.otherInputs.length ||
          data.items[b.product]!.value - data.items[a.product]!.value ||
          (a.recipe < b.recipe ? -1 : 1),
      )
      .slice(0, opts.limit ?? 5);
    return {
      item,
      perMin,
      saleValuePerMin: it.sellType ? perMin * it.value : null,
      heatPerSec: it.heatValue > 0 ? (perMin * it.heatValue * mult.fuel) / 60 : null,
      consumers,
    };
  });
}
