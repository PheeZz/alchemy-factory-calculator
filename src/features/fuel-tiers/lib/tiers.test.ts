import type { FuelVariant } from '@/features/solver';
import { groupByTier, metricValue, tierFor } from './tiers';

const v = (fuel: string, p: Partial<FuelVariant>): FuelVariant => ({
  fuel,
  recipeFor: {},
  path: [],
  heatValue: 100,
  machinesPer1k: 1,
  machinesCeilPer1k: 1,
  raw: [],
  rawValuePer1k: 1,
  fuelValuePer1k: 1,
  buildCostPer1k: [],
  heatPerRawItem: null,
  selfHeated: true,
  ...p,
});

test('lower-is-better tiers are ratios to the best positive value; zero is always S', () => {
  const best = 2;
  expect(tierFor(0, best, false)).toBe('S');
  expect(tierFor(3, best, false)).toBe('S'); // 1.5×
  expect(tierFor(3.1, best, false)).toBe('A');
  expect(tierFor(6, best, false)).toBe('A'); // 3×
  expect(tierFor(20, best, false)).toBe('B'); // 10×
  expect(tierFor(60, best, false)).toBe('C'); // 30×
  expect(tierFor(61, best, false)).toBe('D');
});

test('higher-is-better is symmetric; null has no tier', () => {
  expect(tierFor(100, 100, true)).toBe('S');
  expect(tierFor(40, 100, true)).toBe('A'); // 2.5×
  expect(tierFor(5, 100, true)).toBe('C'); // 20×
  expect(tierFor(null, 100, true)).toBeNull();
});

test('heat price is the larger of raw cost and the fuel sale value given up', () => {
  expect(metricValue(v('A', { rawValuePer1k: 10, fuelValuePer1k: 30 }), 'price')).toBe(30);
  expect(metricValue(v('A', { rawValuePer1k: 50, fuelValuePer1k: 30 }), 'price')).toBe(50);
});

test('groups are ordered S→D, sorted within by the metric, untiered (null) last', () => {
  const list = [
    v('Slow', { machinesPer1k: 40 }),
    v('Raw', { machinesPer1k: 0 }),
    v('Best', { machinesPer1k: 2 }),
    v('Mid', { machinesPer1k: 5 }),
  ];
  const groups = groupByTier(list, 'machines');
  expect(groups.map((g) => [g.tier, g.rows.map((r) => r.variant.fuel)])).toEqual([
    ['S', ['Raw', 'Best']],
    ['A', ['Mid']],
    ['C', ['Slow']], // 40 / 2 = 20×
  ]);

  const perRaw = groupByTier([v('X', { heatPerRawItem: null }), v('Y', { heatPerRawItem: 500 }), v('Z', { heatPerRawItem: 100 })], 'perRaw');
  expect(perRaw.map((g) => [g.tier, g.rows.map((r) => r.variant.fuel)])).toEqual([
    ['S', ['Y']],
    ['B', ['Z']],
    [null, ['X']],
  ]);
});
