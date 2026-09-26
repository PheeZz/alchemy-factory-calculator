import type { GameData, ItemId } from '@/shared/data/types';
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

/** Heat/s each candidate is solved for; big enough that tiny chains don't round to noise. */
const PROBE_HEAT = 1000;

/**
 * Ranks solid fuels by what it costs to deliver heat with them: each candidate is solved for
 * PROBE_HEAT heat/s of itself while its own chain burns the same fuel (hybrid recipes, so the
 * numbers match what the planner would build). Sorted by machines, then raw input, then id.
 * `fertilizer` feeds any nurseries in a fuel's chain; without one they run unfertilized.
 */
export async function rankFuels(data: GameData, levels: UpgradeLevels, fertilizer: ItemId | null = null): Promise<FuelRank[]> {
  const fuelMult = getMultipliers(data, levels).fuel;
  const producible = new Set(
    Object.values(data.recipes)
      .filter((r) => !r.special && !r.hidden)
      .flatMap((r) => r.outputs.map((o) => o.item)),
  );
  const candidates = Object.values(data.items).filter((i) => i.heatValue > 0 && !i.liquid && (i.raw || producible.has(i.id)));

  const ranks: FuelRank[] = [];
  for (const fuel of candidates) {
    const rate = (PROBE_HEAT * 60) / (fuel.heatValue * fuelMult);
    try {
      const res = await solve(
        data,
        {
          targets: [{ item: fuel.id, rate }],
          mode: 'targets',
          supplies: [],
          maximize: null,
          recipeFor: {},
          buildingFor: {},
          imports: [],
          fuel: fuel.id,
          fuelFor: {},
          fertilizer,
          fertilizerFor: {},
          optimize: null,
        },
        levels,
      );
      const machines = res.nodes.reduce((sum, n) => sum + n.machinesExact, 0);
      const raw = res.totals.raw.reduce((sum, s) => sum + s.qty, 0);
      ranks.push({ item: fuel.id, machinesPerHeat: machines / PROBE_HEAT, rawPerHeat: raw / PROBE_HEAT });
    } catch (e) {
      // A fuel whose chain cannot be solved (e.g. a closed loop) is simply not a candidate.
      if (!(e instanceof SolverError) || e.code === 'internal') throw e;
    }
  }
  return ranks.sort(
    (a, b) => a.machinesPerHeat - b.machinesPerHeat || a.rawPerHeat - b.rawPerHeat || (a.item < b.item ? -1 : 1),
  );
}

/** Default fuel for a factory: the best-ranked fuel that has to be made (raw fuels rank first on
 * zero machines but are the costlier heat per ore); falls back to the best raw one. */
export function defaultFuel(ranks: FuelRank[], data: GameData): ItemId | null {
  return (ranks.find((r) => !data.items[r.item]?.raw) ?? ranks[0])?.item ?? null;
}
