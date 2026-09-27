import type { GameData, TechNode } from '@/shared/data/types';
import { techClosure } from '@/features/solver';
import { techOwners } from '@/features/solver/tech';

/** Nodes per tier (0–9): level nodes first, then by id for a stable layout. */
export function techStages(data: GameData): TechNode[][] {
  const stages: TechNode[][] = [];
  for (const n of data.tech ?? []) (stages[n.stage] ??= []).push(n);
  for (const s of stages) s?.sort((a, b) => Number(b.nameKey === null) - Number(a.nameKey === null) || a.id.localeCompare(b.id));
  return stages.map((s) => s ?? []);
}

/** Learned set as the solver sees it: prerequisites implied; null = everything open. */
export const openSet = (data: GameData, unlocked: string[] | null) =>
  unlocked === null ? null : techClosure(data, unlocked);

/** Learning a node also learns everything it requires. Already all-open stays all-open. */
export function learn(data: GameData, unlocked: string[] | null, ids: string[]): string[] | null {
  if (unlocked === null) return null;
  return [...techClosure(data, [...unlocked, ...ids])].sort();
}

/** Unlearning a node also unlearns every node that (transitively) requires it. */
export function unlearn(data: GameData, unlocked: string[] | null, id: string): string[] {
  const tech = data.tech ?? [];
  const base = unlocked === null ? tech.map((n) => n.id) : [...techClosure(data, unlocked)];
  return base.filter((n) => n !== id && !techClosure(data, [n]).has(id)).sort();
}

export function techCost(data: GameData, ids: Iterable<string>) {
  const byId = new Map((data.tech ?? []).map((n) => [n.id, n]));
  let money = 0;
  let rp = 0;
  for (const id of ids) {
    const n = byId.get(id);
    if (!n) continue;
    money += n.costMoney;
    rp += n.researchPoints;
  }
  return { money, rp };
}

/**
 * For greyed-out pickers: the cheapest (lowest tier) node that would unlock a recipe or building,
 * or null when it is already usable (or nothing gates it).
 */
export function lockedBy(data: GameData, unlocked: string[] | null) {
  const open = openSet(data, unlocked);
  const owners = techOwners(data);
  const pick = (kind: 'recipes' | 'buildings', id: string): TechNode | null => {
    if (!open) return null;
    const nodes = owners[kind].get(id);
    if (!nodes || nodes.some((n) => open.has(n.id))) return null;
    return [...nodes].sort((a, b) => a.stage - b.stage || a.id.localeCompare(b.id))[0]!;
  };
  return { recipe: (id: string) => pick('recipes', id), building: (id: string) => pick('buildings', id) };
}
