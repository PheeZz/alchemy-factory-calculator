import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import { defaultFertilizer, defaultFuel } from './defaults';
import { clampLevels, sanitizePlan } from './stale';
import { emptyPlan } from './store';

test('stale preset ids: unknown items/recipes/buildings are dropped from the solve plan and reported', () => {
  const plan = {
    ...emptyPlan(),
    targets: [
      { item: 'Elixir', rate: 30 },
      { item: 'GoneItem', rate: 5 },
    ],
    recipeFor: { Charcoal: 'CharcoalFromLog', Plank: 'GoneRecipe' },
    buildingFor: { IronIngot: 'GoneBuilding' },
    imports: ['Salt', 'GoneImport'],
    fuel: 'GoneFuel',
    fuelFor: { IronIngot: 'Charcoal' },
  };
  const { plan: clean, unknown } = sanitizePlan(demoGameData, plan);

  expect(clean.targets).toEqual([{ item: 'Elixir', rate: 30 }]);
  expect(clean.recipeFor).toEqual({ Charcoal: 'CharcoalFromLog' });
  expect(clean.buildingFor).toEqual({});
  expect(clean.imports).toEqual(['Salt']);
  expect(clean.fuel).toBeNull();
  expect(clean.fuelFor).toEqual({ IronIngot: 'Charcoal' });
  expect(unknown).toEqual(['GoneBuilding', 'GoneFuel', 'GoneImport', 'GoneItem', 'GoneRecipe']);
  // The stored plan is not mutated: ids come back if a later build restores them.
  expect(plan.targets).toHaveLength(2);
});

test('levels are clamped to the track length of the loaded build', () => {
  const levels = { conveyor: 99, factorySpeed: -3, alchemySkill: 2, fuelEfficiency: 0, fertilizerEfficiency: 10 };
  expect(clampLevels(demoGameData, levels)).toEqual({
    conveyor: 20,
    factorySpeed: 0,
    alchemySkill: 2,
    fuelEfficiency: 0,
    fertilizerEfficiency: 10,
  });
});

test('default fuel is the obtainable solid fuel with the lowest value per heat', () => {
  // value/heat: Charcoal 12/120 = 0.1 < Log 5/40 = 0.125 < Plank 3/20 = 0.15.
  expect(defaultFuel(demoGameData)).toBe('Charcoal');
  expect(defaultFertilizer(demoGameData)).toBeNull();
});
