import type { GameData, ItemId } from '@/shared/data/types';
import { getMultipliers } from '@/features/upgrades/multipliers';
import { buildLp, readValues, shortItem, type LpGoal, type LpValues } from './build-lp';
import { runLp, type LpRun } from './highs';
import { buildModel, type Model } from './model';
import { techClosure, techOwners } from './tech';
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
  let model: Model;
  try {
    model = buildModel(data, plan, mult);
  } catch (e) {
    // Blocked by the tech tree: say what to learn, not just which item is missing.
    if (e instanceof SolverError && e.code === 'unreachable' && plan.unlocked != null) {
      const techs = await requiredTechFor(data, plan);
      if (techs.length) throw new SolverError('unreachable', e.item, `${e.message} — learn: ${techs.join(', ')}`, techs);
    }
    throw e;
  }
  const values: LpValues =
    model.items.length === 0 ? { x: [], imp: new Map(), sur: new Map(), out: 0 } : await optimize(model);
  return postprocess(data, model, values, mult);
}

const NO_UPGRADES: UpgradeLevels = { conveyor: 0, factorySpeed: 0, alchemySkill: 0, fuelEfficiency: 0, fertilizerEfficiency: 0 };

/**
 * Tech nodes to learn so the plan works as the planner would build it with everything open:
 * the owners of the recipes, machines, heaters and bought raw items of that solution, plus their
 * prerequisites, minus what `plan.unlocked` already covers. Stage, then id order.
 * ponytail: minimal for the default recipe path, not across all alternatives (that is a set-cover search)
 */
export async function requiredTechFor(data: GameData, plan: FactoryPlan): Promise<string[]> {
  if (!data.tech) return [];
  const open = techClosure(data, plan.unlocked ?? []);
  let res: SolveResult;
  try {
    res = await solve(data, { ...plan, unlocked: null }, NO_UPGRADES);
  } catch (e) {
    if (e instanceof SolverError && e.code !== 'internal') return [];
    throw e;
  }
  const owners = techOwners(data);
  const need = new Set<string>();
  const require = (kind: 'recipes' | 'buildings' | 'items', id: string) => {
    const nodes = owners[kind].get(id);
    if (!nodes || nodes.some((n) => open.has(n.id))) return;
    need.add([...nodes].sort((a, b) => a.stage - b.stage || (a.id < b.id ? -1 : 1))[0]!.id);
  };
  for (const n of res.nodes) {
    require('recipes', n.recipe);
    require('buildings', n.building);
    if (n.heater) require('buildings', n.heater.building);
  }
  for (const s of res.totals.raw) require('items', s.item);
  const stage = new Map(data.tech.map((n) => [n.id, n.stage]));
  return [...techClosure(data, need)]
    .filter((id) => !open.has(id))
    .sort((a, b) => stage.get(a)! - stage.get(b)! || (a < b ? -1 : 1));
}
