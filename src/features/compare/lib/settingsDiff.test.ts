import { emptyPlan } from '@/features/factory/store';
import type { FactoryPlan } from '@/features/solver/types';
import { settingsDiff } from './settingsDiff';

const plan = (p: Partial<FactoryPlan>): FactoryPlan => ({ ...emptyPlan(), ...p });

test('identical plans have no differences; absent and null heater are the same default', () => {
  const a = plan({ targets: [{ item: 'IronIngot', rate: 60 }], fuel: 'Coal' });
  const { heater: _, ...noHeater } = a;
  expect(settingsDiff(a, structuredClone(a))).toEqual([]);
  expect(settingsDiff(a, noHeater as FactoryPlan)).toEqual([]);
});

test('lists target rates, fuel, per-recipe choices, imports and tech count that differ', () => {
  const a = plan({
    targets: [{ item: 'IronIngot', rate: 60 }],
    fuel: 'Coal',
    recipeFor: { IronIngot: 'R1' },
    machineCaps: { R1: 4 },
    imports: ['Coal'],
    unlocked: ['t1'],
  });
  const b = plan({
    targets: [
      { item: 'IronIngot', rate: 30 },
      { item: 'IronIngot', rate: 60 },
      { item: 'Plank', rate: 10 },
    ],
    fuel: 'Charcoal',
    heater: 'Stove',
    recipeFor: { IronIngot: 'R1' },
    catalystFor: { R1: 'Salt' },
    imports: ['Coal', 'Ore'],
    unlocked: null,
  });
  expect(settingsDiff(a, b)).toEqual([
    { kind: 'target', item: 'IronIngot', a: 60, b: 90 },
    { kind: 'target', item: 'Plank', a: null, b: 10 },
    { kind: 'fuel', a: 'Coal', b: 'Charcoal' },
    { kind: 'heater', a: null, b: 'Stove' },
    { kind: 'catalystFor', key: 'R1', a: null, b: 'Salt' },
    { kind: 'machineCaps', key: 'R1', a: 4, b: null },
    { kind: 'import', item: 'Ore', a: false, b: true },
    { kind: 'unlocked', a: 1, b: null },
  ]);
});

test('supplies and the maximized item count only when a plan runs from input', () => {
  const a = plan({ supplies: [{ item: 'Ore', rate: 5 }], maximize: 'IronIngot' });
  const b = plan({ supplies: [], maximize: null });
  expect(settingsDiff(a, b)).toEqual([]);
  expect(settingsDiff({ ...a, mode: 'fromInput' }, b)).toEqual([
    { kind: 'mode', a: 'fromInput', b: 'targets' },
    { kind: 'supply', item: 'Ore', a: 5, b: null },
    { kind: 'maximize', a: 'IronIngot', b: null },
  ]);
});
