import type { UpgradeTrack, UpgradeTrackId } from '../../src/shared/data/types';
import type { RawAttribute, RawImprovement, RawSkill } from './load';

// track → DT_UpgradePoints row prefix, attribute it modifies, whether values are absolute (belt/min)
const TRACKS: [UpgradeTrackId, string, string, boolean][] = [
  ['conveyor', 'Conveyer', 'ConveyerSpeed', true],
  ['factorySpeed', 'FactorySpeed', 'FactorySpeed', false],
  ['alchemySkill', 'AlchemySkill', 'ExtractorSkill', false],
  ['fuelEfficiency', 'FuelEfficiency', 'FuelEfficiency', false],
  ['fertilizerEfficiency', 'FertilizeEfficiency', 'FertilizerEfficiency', false],
];

/**
 * Attribute at a level = (Base + ΣAdd) × (1 + ΣIncrease/100). Values are cumulative over levels
 * 0..max; non-absolute tracks are reported as a multiplier of the base value.
 */
export function upgradeTracks(
  upgradePoints: Record<string, RawSkill>,
  improvements: Record<string, RawImprovement>,
  attributes: Record<string, RawAttribute>,
): UpgradeTrack[] {
  return TRACKS.map(([id, prefix, attribute, absolute]) => {
    const levels = Object.keys(upgradePoints)
      .filter((k) => new RegExp(`^${prefix}\\d+$`).test(k) && !upgradePoints[k]!.Deprecated)
      .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)))
      .map((k) => improvements[upgradePoints[k]!.UnlockItem.ConfigName]);
    const base = attributes[attribute]?.BaseValue;
    if (base === undefined || levels.length === 0 || levels.some((l) => !l)) throw new Error(`upgrade track ${id}: missing game data`);
    let add = 0;
    let increase = 0;
    const values = [absolute ? base : 1];
    for (const level of levels as RawImprovement[]) {
      for (const e of level.Effects.filter((e) => e.AttributeName === attribute)) {
        if (e.ModificationType.endsWith('::Add')) add += e.ModValue;
        else if (e.ModificationType.endsWith('::Increase')) increase += e.ModValue;
        else throw new Error(`upgrade track ${id}: unknown modification ${e.ModificationType}`);
      }
      const value = (base + add) * (1 + increase / 100);
      values.push(absolute ? value : value / base);
    }
    return { id, nameKey: levels[0]!.DisplayName.Key ?? id, maxLevel: levels.length, values };
  });
}
