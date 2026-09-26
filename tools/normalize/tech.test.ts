// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Recipe } from '../../src/shared/data/types';
import type { RawSkill } from './load';
import { techTree } from './tech';
import { unlockIndex } from './unlocks';

const skill = (Tier: number, type: string, ConfigName: string, extra: Partial<RawSkill> = {}): RawSkill => ({
  Tier,
  UnlockItem: { ConfigName, ConfigType: `EBeltTDConfigType::${type}` },
  LevelUnlockItems: [],
  ExtraUnlockConstructions: [],
  Deprecated: false,
  Predecessors: [],
  UnlockCost: { X: 0, Y: 0, Z: 100 },
  UnlockResearchPoints: 30,
  ...extra,
});

describe('techTree', () => {
  const skills: Record<string, RawSkill> = {
    Level1: skill(0, 'Ingredients', 'None', { LevelUnlockItems: ['Wood'] }),
    TableSaw: skill(0, 'ConstructOptions', 'TableSaw', { Predecessors: ['Level1'] }),
    Old: skill(1, 'ConstructOptions', 'OldThing', { Predecessors: ['TableSaw'], Deprecated: true }),
    Gear: skill(1, 'CraftingRecipes', 'WoodGear', { Predecessors: ['Old'], UnlockCost: { X: 0, Y: 12, Z: 5 }, UnlockResearchPoints: 57 }),
  };
  const recipe = (id: string) => ({ id, hidden: false }) as Recipe;
  const nodes = techTree(skills, {
    unlocks: unlockIndex(skills, {}),
    recipes: [recipe('WoodGear'), recipe('Plank'), recipe('Nursery_Wood')],
    buildingIds: ['TableSaw', 'OldThing'],
    nurserySeed: (id) => (id.startsWith('Nursery_') ? id.slice(8) : undefined),
    label: (s) => ({ nameKey: s.UnlockItem.ConfigName === 'None' ? null : `N_${s.UnlockItem.ConfigName}`, icon: null }),
  });
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  it('drops deprecated nodes and bridges their edges', () => {
    expect(nodes.map((n) => n.id)).toEqual(['Level1', 'TableSaw', 'Gear']);
    expect(byId.Gear!.requires).toEqual(['TableSaw']);
  });
  it('costs: money vector in copper (12 silver + 5 copper) and research points', () => {
    expect(byId.Gear).toMatchObject({ costMoney: 12005, researchPoints: 57, stage: 1, nameKey: 'N_WoodGear' });
  });
  it('unlock lists: own recipe, building, level items; nursery rows under their seed node', () => {
    expect(byId.Gear!.unlocks.recipes).toEqual(['WoodGear']);
    expect(byId.TableSaw!.unlocks.buildings).toEqual(['TableSaw']);
    expect(byId.Level1!.unlocks).toEqual({ recipes: ['Nursery_Wood'], buildings: [], items: ['Wood'] });
    // Plank has no node of its own: gated by its machine only.
    expect(nodes.flatMap((n) => n.unlocks.recipes)).not.toContain('Plank');
  });
});
