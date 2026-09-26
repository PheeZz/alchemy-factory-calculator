import type { Recipe, TechNode } from '../../src/shared/data/types';
import { copper } from './items';
import type { RawSkill } from './load';
import type { UnlockIndex } from './unlocks';

export interface TechContext {
  unlocks: UnlockIndex;
  recipes: Recipe[];
  /** Every building id the game has (logistics and décor included: the tree unlocks them too). */
  buildingIds: string[];
  /** Nursery rows are gated by their seed, bought after a Level node. */
  nurserySeed: (recipeId: string) => string | undefined;
  /** Display key and icon of the entity a node unlocks; null for level nodes. */
  label: (skill: RawSkill) => { nameKey: string | null; icon: string | null };
}

/**
 * DT_SkillPoints → the 1.0 tech tree. Deprecated nodes are dropped and their edges bridged, so
 * `requires` always names live nodes. A recipe sits under its own node; one without (paradox,
 * boiler, deprecated coin rows) is gated by its machine's node alone.
 */
export function techTree(skills: Record<string, RawSkill>, ctx: TechContext): TechNode[] {
  const live = (id: string) => skills[id] !== undefined && !skills[id]!.Deprecated;
  const requires = (id: string, seen = new Set<string>()): string[] =>
    (skills[id]?.Predecessors ?? []).flatMap((p) => {
      if (seen.has(p)) return [];
      seen.add(p);
      return live(p) ? [p] : requires(p, seen);
    });

  const recipesOf = new Map<string, string[]>();
  const buildingsOf = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, node: string | undefined, id: string) => {
    if (node && live(node)) map.set(node, [...(map.get(node) ?? []), id]);
  };
  for (const r of ctx.recipes) {
    if (r.hidden) continue;
    push(recipesOf, ctx.unlocks.recipe(r.id), r.id);
    const seed = ctx.nurserySeed(r.id);
    if (seed) push(recipesOf, ctx.unlocks.item(seed), r.id);
  }
  for (const b of ctx.buildingIds) push(buildingsOf, ctx.unlocks.building(b), b);

  return Object.entries(skills)
    .filter(([id]) => live(id))
    .map(([id, s]) => ({
      id,
      ...ctx.label(s),
      cost: [],
      costMoney: s.UnlockCost ? copper(s.UnlockCost) : 0,
      researchPoints: s.UnlockResearchPoints ?? 0,
      requires: [...new Set(requires(id))],
      unlocks: {
        recipes: (recipesOf.get(id) ?? []).sort(),
        buildings: [...new Set(buildingsOf.get(id) ?? [])].sort(),
        items: [...s.LevelUnlockItems].sort(),
      },
      stage: s.Tier,
    }));
}
