// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { RawSkill } from './load';
import { latest, unlockIndex } from './unlocks';

const skill = (Tier: number, type: string, ConfigName: string, extra: Partial<RawSkill> = {}): RawSkill => ({
  Tier, UnlockItem: { ConfigName, ConfigType: `EBeltTDConfigType::${type}` },
  LevelUnlockItems: [], ExtraUnlockConstructions: [], Deprecated: false, ...extra,
});

describe('unlockIndex', () => {
  const index = unlockIndex(
    {
      Processor: skill(2, 'ConstructOptions', 'Processor'),
      CopperCoin: skill(6, 'CraftingRecipes', 'CopperCoin', { Deprecated: true }),
      SteelGear: skill(5, 'CraftingRecipes', 'SteelGear'),
      Level8: skill(8, 'Ingredients', 'None', { LevelUnlockItems: ['GentianSeed'] }),
      AutoNursery: skill(4, 'ConstructOptions', 'AutoNursery'),
    },
    { EnhancedGrinder: { UnlockSkillName: 'SteelGear', UnlockBuilding: 'EnhancedGrinder', ExtraUnlockBuildings: [] } },
  );
  it('ignores deprecated nodes so the recipe falls back to its machine', () => {
    expect(index.recipe('CopperCoin')).toBeUndefined();
    expect(index.building('Processor')).toBe('Processor');
  });
  it('workbench buildings are gated by their prerequisite skill', () => {
    expect(index.building('EnhancedGrinder')).toBe('SteelGear');
  });
  it('latest picks the highest tier', () => {
    expect(latest(index, [index.building('AutoNursery'), index.item('GentianSeed')])).toBe('Level8');
    expect(latest(index, [undefined])).toBeNull();
  });
});
