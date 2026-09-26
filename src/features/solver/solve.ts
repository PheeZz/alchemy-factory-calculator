import type { GameData, ItemId } from '@/shared/data/types';
import { getMultipliers } from '@/features/upgrades/multipliers';
import { buildLp, readValues, shortItem, type LpGoal, type LpValues } from './build-lp';
import { runLp, type LpRun } from './highs';
import { buildModel, type Model } from './model';
import { postprocess } from './postprocess';
import { SolverError, type FactoryPlan, type SolveResult, type UpgradeLevels } from './types';

async function hint(model: Model): Promise<ItemId | undefined> {
  const elastic = await runLp(buildLp(model, { kind: 'elastic' }));
  return elastic.status === 'Optimal' ? shortItem(model, elastic.value) : undefined;
}

/** Best effort: the unbounded import closest to the maximized item. */
function unboundedSource(model: Model): ItemId | undefined {
  const open = model.items.filter((i) => model.imports.get(i)?.max === Infinity);
  return open.sort((a, b) => (model.depth.get(a) ?? 0) - (model.depth.get(b) ?? 0))[0];
}

async function run(model: Model, goal: LpGoal): Promise<LpRun> {
  const res = await runLp(buildLp(model, goal));
  switch (res.status) {
    case 'Optimal':
      return res;
    case 'Time limit reached':
      throw new SolverError('timeout');
    case 'Infeasible':
      throw new SolverError('infeasible', await hint(model));
    case 'Unbounded':
      throw new SolverError('unbounded', unboundedSource(model) ?? model.maximize ?? undefined);
    case 'Primal infeasible or unbounded': {
      const item = await hint(model);
      if (item !== undefined) throw new SolverError('infeasible', item);
      throw new SolverError('unbounded', unboundedSource(model) ?? model.maximize ?? undefined);
    }
    default:
      throw new SolverError('internal', undefined, `LP solver status: ${res.status}`);
  }
}

async function optimize(model: Model): Promise<LpValues> {
  if (model.maximize === null) return readValues(model, (await run(model, { kind: 'cost' })).value);
  // Lexicographic: first the most output, then the cheapest way to make it. A single weighted
  // objective would let expensive chains decline to produce.
  const best = readValues(model, (await run(model, { kind: 'maximize' })).value);
  if (best.out === 0) {
    // Nothing reaches the target: ask what one unit would be missing, so the UI can say what to supply.
    const targets = new Map(model.targets).set(model.maximize, (model.targets.get(model.maximize) ?? 0) + 1);
    const item = await hint({ ...model, targets });
    throw new SolverError('infeasible', item ?? model.maximize);
  }
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
