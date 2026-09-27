import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
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


test('prototype keys are not mistaken for known ids', () => {
  const plan = {
    ...emptyPlan(),
    targets: [
      { item: 'constructor', rate: 1 },
      { item: '__proto__', rate: 1 },
      { item: 'hasOwnProperty', rate: 1 },
    ],
    recipeFor: { toString: 'valueOf' },
  };
  const { plan: clean, unknown } = sanitizePlan(demoGameData, plan);
  expect(clean.targets).toEqual([]);
  expect(clean.recipeFor).toEqual({});
  expect(unknown).toEqual(['__proto__', 'constructor', 'hasOwnProperty', 'toString'].sort());
});

test('heater choices: unknown heater buildings and heaterFor entries are dropped like fuelFor', () => {
  const plan = {
    ...emptyPlan(),
    heater: 'GoneHeater',
    heaterFor: { IronIngot: 'Kiln', GoneRecipe: 'Kiln', Elixir: 'GoneHeater' },
  };
  const { plan: clean, unknown } = sanitizePlan(demoGameData, plan);
  expect(clean.heater).toBeNull();
  expect(clean.heaterFor).toEqual({ IronIngot: 'Kiln' });
  expect(unknown).toEqual(['GoneHeater', 'GoneRecipe']);
});

test('catalyst picks, machine caps and learned tech drop ids the build does not know', async () => {
  const { sanitizeUnlocked } = await import('./stale');
  const plan = {
    ...emptyPlan(),
    catalystFor: { IronIngot: 'Gone', GoneRecipe: 'Salt', Elixir: 'Salt' },
    machineCaps: { IronIngot: 3, GoneRecipe: 1 },
  };
  const { plan: clean } = sanitizePlan(demoGameData, plan);
  expect(clean.catalystFor).toEqual({ Elixir: 'Salt' });
  expect(clean.machineCaps).toEqual({ IronIngot: 3 });

  const data = { ...demoGameData, tech: [{ id: 'Level1', nameKey: null, icon: null, cost: [], costMoney: 0, researchPoints: 0, requires: [], unlocks: { recipes: [], buildings: [], items: [] }, stage: 0 }] };
  expect(sanitizeUnlocked(data, ['Level1', 'Gone'])).toEqual(['Level1']);
  expect(sanitizeUnlocked(data, null)).toBeNull();
  expect(sanitizeUnlocked(demoGameData, ['Level1'])).toBeNull();
});
