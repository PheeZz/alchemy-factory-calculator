// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { RawImprovement, RawSkill } from './load';
import { COMMUNITY_FORMULAS } from './report';
import { upgradeTracks } from './upgrades';

// Shape of DT_UpgradePoints/DT_Improvements rows: 13 levels per track, the last one smaller
const skill = (name: string): RawSkill => ({
  Tier: 1, UnlockItem: { ConfigName: name, ConfigType: 'EBeltTDConfigType::Improvements' },
  LevelUnlockItems: [], ExtraUnlockConstructions: [], Deprecated: false,
});
const tracks = [
  ['Conveyer', 'ConveyerSpeed', 'Add', (l: number) => (l < 13 ? 15 : 3)],
  ['FactorySpeed', 'FactorySpeed', 'Increase', (l: number) => (l < 13 ? 25 : 5)],
  ['AlchemySkill', 'ExtractorSkill', 'Increase', (l: number) => (l <= 2 ? 6 : l <= 8 ? 8 : 10)],
  ['FuelEfficiency', 'FuelEfficiency', 'Increase', () => 10],
  ['FertilizeEfficiency', 'FertilizerEfficiency', 'Increase', () => 10],
] as const;
const upgradePoints: Record<string, RawSkill> = {};
const improvements: Record<string, RawImprovement> = {};
for (const [prefix, attribute, type, mod] of tracks)
  for (let l = 1; l <= 13; l++) {
    upgradePoints[`${prefix}${l}`] = skill(`${prefix}${l}`);
    improvements[`${prefix}${l}`] = {
      DisplayName: { Key: `Upgrade_Name_${prefix}` },
      Effects: [{ AttributeName: attribute, ModificationType: `EBeltTDModificationType::${type}`, ModValue: mod(l) }],
    };
  }
const attributes = {
  ConveyerSpeed: { BaseValue: 60 }, FactorySpeed: { BaseValue: 100 }, ExtractorSkill: { BaseValue: 100 },
  FuelEfficiency: { BaseValue: 100 }, FertilizerEfficiency: { BaseValue: 100 },
};

describe('upgradeTracks', () => {
  it('matches the community formulas at every level 0..13', () => {
    for (const t of upgradeTracks(upgradePoints, improvements, attributes)) {
      expect(t.maxLevel).toBe(13);
      t.values.forEach((v, l) => expect(v).toBeCloseTo(COMMUNITY_FORMULAS[t.id](l), 9));
    }
  });
  it('fails loudly when a level row is missing', () => {
    const { Conveyer5: _, ...broken } = improvements;
    expect(() => upgradeTracks(upgradePoints, broken, attributes)).toThrow(/conveyor/);
  });
});
