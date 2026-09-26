import type { GameData, TechNode } from '@/shared/data/types';

/** Nodes `ids` together with every prerequisite reachable through `requires`; unknown ids are ignored. */
export function techClosure(data: GameData, ids: Iterable<string>): Set<string> {
  const byId = new Map((data.tech ?? []).map((n) => [n.id, n]));
  const out = new Set<string>();
  const stack = [...ids].filter((id) => byId.has(id));
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...byId.get(id)!.requires);
  }
  return out;
}

export interface TechGate {
  recipe(id: string): boolean;
  building(id: string): boolean;
  /** Raw items become purchasable at level nodes. */
  item(id: string): boolean;
}

const OPEN: TechGate = { recipe: () => true, building: () => true, item: () => true };

type Kind = keyof TechNode['unlocks'];

/** Which tech nodes unlock each recipe / building / item (usually one). */
export function techOwners(data: GameData): Record<Kind, Map<string, TechNode[]>> {
  const owners: Record<Kind, Map<string, TechNode[]>> = { recipes: new Map(), buildings: new Map(), items: new Map() };
  for (const n of data.tech ?? [])
    for (const kind of ['recipes', 'buildings', 'items'] as const)
      for (const id of n.unlocks[kind]) owners[kind].set(id, [...(owners[kind].get(id) ?? []), n]);
  return owners;
}

/**
 * What the player can use with `unlocked` learned. Anything no node unlocks is always available
 * (e.g. recipes gated only by their machine); null/absent `unlocked` or data without a tree → all.
 */
export function techGate(data: GameData, unlocked: string[] | null | undefined): TechGate {
  if (unlocked == null || !data.tech) return OPEN;
  const open = techClosure(data, unlocked);
  const owners = techOwners(data);
  const allowed = (kind: Kind) => (id: string) => owners[kind].get(id)?.some((n) => open.has(n.id)) ?? true;
  return { recipe: allowed('recipes'), building: allowed('buildings'), item: allowed('items') };
}
