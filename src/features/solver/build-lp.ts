import type { ItemId } from '@/shared/data/types';
import { SURPLUS_COST, type Model } from './model';

/**
 * - `cost`: minimize import/surplus/recipe costs (optionally with output ≥ `outAtLeast`).
 * - `maximize`: maximize output of `model.maximize` only (phase 1 of fromInput).
 * - `elastic`: every balance row gets a shortage variable; minimizing them names the item
 *   an infeasible model lacks. Shortage is cheaper the further upstream the item is, and
 *   prohibitive on roots, so the hint lands on the cause rather than the target.
 */
export type LpGoal = { kind: 'cost'; outAtLeast?: number } | { kind: 'maximize' } | { kind: 'elastic' };

// Indexed column names: item/recipe ids may contain characters the LP format rejects.
export const col = {
  x: (r: number) => `x${r}`,
  imp: (k: number) => `i${k}`,
  sur: (k: number) => `s${k}`,
  short: (k: number) => `e${k}`,
  out: 'o',
};

type Term = [coef: number, name: string];

const expr = (terms: Term[]) =>
  terms
    .filter(([c]) => c !== 0)
    .map(([c, name]) => `${c < 0 ? '-' : '+'} ${Math.abs(c)} ${name}`)
    .join(' ');

const ROOT_SHORTAGE_COST = 1e4;

function shortageCost(model: Model, item: ItemId): number {
  if (model.targets.has(item) || item === model.maximize) return ROOT_SHORTAGE_COST;
  // ponytail: per-unit weights ignore quantity scale (1 Log = 200 Plank), so a big fan-out can
  // still pull the hint one step downstream; a structural walk over the short set would fix it
  return Math.max(0.5 ** (model.depth.get(item) ?? 0), 1e-4);
}

export function buildLp(model: Model, goal: LpGoal): string {
  const index = new Map(model.items.map((item, k) => [item, k]));
  const rows: Term[][] = model.items.map(() => []);

  model.recipes.forEach((m, r) => {
    const net = new Map<ItemId, number>();
    const add = (item: ItemId, qty: number) => net.set(item, (net.get(item) ?? 0) + qty);
    for (const o of m.outputs) add(o.item, o.qty);
    for (const s of m.inputs) add(s.item, -s.qty);
    if (m.fuel) add(m.fuel.item, -m.fuel.qty);
    if (m.fertilizer) add(m.fertilizer.item, -m.fertilizer.qty);
    for (const [item, c] of net) rows[index.get(item)!]!.push([c, col.x(r)]);
  });

  const objective: Term[] = [];
  const bounds: string[] = [];
  const withOut = model.maximize !== null;
  model.items.forEach((item, k) => {
    const imp = model.imports.get(item);
    if (imp) {
      rows[k]!.push([1, col.imp(k)]);
      if (imp.max !== Infinity) bounds.push(` ${col.imp(k)} <= ${imp.max}`);
      if (goal.kind === 'cost') objective.push([imp.cost, col.imp(k)]);
    }
    rows[k]!.push([-1, col.sur(k)]);
    if (goal.kind === 'cost') objective.push([SURPLUS_COST, col.sur(k)]);
    if (withOut && item === model.maximize) rows[k]!.push([-1, col.out]);
    if (goal.kind === 'elastic') {
      rows[k]!.push([1, col.short(k)]);
      objective.push([shortageCost(model, item), col.short(k)]);
    }
  });
  if (goal.kind === 'cost') model.recipes.forEach((m, r) => objective.push([m.cost, col.x(r)]));
  model.recipes.forEach((m, r) => {
    if (m.maxBatches !== null) bounds.push(` ${col.x(r)} <= ${m.maxBatches}`);
  });
  if (goal.kind === 'maximize') objective.push([1, col.out]);

  const constraints = rows.map((terms, k) => ` b${k}: ${expr(terms)} = ${model.targets.get(model.items[k]!) ?? 0}`);
  if (goal.kind === 'cost' && goal.outAtLeast !== undefined && withOut) {
    constraints.push(` lo: + 1 ${col.out} >= ${goal.outAtLeast}`);
  }
  // An empty objective line is a parse error; 0·surplus keeps it well-formed.
  const obj = expr(objective) || `+ 0 ${col.sur(0)}`;
  return [
    goal.kind === 'maximize' ? 'Maximize' : 'Minimize',
    ` obj: ${obj}`,
    'Subject To',
    ...constraints,
    ...(bounds.length ? ['Bounds', ...bounds] : []),
    'End',
  ].join('\n');
}

export interface LpValues {
  /** Batches/min per model.recipes index. */
  x: number[];
  imp: Map<ItemId, number>;
  sur: Map<ItemId, number>;
  out: number;
}

/** |v| < 1e-9 → 0: solver noise must not create phantom nodes or edges. */
export const clean = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);

export function readValues(model: Model, value: (name: string) => number): LpValues {
  const imp = new Map<ItemId, number>();
  const sur = new Map<ItemId, number>();
  model.items.forEach((item, k) => {
    const i = clean(value(col.imp(k)));
    const s = clean(value(col.sur(k)));
    if (i > 0) imp.set(item, i);
    if (s > 0) sur.set(item, s);
  });
  return {
    x: model.recipes.map((_, r) => Math.max(0, clean(value(col.x(r))))),
    imp,
    sur,
    out: model.maximize !== null ? Math.max(0, clean(value(col.out))) : 0,
  };
}

/**
 * Furthest-upstream short item of an elastic solve, or undefined when nothing is short. When the
 * short item's chain bottoms out in an item with neither producer nor source (an unsupplied raw
 * item in fromInput), that item is the actionable answer.
 */
export function shortItem(model: Model, value: (name: string) => number): ItemId | undefined {
  let best: ItemId | undefined;
  let bestDepth = -1;
  model.items.forEach((item, k) => {
    const d = model.depth.get(item) ?? 0;
    if (value(col.short(k)) > 1e-7 && d > bestDepth) [best, bestDepth] = [item, d];
  });
  return best === undefined ? undefined : deadSource(model, best) ?? best;
}

function deadSource(model: Model, from: ItemId): ItemId | undefined {
  const producers = (item: ItemId) => model.recipes.filter((m) => m.outputs.some((o) => o.item === item && o.qty > 0));
  const seen = new Set([from]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    for (const m of producers(queue[i]!)) {
      for (const need of [...m.inputs.map((s) => s.item), m.fuel?.item, m.fertilizer?.item]) {
        if (need === undefined || seen.has(need)) continue;
        seen.add(need);
        if (!model.imports.has(need) && producers(need).length === 0) return need;
        queue.push(need);
      }
    }
  }
  return undefined;
}
