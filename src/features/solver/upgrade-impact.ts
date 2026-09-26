import type { GameData, UpgradeTrackId } from '@/shared/data/types';
import { solve } from './solve';
import type { FactoryPlan, SolveResult, UpgradeLevels } from './types';
import { machineTotals, trySolve } from './variants';

export interface PlanSummary {
  /** Machines, heaters included: exact and as built. */
  machinesExact: number;
  machines: number;
  /** Raw items bought per minute and their cost (copper/min). */
  rawPerMin: number;
  rawMoneyPerMin: number;
  /** Fuel burned per minute, all fuels together. */
  fuelPerMin: number;
  belts: number;
}

export interface UpgradeImpact {
  track: UpgradeTrackId;
  from: number;
  to: number;
  after: PlanSummary;
  /** after − before: negative = saved. */
  delta: PlanSummary;
}

export function summarize(res: SolveResult): PlanSummary {
  const machines = machineTotals(res);
  return {
    machinesExact: machines.exact,
    machines: machines.ceil,
    rawPerMin: res.totals.raw.reduce((sum, s) => sum + s.qty, 0),
    rawMoneyPerMin: res.totals.rawMoneyPerMin,
    fuelPerMin: res.nodes.reduce((sum, n) => sum + (n.fuel?.rate ?? 0), 0),
    belts: res.edges.reduce((sum, e) => sum + e.belts, 0),
  };
}

const minus = (a: PlanSummary, b: PlanSummary): PlanSummary => ({
  machinesExact: a.machinesExact - b.machinesExact,
  machines: a.machines - b.machines,
  rawPerMin: a.rawPerMin - b.rawPerMin,
  rawMoneyPerMin: a.rawMoneyPerMin - b.rawMoneyPerMin,
  fuelPerMin: a.fuelPerMin - b.fuelPerMin,
  belts: a.belts - b.belts,
});

/**
 * What the next level of each upgrade track would change for this plan: the plan is re-solved with
 * that one track +1. Tracks already at max (or absent from the data) are skipped. Sorted by exact
 * machines saved, then built machines, belts and raw cost. The base solve's errors propagate.
 */
export async function upgradeImpact(
  data: GameData,
  plan: FactoryPlan,
  levels: UpgradeLevels,
): Promise<{ before: PlanSummary; impacts: UpgradeImpact[] }> {
  const before = summarize(await solve(data, plan, levels));
  const impacts: UpgradeImpact[] = [];
  for (const track of data.upgrades) {
    const from = levels[track.id];
    if (from >= track.maxLevel) continue;
    const res = await trySolve(data, plan, { ...levels, [track.id]: from + 1 });
    if (!res) continue;
    const after = summarize(res);
    impacts.push({ track: track.id, from, to: from + 1, after, delta: minus(after, before) });
  }
  impacts.sort(
    (a, b) =>
      a.delta.machinesExact - b.delta.machinesExact ||
      a.delta.machines - b.delta.machines ||
      a.delta.belts - b.delta.belts ||
      a.delta.rawMoneyPerMin - b.delta.rawMoneyPerMin,
  );
  return { before, impacts };
}
