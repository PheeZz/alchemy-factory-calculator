import type { FactoryRun } from '@/features/solver';
import type { FactoryPlan, SolveResult } from '@/features/solver/types';

export interface NetworkInput {
  id: string;
  plan: FactoryPlan;
}

/**
 * Solves every factory one by one (the worker is single-threaded anyway); a factory whose plan does
 * not solve is reported and left out of the network instead of failing the whole view.
 */
export async function solveAll(
  factories: NetworkInput[],
  solve: (plan: FactoryPlan) => Promise<SolveResult>,
): Promise<{ runs: FactoryRun[]; failed: string[] }> {
  const runs: FactoryRun[] = [];
  const failed: string[] = [];
  for (const f of factories) {
    const empty = f.plan.mode === 'targets' ? !f.plan.targets.some((x) => x.rate > 0) : f.plan.maximize === null;
    if (empty) continue;
    try {
      runs.push({ id: f.id, plan: f.plan, result: await solve(f.plan) });
    } catch {
      failed.push(f.id);
    }
  }
  return { runs, failed };
}

/** Other factories that make `item` as a target: where an import "comes from". */
export const suppliersOf = (factories: { id: string; name: string; plan: FactoryPlan }[], selfId: string, item: string) =>
  factories.filter((f) => f.id !== selfId && f.plan.targets.some((t) => t.item === item && t.rate > 0));
