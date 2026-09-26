import type { Building, GameData, Item, ItemId, Recipe, Stack } from '@/shared/data/types';
import type { Multipliers } from '@/features/upgrades/multipliers';
import { SolverError, type FactoryPlan } from './types';

export interface ModelRecipe {
  recipe: Recipe;
  building: Building;
  /** Machines per 1 batch/min. */
  machinesPerBatch: number;
  /** Heat per batch; speed cancels out (mechanics.json heatPerBatch). */
  heatPerBatch: number;
  inputs: Stack[];
  /** Per batch, alchemy yield already applied. */
  outputs: Stack[];
  /** Items burned / fed per batch. */
  fuel: Stack | null;
  fertilizer: Stack | null;
  /** Objective coefficient of x_r. */
  cost: number;
}

export interface ModelImport {
  max: number;
  cost: number;
}

export interface Model {
  recipes: ModelRecipe[];
  /** Balance rows, deterministic order: roots first, then as recipes reference them. */
  items: ItemId[];
  targets: Map<ItemId, number>;
  imports: Map<ItemId, ModelImport>;
  /** fromInput: the item whose output is maximized. */
  maximize: ItemId | null;
}

/** Tie-breakers, small against a weight of 1 per imported item yet above HiGHS' 1e-7 tolerances. */
export const SURPLUS_COST = 1e-4;
const RECIPE_COST = 1e-6;
const MACHINES_IMPORT_COST = 1e-3;

function importCost(item: Item, goal: FactoryPlan['optimize']): number {
  if (goal === 'money') return item.buyPrice ?? item.value;
  if (goal === 'machines') return MACHINES_IMPORT_COST;
  // ponytail: raw/hybrid weight every imported item as 1 (count of items), value-weighting is what 'money' is for
  return 1;
}

/** Main output first, then side output; non-alternates before alternates; id breaks ties. */
function producerIndex(data: GameData): Map<ItemId, Recipe[]> {
  const index = new Map<ItemId, Recipe[]>();
  for (const r of Object.values(data.recipes)) {
    if (r.special) continue;
    for (const o of r.outputs) {
      if (o.qty <= 0) continue;
      const list = index.get(o.item) ?? [];
      if (!list.includes(r)) list.push(r);
      index.set(o.item, list);
    }
  }
  const rank = (r: Recipe, item: ItemId) => (r.alternate ? 2 : 0) + (r.outputs[0]?.item === item ? 0 : 1);
  for (const [item, list] of index) {
    list.sort((a, b) => rank(a, item) - rank(b, item) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  return index;
}

/** Plans come from URLs and storage: NaN/negative/infinite rates would corrupt the LP text. */
const validRate = (rate: number) => (Number.isFinite(rate) && rate > 0 ? rate : 0);

export function buildModel(data: GameData, plan: FactoryPlan, mult: Multipliers): Model {
  const goal = plan.optimize;
  const fromInput = plan.mode === 'fromInput';
  const supplies = new Map<ItemId, number>();
  if (fromInput) for (const s of plan.supplies) supplies.set(s.item, (supplies.get(s.item) ?? 0) + validRate(s.rate));
  const imported = new Set(plan.imports);

  const importBound = (id: ItemId): number | null => {
    if (!data.items[id]) return null;
    const supplied = supplies.get(id);
    if (supplied !== undefined) return supplied;
    return data.items[id].raw || imported.has(id) ? Infinity : null;
  };

  const validItem = (id: ItemId | null | undefined, key: 'heatValue' | 'nutrientValue') =>
    id && (data.items[id]?.[key] ?? 0) > 0 ? data.items[id]! : null;

  const resolved = new Map<Recipe, ModelRecipe | null>();
  const resolve = (r: Recipe): ModelRecipe | null => {
    if (resolved.has(r)) return resolved.get(r)!;
    const chosen = plan.buildingFor[r.id];
    const building =
      (chosen && r.buildings.includes(chosen) ? data.buildings[chosen] : undefined) ??
      r.buildings.map((id) => data.buildings[id]).find((b) => b !== undefined);
    let mr: ModelRecipe | null = null;
    if (building) {
      const speed = building.speedMult * mult.speed;
      const heatPerBatch = Math.max(0, r.timeSec * (r.heatPerSec ?? building.heatCost));
      const fuel = heatPerBatch > 0 ? [plan.fuelFor[r.id], plan.fuel].map((id) => validItem(id, 'heatValue')).find(Boolean) : null;
      const fert =
        (r.nutrientPerBatch ?? 0) > 0
          ? [plan.fertilizerFor[r.id], plan.fertilizer].map((id) => validItem(id, 'nutrientValue')).find(Boolean)
          : null;
      const yieldMult = r.yieldSkill ? mult.alchemy : 1;
      const machinesPerBatch = r.timeSec / (60 * speed);
      mr = {
        recipe: r,
        building,
        machinesPerBatch,
        heatPerBatch,
        inputs: r.inputs,
        outputs: r.outputs.map((o) => ({ item: o.item, qty: o.qty * yieldMult })),
        fuel: fuel ? { item: fuel.id, qty: heatPerBatch / (fuel.heatValue * mult.fuel) } : null,
        fertilizer: fert ? { item: fert.id, qty: r.nutrientPerBatch! / (fert.nutrientValue * mult.fertilizer) } : null,
        cost: goal === 'machines' ? machinesPerBatch : RECIPE_COST,
      };
    }
    resolved.set(r, mr);
    return mr;
  };

  const producers = producerIndex(data);
  const candidates = (item: ItemId): ModelRecipe[] => {
    const all = (producers.get(item) ?? []).map(resolve).filter((m): m is ModelRecipe => m !== null);
    if (goal) return all;
    const manual = data.recipes[plan.recipeFor[item] ?? ''];
    const picked = manual && manual.outputs.some((o) => o.item === item) ? resolve(manual) : null;
    return picked ? [picked] : all.slice(0, 1);
  };

  const needs = (m: ModelRecipe) => [...m.inputs.map((s) => s.item), ...(m.fuel ? [m.fuel.item] : []), ...(m.fertilizer ? [m.fertilizer.item] : [])];

  const roots = [...plan.targets.map((t) => t.item), ...(fromInput && plan.maximize ? [plan.maximize] : [])];
  const alive = new Set<ModelRecipe>();
  const cause = new Map<ItemId, ItemId>();
  const seen = new Set<ItemId>();
  const queue = [...roots];
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i]!;
    if (seen.has(item)) continue;
    seen.add(item);
    if (importBound(item) !== null) continue;
    const list = candidates(item);
    if (list.length === 0) cause.set(item, item);
    for (const m of list) {
      if (alive.has(m)) continue;
      alive.add(m);
      queue.push(...needs(m));
    }
  }
  const recipes = [...alive];

  // Greatest fixpoint: drop recipes needing an item nobody can supply; loops (self-fuel, seeds) survive.
  const producerCount = new Map<ItemId, number>();
  const outputsOf = (m: ModelRecipe) => new Set(m.outputs.filter((o) => o.qty > 0).map((o) => o.item));
  for (const m of recipes) for (const item of outputsOf(m)) producerCount.set(item, (producerCount.get(item) ?? 0) + 1);
  const produced = (item: ItemId) => importBound(item) !== null || (producerCount.get(item) ?? 0) > 0;
  for (let changed = true; changed; ) {
    changed = false;
    for (const m of alive) {
      const missing = needs(m).find((item) => !produced(item));
      if (missing === undefined) continue;
      alive.delete(m);
      changed = true;
      for (const item of outputsOf(m)) {
        producerCount.set(item, producerCount.get(item)! - 1);
        if (!produced(item) && !cause.has(item)) cause.set(item, cause.get(missing) ?? missing);
      }
    }
  }
  for (const root of roots) {
    if (!produced(root)) throw new SolverError('unreachable', cause.get(root) ?? root);
  }

  const kept = recipes.filter((m) => alive.has(m));
  const items = [...new Set([...roots, ...kept.flatMap((m) => [...needs(m), ...m.outputs.map((o) => o.item)])])];
  const imports = new Map<ItemId, ModelImport>();
  for (const item of items) {
    const max = importBound(item);
    if (max !== null) imports.set(item, { max, cost: importCost(data.items[item]!, goal) });
  }
  const targets = new Map<ItemId, number>();
  for (const t of plan.targets) targets.set(t.item, (targets.get(t.item) ?? 0) + validRate(t.rate));

  return { recipes: kept, items, targets, imports, maximize: fromInput ? plan.maximize : null };
}
