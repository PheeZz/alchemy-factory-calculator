import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import { demoResult } from '@/features/graph/fixtures/demo-result';
import { recipeRates } from './rates';

test('rates scale by batches/min and only yield-skill outputs get the alchemy multiplier', () => {
  const oil = demoResult.nodes.find((n) => n.recipe === 'LinseedOil')!;
  const r = recipeRates(demoGameData, demoGameData.recipes.LinseedOil!, oil, 1.5);
  expect(r.inputs).toEqual([
    { item: 'Flax', perMin: 120 },
    { item: 'Water', perMin: 60 },
  ]);
  expect(r.outputs).toEqual([{ item: 'LinseedOil', perMin: 90 }]);

  const ingot = demoResult.nodes.find((n) => n.recipe === 'IronIngot')!;
  expect(recipeRates(demoGameData, demoGameData.recipes.IronIngot!, ingot, 1.5).outputs[0]!.perMin).toBe(30);
});

test('a catalyst reshapes the listed flows: eternal drops inputs, fertile doubles outputs; the catalyst is not an input row', () => {
  const recipe = {
    ...demoGameData.recipes.IronIngot!,
    yieldSkill: false,
    catalyst: { cost: 10, unstableOutputs: [], resonantOutputs: [] },
  };
  const data = {
    ...demoGameData,
    catalysts: [
      { item: 'Eternal', charges: 100, effect: 'eternal' as const },
      { item: 'Fertile', charges: 100, effect: 'fertile' as const },
    ],
  };
  const node = { ...demoResult.nodes.find((n) => n.recipe === 'IronIngot')!, batchesPerMin: 2 };
  const eternal = recipeRates(data, recipe, { ...node, catalyst: { item: 'Eternal', rate: 0.2 } }, 1);
  expect(eternal.inputs).toEqual([]);
  const fertile = recipeRates(data, recipe, { ...node, catalyst: { item: 'Fertile', rate: 0.2 } }, 1);
  expect(fertile.inputs).toEqual(recipe.inputs.map((s) => ({ item: s.item, perMin: s.qty * 2 })));
  expect(fertile.outputs[0]!.perMin).toBe(recipe.outputs[0]!.qty * 4);
});
