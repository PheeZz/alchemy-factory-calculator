import type { GameData } from '@/shared/data/types';
import { getMultipliers } from '@/features/upgrades/multipliers';
import { buildLp, readValues, shortItem, type LpGoal, type LpValues } from './build-lp';
import { runLp, type LpRun } from './highs';
import { buildModel, type Model } from './model';
import { postprocess } from './postprocess';
import { SolverError, type FactoryPlan, type SolveResult, type UpgradeLevels } from './types';

export { SolverError } from './types';
export { createSolverClient } from './client';

async function run(model: Model, goal: LpGoal): Promise<LpRun> {
  const res = await runLp(buildLp(model, goal));
  if (res.status === 'Optimal') return res;
  if (res.status === 'Time limit reached') throw new SolverError('timeout');
  if (res.status === 'Infeasible' || res.status === 'Primal infeasible or unbounded') {
    const elastic = await runLp(buildLp(model, { kind: 'elastic' }));
    const item = elastic.status === 'Optimal' ? shortItem(model, elastic.value) : undefined;
    if (item !== undefined || res.status === 'Infeasible') throw new SolverError('infeasible', item);
  }
  if (res.status === 'Unbounded' || res.status === 'Primal infeasible or unbounded') {
    throw new SolverError('unbounded', model.maximize ?? undefined);
  }
  throw new SolverError('infeasible', undefined, `LP solver status: ${res.status}`);
}

async function optimize(model: Model): Promise<LpValues> {
  if (model.maximize === null) return readValues(model, (await run(model, { kind: 'cost' })).value);
  // Lexicographic: first the most output, then the cheapest way to make it. A single weighted
  // objective would let expensive chains decline to produce.
  const best = readValues(model, (await run(model, { kind: 'maximize' })).value);
  return readValues(model, (await run(model, { kind: 'cost', outAtLeast: best.out * (1 - 1e-9) })).value);
}

/** Pure: runs HiGHS in the current thread (tests, worker). */
export async function solve(data: GameData, plan: FactoryPlan, levels: UpgradeLevels): Promise<SolveResult> {
  const mult = getMultipliers(data, levels);
  const model = buildModel(data, plan, mult);
  const values: LpValues =
    model.items.length === 0 ? { x: [], imp: new Map(), sur: new Map(), out: 0 } : await optimize(model);
  return postprocess(data, model, values, mult);
}
