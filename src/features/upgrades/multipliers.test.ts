import { describe, expect, it } from 'vitest';
import { gameData, level0, levels } from '@/features/solver/fixtures/builders';
import { getMultipliers } from './multipliers';

const data = gameData([], [], []);

describe('getMultipliers', () => {
  it('level 0 is neutral', () => {
    expect(getMultipliers(data, level0)).toEqual({ beltSpeed: 60, speed: 1, alchemy: 1, fuel: 1, fertilizer: 1 });
  });

  it('reads values at the given level', () => {
    const m = getMultipliers(data, {
      conveyor: 6, // 60 + 15·6
      factorySpeed: 6, // 1 + 0.25·6
      alchemySkill: 2, // 1 + (6 + 6)/100
      fuelEfficiency: 5, // 1 + 0.1·5
      fertilizerEfficiency: 3, // 1 + 0.1·3
    });
    expect(m.beltSpeed).toBe(150);
    expect(m.speed).toBe(2.5);
    expect(m.alchemy).toBeCloseTo(1.12, 12);
    expect(m.fuel).toBeCloseTo(1.5, 12);
    expect(m.fertilizer).toBeCloseTo(1.3, 12);
  });

  it('clamps levels to 0..maxLevel', () => {
    // maxLevel 20: 60 + 15·12 + 3·8 = 264
    expect(getMultipliers(data, levels({ conveyor: 99 })).beltSpeed).toBe(264);
    expect(getMultipliers(data, levels({ factorySpeed: -3 })).speed).toBe(1);
    expect(getMultipliers(data, levels({ factorySpeed: Number.NaN })).speed).toBe(1);
  });

  it('missing tracks fall back to neutral values', () => {
    const bare = { ...data, upgrades: [], constants: { baseBeltSpeed: 75 } };
    expect(getMultipliers(bare, levels({ conveyor: 5, factorySpeed: 5 }))).toEqual({
      beltSpeed: 75,
      speed: 1,
      alchemy: 1,
      fuel: 1,
      fertilizer: 1,
    });
  });
});
