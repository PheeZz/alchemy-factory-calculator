import type { BuildingId, ItemId } from '@/shared/data/types';
import type { SolveResult } from './types';
import { machineTotals } from './variants';

export interface Delta {
  a: number;
  b: number;
  /** b − a. */
  delta: number;
}

export interface PlanDiff {
  /** Built machines per building, heaters included. */
  machinesByBuilding: ({ building: BuildingId } & Delta)[];
  machines: Delta;
  machinesExact: Delta;
  raw: ({ item: ItemId } & Delta)[];
  rawMoneyPerMin: Delta;
  /** Fuel burned per minute, per fuel item. */
  fuel: ({ item: ItemId } & Delta)[];
  heatPerSec: Delta;
  belts: Delta;
  area: { floor: Delta; cells: Delta };
  buildCost: ({ item: ItemId } & Delta)[];
}

const delta = (a: number, b: number): Delta => ({ a, b, delta: b - a });

/** Side-by-side of keyed amounts; keys in a's order, then b's new ones. */
function byKey<K extends string>(key: K, a: Map<string, number>, b: Map<string, number>) {
  return [...new Set([...a.keys(), ...b.keys()])].map((id) => ({ [key]: id, ...delta(a.get(id) ?? 0, b.get(id) ?? 0) }) as { [P in K]: string } & Delta);
}

const sumBy = <T>(list: T[], id: (t: T) => string, qty: (t: T) => number) => {
  const m = new Map<string, number>();
  for (const t of list) m.set(id(t), (m.get(id(t)) ?? 0) + qty(t));
  return m;
};

/** What changes from plan a to plan b. */
export function comparePlans(a: SolveResult, b: SolveResult): PlanDiff {
  const machines = (r: SolveResult) => sumBy(r.totals.machines, (m) => m.building, (m) => m.count);
  const stacks = (list: { item: string; qty: number }[]) => sumBy(list, (s) => s.item, (s) => s.qty);
  const fuel = (r: SolveResult) =>
    sumBy(r.nodes.filter((n) => n.fuel), (n) => n.fuel!.item, (n) => n.fuel!.rate);
  const total = (r: SolveResult) => machineTotals(r);
  const belts = (r: SolveResult) => r.edges.reduce((s, e) => s + e.belts, 0);
  return {
    machinesByBuilding: byKey('building', machines(a), machines(b)),
    machines: delta(total(a).ceil, total(b).ceil),
    machinesExact: delta(total(a).exact, total(b).exact),
    raw: byKey('item', stacks(a.totals.raw), stacks(b.totals.raw)),
    rawMoneyPerMin: delta(a.totals.rawMoneyPerMin, b.totals.rawMoneyPerMin),
    fuel: byKey('item', fuel(a), fuel(b)),
    heatPerSec: delta(a.totals.heatPerSec, b.totals.heatPerSec),
    belts: delta(belts(a), belts(b)),
    area: {
      floor: delta(a.totals.area?.floor ?? 0, b.totals.area?.floor ?? 0),
      cells: delta(a.totals.area?.cells ?? 0, b.totals.area?.cells ?? 0),
    },
    buildCost: byKey('item', stacks(a.totals.buildCost), stacks(b.totals.buildCost)),
  };
}
