import type { RawSkill, RawWorkbench } from './load';

export interface UnlockIndex {
  recipe(id: string): string | undefined;
  building(id: string): string | undefined;
  item(id: string): string | undefined;
  tier(skill: string): number;
}

/**
 * Deprecated skill nodes are gone from the 1.0 tree, so what they unlocked falls back to the
 * machine's unlock (e.g. CopperCoin → Processor), like every recipe that has no node of its own.
 */
export function unlockIndex(skills: Record<string, RawSkill>, workbench: Record<string, RawWorkbench>): UnlockIndex {
  const recipes = new Map<string, string>();
  const buildings = new Map<string, string>();
  const items = new Map<string, string>();
  for (const [name, s] of Object.entries(skills)) {
    if (s.Deprecated) continue;
    const type = s.UnlockItem.ConfigType.split('::')[1];
    if (type === 'CraftingRecipes') recipes.set(s.UnlockItem.ConfigName, name);
    if (type === 'ConstructOptions') buildings.set(s.UnlockItem.ConfigName, name);
    for (const b of s.ExtraUnlockConstructions) buildings.set(b, name);
    for (const i of s.LevelUnlockItems) items.set(i, name);
  }
  // 1.0 moved non-production devices to the Workbench, gated by a prerequisite skill
  for (const w of Object.values(workbench)) {
    if (w.UnlockSkillName === 'None') continue;
    for (const b of [w.UnlockBuilding, ...w.ExtraUnlockBuildings]) if (!buildings.has(b)) buildings.set(b, w.UnlockSkillName);
  }
  return {
    recipe: (id) => recipes.get(id),
    building: (id) => buildings.get(id),
    item: (id) => items.get(id),
    tier: (skill) => skills[skill]?.Tier ?? 0,
  };
}

/** The latest-tier skill among candidates: a recipe is usable only once all of them are learned. */
export function latest(index: UnlockIndex, skills: (string | undefined)[]): string | null {
  const known = skills.filter((s): s is string => s !== undefined);
  if (known.length === 0) return null;
  return known.reduce((a, b) => (index.tier(b) > index.tier(a) ? b : a));
}
