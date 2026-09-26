import type { GameData, UpgradeTrackId } from '@/shared/data/types';
import type { UpgradeLevels } from '@/features/solver/types';

export interface Multipliers {
  /** Items/min per belt. */
  beltSpeed: number;
  speed: number;
  alchemy: number;
  fuel: number;
  fertilizer: number;
}

function trackValue(data: GameData, id: UpgradeTrackId, level: number, neutral: number): number {
  const track = data.upgrades.find((t) => t.id === id);
  if (!track) return neutral;
  const clamped = Number.isFinite(level) ? Math.min(Math.max(Math.trunc(level), 0), track.maxLevel) : 0;
  return track.values[clamped] ?? neutral;
}

export function getMultipliers(data: GameData, levels: UpgradeLevels): Multipliers {
  return {
    beltSpeed: trackValue(data, 'conveyor', levels.conveyor, data.constants.baseBeltSpeed),
    speed: trackValue(data, 'factorySpeed', levels.factorySpeed, 1),
    alchemy: trackValue(data, 'alchemySkill', levels.alchemySkill, 1),
    fuel: trackValue(data, 'fuelEfficiency', levels.fuelEfficiency, 1),
    fertilizer: trackValue(data, 'fertilizerEfficiency', levels.fertilizerEfficiency, 1),
  };
}
