import type { ItemId } from '@/shared/data/types';
import type { FactoryPlan, SolveResult } from './types';

export interface FactoryRun {
  id: string;
  plan: FactoryPlan;
  result: SolveResult;
}

export interface NetworkShare {
  factory: string;
  /** Items/min. */
  rate: number;
}

export interface NetworkItem {
  item: ItemId;
  /** What each factory delivers of it: its target output plus its surplus. */
  supply: NetworkShare[];
  /** What each factory imports of it (items in its plan.imports). */
  demand: NetworkShare[];
  supplied: number;
  demanded: number;
  /** supplied − demanded: < 0 deficit, > 0 left over. */
  balance: number;
}

export interface NetworkFlow {
  from: string;
  to: string;
  item: ItemId;
  rate: number;
}

export interface FactoryNetwork {
  items: NetworkItem[];
  flows: NetworkFlow[];
}

function add(map: Map<ItemId, Map<string, number>>, item: ItemId, factory: string, rate: number) {
  if (rate <= 0) return;
  const byFactory = map.get(item) ?? new Map<string, number>();
  byFactory.set(factory, (byFactory.get(factory) ?? 0) + rate);
  map.set(item, byFactory);
}

const shares = (m: Map<string, number> | undefined): NetworkShare[] => [...(m ?? [])].map(([factory, rate]) => ({ factory, rate }));
const sum = (s: NetworkShare[]) => s.reduce((t, x) => t + x.rate, 0);

/**
 * Bookkeeping across factories, no LP: every import is matched against what other factories
 * deliver of the same item. Each supplier's output is split over the importers in proportion,
 * scaled down when the item is short, so flows never exceed either side.
 * ponytail: a factory never supplies itself (such pairs are dropped, not re-balanced)
 */
export function linkFactories(runs: FactoryRun[]): FactoryNetwork {
  const supply = new Map<ItemId, Map<string, number>>();
  const demand = new Map<ItemId, Map<string, number>>();
  for (const { id, plan, result } of runs) {
    const imported = new Set(plan.imports);
    for (const e of result.edges) {
      if (e.to === `target:${e.item}` || e.to === `surplus:${e.item}`) add(supply, e.item, id, e.perMin);
      if (e.from === `import:${e.item}` && imported.has(e.item)) add(demand, e.item, id, e.perMin);
    }
  }

  const items: NetworkItem[] = [];
  const flows: NetworkFlow[] = [];
  for (const item of [...new Set([...supply.keys(), ...demand.keys()])].sort()) {
    const s = shares(supply.get(item));
    const d = shares(demand.get(item));
    const supplied = sum(s);
    const demanded = sum(d);
    items.push({ item, supply: s, demand: d, supplied, demanded, balance: supplied - demanded });
    const scale = Math.max(supplied, demanded);
    for (const from of s)
      for (const to of d) if (from.factory !== to.factory && scale > 0) flows.push({ from: from.factory, to: to.factory, item, rate: (from.rate * to.rate) / scale });
  }
  return { items, flows };
}
